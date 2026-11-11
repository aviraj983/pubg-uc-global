import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const apiPlugin = () => ({
  name: 'api-server-middleware',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (!req.url?.startsWith('/api/')) {
        return next();
      }
      try {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:5173'}`);
        const pathname = urlObj.pathname;

        let handler: any;
        if (pathname === '/api/verify-player') {
          const mod = await server.ssrLoadModule('/api/verify-player.ts');
          handler = mod.default;
        } else if (pathname === '/api/payment/create-order' || pathname === '/api/create-payment') {
          const mod = await server.ssrLoadModule('/api/payment/create-order.ts');
          handler = mod.default;
        } else if (pathname === '/api/payment/callback' || pathname === '/api/payment-callback') {
          const mod = await server.ssrLoadModule('/api/payment/callback.ts');
          handler = mod.default;
        }

        if (!handler) {
          return next();
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const bodyBuf = chunks.length > 0 ? Buffer.concat(chunks) : null;

        if (pathname === '/api/payment/callback' || pathname === '/api/payment-callback') {
          const mockReq: any = req;
          mockReq.body = bodyBuf ? JSON.parse(bodyBuf.toString('utf-8')) : {};
          mockReq.query = Object.fromEntries(urlObj.searchParams.entries());
          const mockRes: any = {
            setHeader: (k: string, v: string) => res.setHeader(k, v),
            status: (code: number) => {
              res.statusCode = code;
              return mockRes;
            },
            send: (text: string) => {
              res.end(text);
            },
            json: (data: any) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
          };
          return await handler(mockReq, mockRes);
        }

        const webReq = new Request(urlObj.href, {
          method: req.method,
          headers: req.headers,
          body: req.method !== 'GET' && req.method !== 'HEAD' ? bodyBuf : undefined,
        });

        const response: Response = await handler(webReq);
        res.statusCode = response.status;
        response.headers.forEach((val: string, key: string) => {
          res.setHeader(key, val);
        });
        const arrayBuf = await response.arrayBuffer();
        res.end(Buffer.from(arrayBuf));
      } catch (err: any) {
        console.error('API middleware error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err?.message || 'Internal server error' }));
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
