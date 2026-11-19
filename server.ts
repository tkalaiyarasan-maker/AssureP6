import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authHandler from './api/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    if (args[i].startsWith('--port=')) {
      const parsed = Number(args[i].slice('--port='.length));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  if (process.env.DEFAULT_APP_PORT) {
    const parsed = Number(process.env.DEFAULT_APP_PORT);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (process.env.PORT && process.env.PORT !== process.env.NGINX_PORT) {
    const parsed = Number(process.env.PORT);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

async function startServer() {
  const app = express();
  const port = resolvePort();
  const isProd = process.env.NODE_ENV === 'production';

  // Security headers (preserve iframe compatibility for preview environment)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  // Password authentication endpoint
  app.all('/api/auth', async (req, res) => {
    await authHandler(req, res);
  });

  if (!isProd) {
    if (process.env.DISABLE_HMR === undefined) {
      process.env.DISABLE_HMR = 'true';
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    // Vite 6 still injects /@vite/client for dev CSS helpers even with ws: false;
    // suppress the unreachable standalone WebSocket connect call so the browser console stays clean.
    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const result = await vite.transformRequest('/@vite/client');
        if (!result) {
          next();
          return;
        }
        const code = result.code.replace(
          'transport.connect(createHMRHandler(handleMessage));',
          '/* HMR WebSocket disabled in middleware mode */'
        );
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(code);
      } catch (err) {
        next(err);
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Assure P6 server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
