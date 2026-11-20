import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { ensureDbReady } from './src/server/db.ts';
import { apiRouter } from './src/server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer(): Promise<void> {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  app.use('/api', apiRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message =
      err instanceof Error ? err.message : 'Unexpected internal server error.';
    console.error('[Website Factory Error]', err);
    res.status(500).json({ error: message });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  try {
    await ensureDbReady();
    console.log('[Website Factory] PostgreSQL schema & Demo Mode seed verified.');
  } catch (err) {
    console.error('[Website Factory] Database initialization warning:', err);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(
      `[Website Factory] Server running at http://0.0.0.0:${port} (${isProd ? 'production' : 'development'})`
    );
  });
}

startServer();
