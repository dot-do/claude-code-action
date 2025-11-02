import { createServer, IncomingMessage, ServerResponse } from 'http';
import { request as httpsRequest } from 'https';

/**
 * HTTP Proxy Server for claude-lb
 *
 * Intercepts Claude CLI requests to claude-lb.dotdo.workers.dev and adds
 * authentication headers with credentials from environment variables.
 *
 * This enables secure pass-through authentication without storing secrets in the worker.
 */

const PROXY_PORT = 18765; // Local proxy port
const TARGET_HOST = 'claude-lb.dotdo.workers.dev';

export async function startProxyServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
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
        // Forward request to claude-lb with authentication headers
        const options = {
          hostname: TARGET_HOST,
          port: 443,
          path: '/v1/messages',
          method: 'POST',
          headers: {
            ...req.headers,
            host: TARGET_HOST,
            // Add authentication headers from environment
            'x-bedrock-token': process.env.AWS_BEARER_TOKEN_BEDROCK || '',
            'x-anthropic-key': process.env.ANTHROPIC_API_KEY || '',
          },
        };

        const proxyReq = httpsRequest(options, (proxyRes) => {
          // Forward response headers
          res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);

          // Forward response body
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (error) => {
          console.error('Proxy request error:', error);
          res.writeHead(500);
          res.end('Proxy Error');
        });

        // Send request body
        proxyReq.write(body);
        proxyReq.end();
      });
    });

    server.on('error', (error) => {
      reject(error);
    });

    server.listen(PROXY_PORT, '127.0.0.1', () => {
      console.log(`🔀 Proxy server listening on http://127.0.0.1:${PROXY_PORT}`);
      console.log(`   Forwarding to https://${TARGET_HOST} with auth headers`);
      resolve(PROXY_PORT);
    });
  });
}

export function getProxyUrl(): string {
  return `http://127.0.0.1:${PROXY_PORT}`;
}
