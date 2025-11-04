import { createServer, IncomingMessage, ServerResponse } from 'http';
import { request as httpsRequest } from 'https';

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
 * - Zero-delay failover on 429 rate limits
 */

const PROXY_PORT = 18765; // Local proxy port
const AI_GATEWAY_ACCOUNT = 'b6641681fe423910342b9ffa1364c76d';
const AI_GATEWAY_ID = 'claude-gateway';
const AI_GATEWAY_BASE = `gateway.ai.cloudflare.com/v1/${AI_GATEWAY_ACCOUNT}/${AI_GATEWAY_ID}`;

interface ProxyStats {
  requests: number;
  successes: number;
  failures: number;
  lastError?: string;
}

const stats: ProxyStats = {
  requests: 0,
  successes: 0,
  failures: 0,
};

/**
 * Determine proxy mode based on available credentials
 * - "bedrock-anthropic": Both credentials available (full failover)
 * - "anthropic-only": Only Anthropic key available
 * - "direct": No proxy, use direct Anthropic API
 */
function getProxyMode(): 'bedrock-anthropic' | 'anthropic-only' | 'direct' {
  const hasBedrockToken = !!(process.env.AWS_BEARER_TOKEN_BEDROCK?.trim());
  const hasAnthropicKey = !!(process.env.ANTHROPIC_API_KEY?.trim());

  if (hasBedrockToken && hasAnthropicKey) {
    return 'bedrock-anthropic';
  } else if (hasAnthropicKey) {
    return 'anthropic-only';
  } else {
    return 'direct';
  }
}

/**
 * Forward request to AWS Bedrock via AI Gateway
 */
function forwardToBedrock(
  body: string,
  headers: Record<string, string | string[] | undefined>,
  res: ServerResponse
): void {
  const bedrockToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
  if (!bedrockToken) {
    console.log('⚠️  No Bedrock token, skipping to Anthropic');
    forwardToAnthropic(body, headers, res);
    return;
  }

  // AI Gateway URL for Bedrock
  const bedrockPath = `/aws-bedrock/bedrock-runtime.us-east-1.amazonaws.com/model/us.anthropic.claude-sonnet-4-5-v1:0/invoke`;

  const options = {
    hostname: AI_GATEWAY_BASE,
    port: 443,
    path: bedrockPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bedrockToken}`,
      'anthropic-version': headers['anthropic-version'] || '2023-06-01',
    },
  };

  console.log('🔵 Attempting Bedrock via AI Gateway...');
  const proxyReq = httpsRequest(options, (proxyRes) => {
    stats.requests++;

    const statusCode = proxyRes.statusCode || 500;

    // On 429 rate limit, immediately failover to Anthropic
    if (statusCode === 429) {
      stats.failures++;
      console.log('⚠️  Bedrock rate limited (429) - failing over to Anthropic immediately');
      forwardToAnthropic(body, headers, res);
      return;
    }

    // For other status codes, return the response
    if (statusCode >= 200 && statusCode < 300) {
      stats.successes++;
      console.log('✅ Bedrock request succeeded via AI Gateway');
    } else {
      stats.failures++;
      console.warn(`⚠️  Bedrock returned ${statusCode}`);
    }

    res.writeHead(statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    stats.requests++;
    stats.failures++;
    stats.lastError = error.message;
    console.error('❌ Bedrock request error:', error.message);

    // Failover to Anthropic on any error
    console.log('🔄 Failing over to Anthropic...');
    forwardToAnthropic(body, headers, res);
  });

  proxyReq.write(body);
  proxyReq.end();
}

/**
 * Forward request to Anthropic via AI Gateway
 */
function forwardToAnthropic(
  body: string,
  headers: Record<string, string | string[] | undefined>,
  res: ServerResponse
): void {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error('❌ No Anthropic API key available');
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'No API credentials available' }));
    return;
  }

  // AI Gateway URL for Anthropic
  const anthropicPath = `/anthropic/v1/messages`;

  const options = {
    hostname: AI_GATEWAY_BASE,
    port: 443,
    path: anthropicPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': headers['anthropic-version'] || '2023-06-01',
    },
  };

  console.log('🟢 Attempting Anthropic via AI Gateway...');
  const directReq = httpsRequest(options, (directRes) => {
    stats.requests++;

    const statusCode = directRes.statusCode || 500;
    if (statusCode >= 200 && statusCode < 300) {
      stats.successes++;
      console.log('✅ Anthropic request succeeded via AI Gateway');
    } else {
      stats.failures++;
      console.error(`❌ Anthropic returned ${statusCode}`);
    }

    res.writeHead(statusCode, directRes.headers);
    directRes.pipe(res);
  });

  directReq.on('error', (error) => {
    stats.requests++;
    stats.failures++;
    stats.lastError = error.message;
    console.error('❌ Anthropic request error:', error.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Anthropic API Error', message: error.message }));
  });

  directReq.write(body);
  directReq.end();
}

export async function startProxyServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const mode = getProxyMode();

    // Log proxy configuration
    console.log('🔀 Proxy Mode:', mode);
    if (mode === 'direct') {
      console.log('⚠️  No proxy credentials - using direct Anthropic API');
      console.log('   Set ANTHROPIC_API_KEY to enable monitoring via AI Gateway');
      // Still return the port but proxy won't be used
      resolve(PROXY_PORT);
      return;
    }

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      // Special endpoint for health/stats (check this first!)
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
      }

      // Only proxy requests to /v1/messages
      if (req.url !== '/v1/messages' || req.method !== 'POST') {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      // Collect request body
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        // Convert headers to plain object
        const headers: Record<string, string | string[] | undefined> = {};
        if (req.headers) {
          Object.entries(req.headers).forEach(([key, value]) => {
            headers[key] = value;
          });
        }

        forwardToBedrock(body, headers, res);
      });
    });

    server.on('error', (error) => {
      console.error('❌ Proxy server error:', error.message);
      reject(error);
    });

    server.listen(PROXY_PORT, '127.0.0.1', () => {
      console.log(`✅ Proxy server listening on http://127.0.0.1:${PROXY_PORT}`);
      console.log(`   Forwarding to Cloudflare AI Gateway (${AI_GATEWAY_BASE})`);
      console.log(`   Mode: ${mode}`);
      if (mode === 'bedrock-anthropic') {
        console.log('   🔒 Bedrock-first with Anthropic failover via AI Gateway');
      } else if (mode === 'anthropic-only') {
        console.log('   🔒 Anthropic-only mode via AI Gateway (monitoring + observability)');
      }
      console.log(`   📊 Health endpoint: http://127.0.0.1:${PROXY_PORT}/health`);
      resolve(PROXY_PORT);
    });
  });
}

export function getProxyUrl(): string {
  return `http://127.0.0.1:${PROXY_PORT}`;
}

export function shouldUseProxy(): boolean {
  return getProxyMode() !== 'direct';
}
