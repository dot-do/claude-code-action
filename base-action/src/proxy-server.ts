import { createServer, IncomingMessage, ServerResponse } from 'http';
import { request as httpsRequest } from 'https';

/**
 * HTTP Proxy Server for claude-lb
 *
 * Intercepts Claude CLI requests and forwards them to claude-lb.dotdo.workers.dev
 * with authentication headers from environment variables.
 *
 * This enables:
 * - Secure pass-through authentication (no secrets stored in worker)
 * - Centralized monitoring and observability via Cloudflare AI Gateway
 * - Flexible multi-provider architecture (Bedrock, Anthropic, future providers)
 * - Intelligent retry and failover logic
 */

const PROXY_PORT = 18765; // Local proxy port
const TARGET_HOST = 'claude-lb.dotdo.workers.dev';
const DIRECT_ANTHROPIC_FALLBACK = true; // Fall back to direct API if proxy fails

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
 * Forward request to claude-lb proxy
 */
function forwardToClaudeLB(
  body: string,
  headers: Record<string, string | string[] | undefined>,
  res: ServerResponse
): void {
  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: {
      ...headers,
      host: TARGET_HOST,
      // Pass authentication headers (worker will use what's available)
      'x-bedrock-token': process.env.AWS_BEARER_TOKEN_BEDROCK || '',
      'x-anthropic-key': process.env.ANTHROPIC_API_KEY || '',
    },
  };

  const proxyReq = httpsRequest(options, (proxyRes) => {
    stats.requests++;

    // Log response for monitoring
    const statusCode = proxyRes.statusCode || 500;
    if (statusCode >= 200 && statusCode < 300) {
      stats.successes++;
    } else {
      stats.failures++;
      console.warn(`⚠️  claude-lb returned ${statusCode}`);
    }

    // Forward response headers and body
    res.writeHead(statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    stats.requests++;
    stats.failures++;
    stats.lastError = error.message;
    console.error('❌ Proxy request error:', error.message);

    // If direct fallback is enabled, try direct Anthropic API
    if (DIRECT_ANTHROPIC_FALLBACK && process.env.ANTHROPIC_API_KEY) {
      console.log('🔄 Falling back to direct Anthropic API...');
      forwardToDirectAnthropic(body, headers, res);
    } else {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Proxy Error', message: error.message }));
    }
  });

  proxyReq.write(body);
  proxyReq.end();
}

/**
 * Direct fallback to Anthropic API (bypass proxy)
 */
function forwardToDirectAnthropic(
  body: string,
  headers: Record<string, string | string[] | undefined>,
  res: ServerResponse
): void {
  const options = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: {
      ...headers,
      host: 'api.anthropic.com',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': headers['anthropic-version'] || '2023-06-01',
    },
  };

  const directReq = httpsRequest(options, (directRes) => {
    res.writeHead(directRes.statusCode || 500, directRes.headers);
    directRes.pipe(res);
  });

  directReq.on('error', (error) => {
    console.error('❌ Direct API error:', error.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Direct API Error', message: error.message }));
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
      console.log('   Set ANTHROPIC_API_KEY to enable monitoring via claude-lb');
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

        forwardToClaudeLB(body, headers, res);
      });
    });

    server.on('error', (error) => {
      console.error('❌ Proxy server error:', error.message);
      reject(error);
    });

    server.listen(PROXY_PORT, '127.0.0.1', () => {
      console.log(`✅ Proxy server listening on http://127.0.0.1:${PROXY_PORT}`);
      console.log(`   Forwarding to https://${TARGET_HOST}`);
      console.log(`   Mode: ${mode}`);
      if (mode === 'bedrock-anthropic') {
        console.log('   🔒 Bedrock-first with Anthropic failover (full proxy mode)');
      } else if (mode === 'anthropic-only') {
        console.log('   🔒 Anthropic-only mode (monitoring + observability)');
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
