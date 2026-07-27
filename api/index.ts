// Vercel Serverless Function entrypoint. vercel.json rewrites every
// /api/* request here while preserving the original /api/... pathname, so
// the Express app's own route matching (e.g. app.get('/api/homes', ...))
// works unchanged. This file must never call app.listen() — Vercel invokes
// the exported handler directly per-request.
import app from '../src/server/app.ts';

export default app;
