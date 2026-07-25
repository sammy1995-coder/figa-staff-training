// Client-side watch-session manager. Talks to POST /api/watch-sessions,
// PATCH /api/watch-sessions/:id, and POST /api/watch-sessions/:id/close.
//
// Active watch time only accumulates while the video is actually playing
// AND the tab is visible — a 1s local ticker adds to a buffer under those
// conditions and nothing else, so pausing, hidden tabs, and buffering never
// inflate the total. That buffer is flushed to the server periodically (a
// "heartbeat") and immediately on pause/seek/end, rather than trusting a
// single client-reported percentage.
//
// This constant is a plain client-side literal (not shared with the server
// via src/lib/config.ts) because that file reads `process.env`, which does
// not exist in the Vite browser bundle. Keep it in sync with
// HEARTBEAT_INTERVAL_SECONDS in src/lib/config.ts if either changes.
export const HEARTBEAT_INTERVAL_SECONDS = 15;

interface WatchSessionTrackerOptions {
  videoId: number;
  getPosition: () => number;
  getDuration: () => number;
}

type ExitReason = 'ended' | 'page_exit' | 'component_unmount' | 'tab_closed';

export class WatchSessionTracker {
  private videoId: number;
  private getPosition: () => number;
  private getDuration: () => number;

  private sessionId: number | null = null;
  private activeSecondsBuffer = 0;
  private isPlaying = false;
  private isVisible = typeof document !== 'undefined' ? !document.hidden : true;
  private hasFirstPlayed = false;
  private closed = false;
  private opening: Promise<{ id: number; lastPositionSeconds: number } | null> | null = null;

  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;

  private handleVisibilityChange = () => {
    this.isVisible = !document.hidden;
    if (document.hidden) {
      // Tab hidden isn't necessarily "left" — stop counting active time and
      // persist what's buffered so far, but keep the session open.
      void this.flushHeartbeat();
    }
  };

  private handlePageHide = () => {
    this.close('page_exit');
  };

  constructor(opts: WatchSessionTrackerOptions) {
    this.videoId = opts.videoId;
    this.getPosition = opts.getPosition;
    this.getDuration = opts.getDuration;
  }

  async open(startPositionSeconds: number): Promise<number | null> {
    if (this.opening) {
      const existing = await this.opening;
      return existing?.id ?? null;
    }

    this.opening = (async () => {
      try {
        const res = await fetch('/api/watch-sessions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: this.videoId, startPositionSeconds: Math.round(startPositionSeconds) }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return { id: data.id as number, lastPositionSeconds: data.lastPositionSeconds as number };
      } catch {
        return null;
      }
    })();

    const result = await this.opening;
    if (!result) return null;

    this.sessionId = result.id;
    this.startTicking();
    this.startHeartbeatLoop();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide);
    return this.sessionId;
  }

  private startTicking() {
    this.tickHandle = setInterval(() => {
      if (this.isPlaying && this.isVisible) {
        this.activeSecondsBuffer += 1;
      }
    }, 1000);
  }

  private startHeartbeatLoop() {
    this.heartbeatHandle = setInterval(() => {
      if (this.activeSecondsBuffer > 0) {
        void this.flushHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);
  }

  /** Video started or resumed playing. */
  notifyPlaying() {
    this.isPlaying = true;
    this.hasFirstPlayed = true;
  }

  /** Video paused or entered a non-playing state (buffering, etc). */
  notifyPaused() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    void this.flushHeartbeat();
  }

  /** User scrubbed the playhead — persist the new position immediately. The
   * skipped range is never added to activeSecondsBuffer since that buffer
   * only grows via the 1s ticker while actually playing. */
  notifySeek() {
    void this.flushHeartbeat();
  }

  private buildPayload() {
    const delta = Math.round(this.activeSecondsBuffer);
    this.activeSecondsBuffer -= delta;
    const duration = Math.round(this.getDuration() || 0);
    return {
      activeSecondsDelta: delta,
      lastPositionSeconds: Math.round(this.getPosition() || 0),
      videoDurationSeconds: duration > 0 ? duration : undefined,
      firstPlay: this.hasFirstPlayed,
    };
  }

  private async flushHeartbeat() {
    if (!this.sessionId || this.closed) return;
    const payload = this.buildPayload();
    try {
      await fetch(`/api/watch-sessions/${this.sessionId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Best-effort. A dropped heartbeat only loses one interval's worth of
      // active-time delta (already cleared from the buffer above); the next
      // heartbeat or close() carries on from there.
    }
  }

  /** Video reached the end naturally. */
  notifyEnded() {
    this.isPlaying = false;
    this.close('ended');
  }

  close(reason: ExitReason) {
    if (!this.sessionId || this.closed) return;
    this.closed = true;
    this.isPlaying = false;

    if (this.tickHandle) clearInterval(this.tickHandle);
    if (this.heartbeatHandle) clearInterval(this.heartbeatHandle);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pagehide', this.handlePageHide);

    const payload = { ...this.buildPayload(), exitReason: reason };
    const url = `/api/watch-sessions/${this.sessionId}/close`;

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const sent = navigator.sendBeacon(url, blob);
      if (sent) return;
    }

    // Fallback for browsers without sendBeacon or when it's refused —
    // fire-and-forget, best effort only.
    void fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}
