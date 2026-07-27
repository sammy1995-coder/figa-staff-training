// Single source of truth for the "video watched" threshold. The app already
// hardcoded 95% as its watched/quiz-unlock cutoff in several places — this
// consolidates that into one overridable value instead of introducing a
// second, different number for "video completion".
function readThreshold(): number {
  const raw = process.env.VIDEO_COMPLETION_THRESHOLD;
  const parsed = raw ? parseFloat(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1) return parsed;
  return 0.95;
}

export const VIDEO_COMPLETION_THRESHOLD = readThreshold();

// How often the client is expected to send a watch-session heartbeat while
// actively playing. Also used server-side to clamp a single heartbeat's
// claimed active-watch delta so a tampered client can't inflate totals.
export const HEARTBEAT_INTERVAL_SECONDS = 15;
export const HEARTBEAT_DELTA_MAX_SECONDS = HEARTBEAT_INTERVAL_SECONDS + 10; // small slack for jitter

// Resolves the app's own public base URL for self-referential links (e.g.
// email templates, OAuth callbacks). Explicit APP_URL always wins; on Vercel
// falls back to the stable production domain (not VERCEL_URL, which is a
// unique per-deployment URL that changes every deploy); otherwise assumes
// local dev.
export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'http://localhost:3000';
}
