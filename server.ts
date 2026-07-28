import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import app from './src/server/app.js';
import { checkDatabaseConnection, closeDatabasePool } from './src/db/index.js';

dotenv.config({ quiet: true });

async function startServer() {
  const PORT = Number(process.env.PORT ?? 3000);

  // ----------------------------------------------------
  // VITE MIDDLEWARE FOR SERVING FRONTEND & PRODUCTION
  // ----------------------------------------------------
  // Vercel deployments never hit this file — the frontend is built by Vite
  // to dist/ and served by Vercel directly, and API routes run via
  // api/index.ts. This local-only branch exists so `npm run dev` (Vite dev
  // server + HMR) and `npm run build && npm start` (serving the built dist/)
  // keep working exactly as before.
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  // Report DB reachability at startup without blocking the server from
  // coming up — routes already degrade gracefully via sendServerError.
  (async () => {
    const status = await checkDatabaseConnection();
    if (!status.ok) {
      console.error(
        `[db] Could not reach the database: ${status.error}. ` +
          `Check DATABASE_URL / SQL_HOST, SQL_DB_NAME, SQL_USER, SQL_PASSWORD in your .env file, ` +
          `and confirm the database server is running and reachable. API requests will return 503 until this is resolved.`
      );
      return;
    }
    console.log('[db] Connected successfully.');
  })();

  const shutdown = async (signal: string) => {
    console.log(`[server] Received ${signal}, shutting down...`);
    server.close(() => console.log('[server] HTTP server closed.'));
    await closeDatabasePool();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();
