/**
 * HTTP Proxy Server for Claude API via Cloudflare AI Gateway
 *
 * Intercepts Claude CLI requests and forwards them directly to Cloudflare AI Gateway,
 * which routes to AWS Bedrock or Anthropic API based on availability.
 *
 * This enables:
 * - Direct routing through AI Gateway (no intermediate worker hop)
 * - Centralized monitoring and observability via Cloudflare AI Gateway
 * - Intelligent failover: Bedrock first (uses $100k credits), then Anthropic
 * - Zero-delay failover on ANY Bedrock error (429, 430, 500, 403, etc.)
 *
 * REQUIREMENTS:
 * - AWS_BEARER_TOKEN_BEDROCK must be set (for Bedrock access)
 * - ANTHROPIC_API_KEY must be set (for failover)
 */

const PROXY_PORT = 18765; // Local proxy port chosen to avoid common conflicts
const AI_GATEWAY_ACCOUNT = process.env.AI_GATEWAY_ACCOUNT || 'b6641681fe423910342b9ffa1364c76d';
const AI_GATEWAY_ID = process.env.AI_GATEWAY_ID || 'claude-gateway';
const AI_GATEWAY_BASE = `https://gateway.ai.cloudflare.com/v1/${AI_GATEWAY_ACCOUNT}/${AI_GATEWAY_ID}`;

interface ProxyStats {
  requests: number;
  successes: number;
  failures: number;
  bedrockSuccesses: number;
  anthropicFailovers: number;
  lastError?: string;
}

const stats: ProxyStats = {
  requests: 0,
  successes: 0,
  failures: 0,
  bedrockSuccesses: 0,
  anthropicFailovers: 0,
};

/**
 * Validate required credentials are present
 * Throws error if either is missing
 */
function validateCredentials(): void {
  const bedrockToken = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

  const missing: string[] = [];
  if (!bedrockToken) missing.push('AWS_BEARER_TOKEN_BEDROCK');
  if (!anthropicKey) missing.push('ANTHROPIC_API_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Missing required credentials: ${missing.join(', ')}\n` +
      'Both AWS_BEARER_TOKEN_BEDROCK and ANTHROPIC_API_KEY must be set as GitHub org secrets.'
    );
  }
}

/**
 * Forward request to AWS Bedrock via AI Gateway
 */
async function forwardToBedrock(body: string, headers: Headers): Promise<Response> {
  const bedrockToken = process.env.AWS_BEARER_TOKEN_BEDROCK!; // Validated at startup

  // AI Gateway URL for Bedrock
  const bedrockUrl = `${AI_GATEWAY_BASE}/aws-bedrock/bedrock-runtime.us-east-1.amazonaws.com/model/us.anthropic.claude-sonnet-4-5-v1:0/invoke`;

  const bedrockHeaders = new Headers({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${bedrockToken}`,
    'anthropic-version': headers.get('anthropic-version') || '2023-06-01',
  });

  console.log('🔵 Attempting Bedrock via AI Gateway...');

  const response = await fetch(bedrockUrl, {
    method: 'POST',
    headers: bedrockHeaders,
    body
  });

  if (response.ok) {
    console.log('✅ Bedrock request succeeded via AI Gateway');
  } else {
    console.warn(`⚠️  Bedrock returned ${response.status}`);
  }

  return response;
}

/**
 * Forward request to Anthropic via AI Gateway
 */
async function forwardToAnthropic(body: string, headers: Headers): Promise<Response> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY!; // Validated at startup

  // AI Gateway URL for Anthropic
  const anthropicUrl = `${AI_GATEWAY_BASE}/anthropic/v1/messages`;

  const anthropicHeaders = new Headers({
    'Content-Type': 'application/json',
    'x-api-key': anthropicKey,
    'anthropic-version': headers.get('anthropic-version') || '2023-06-01',
  });

  console.log('🟢 Attempting Anthropic via AI Gateway...');

  const response = await fetch(anthropicUrl, {
    method: 'POST',
    headers: anthropicHeaders,
    body
  });

  if (response.ok) {
    console.log('✅ Anthropic request succeeded via AI Gateway');
  } else {
    console.error(`❌ Anthropic returned ${response.status}`);
  }

  return response;
}

let proxyServer: any = null;

export async function startProxyServer(): Promise<number> {
  // Validate credentials at startup - fail fast if misconfigured
  validateCredentials();

  const server = Bun.serve({
    port: PROXY_PORT,
    hostname: '127.0.0.1',
    idleTimeout: 255, // Max allowed by Bun (4.25 minutes) for long-running Claude API requests

    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);

      // Health check endpoint
      if (url.pathname === '/health') {
        return Response.json(stats);
      }

      // Only proxy /v1/messages
      if (url.pathname !== '/v1/messages' || req.method !== 'POST') {
        return new Response('Not Found', { status: 404 });
      }

      stats.requests++;

      const body = await req.text();

      // Track errors from both providers for debugging
      let bedrockError: string | undefined;

      // Always try Bedrock first (uses $100k credits)
      try {
        const bedrockResponse = await forwardToBedrock(body, req.headers);

        if (bedrockResponse.ok) {
          stats.successes++;
          stats.bedrockSuccesses++;
          return bedrockResponse;
        }

        // Any Bedrock error triggers immediate failover to Anthropic
        const bedrockErrorBody = await bedrockResponse.text();
        bedrockError = `Bedrock returned ${bedrockResponse.status}: ${bedrockErrorBody}`;
        console.log(`⚠️  Bedrock returned ${bedrockResponse.status} - failing over to Anthropic`);
      } catch (error) {
        bedrockError = `Bedrock request error: ${String(error)}`;
        console.error('❌ Bedrock request error:', error);
      }

      // Immediate failover to Anthropic (zero delay)
      console.log('🔄 Failing over to Anthropic...');
      stats.anthropicFailovers++;

      try {
        const anthropicResponse = await forwardToAnthropic(body, req.headers);

        if (anthropicResponse.ok) {
          stats.successes++;
        } else {
          stats.failures++;
          stats.lastError = `Anthropic returned ${anthropicResponse.status}`;
        }

        return anthropicResponse;
      } catch (error) {
        console.error('❌ Anthropic request error:', error);
        stats.failures++;
        stats.lastError = String(error);

        return new Response(
          JSON.stringify({
            error: 'Both Bedrock and Anthropic failed',
            bedrockError,
            anthropicError: String(error),
            stats
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  });

  proxyServer = server;

  console.log(`✅ Proxy server listening on http://127.0.0.1:${server.port}`);
  console.log(`   Forwarding to Cloudflare AI Gateway (${AI_GATEWAY_BASE})`);
  console.log('   🔒 Bedrock-first with Anthropic failover');
  console.log(`   📊 Health endpoint: http://127.0.0.1:${server.port}/health`);

  // Register graceful shutdown handlers
  const shutdownHandler = () => {
    console.log('\n🛑 Shutting down proxy server...');
    stopProxyServer();
    process.exit(0);
  };

  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);

  return server.port;
}

export function stopProxyServer(): void {
  if (proxyServer) {
    proxyServer.stop();
    proxyServer = null;
    console.log('✅ Proxy server stopped');
  }
}

export function getProxyUrl(): string {
  return `http://127.0.0.1:${PROXY_PORT}`;
}

export function shouldUseProxy(): boolean {
  // Proxy should be used if both credentials are available
  try {
    validateCredentials();
    return true;
  } catch {
    return false;
  }
}
