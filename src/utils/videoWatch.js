/** Candidates must reach this share of the video before quiz unlocks. */
export const VIDEO_COMPLETION_RATIO = 0.95;

/**
 * Allow forward drift for heartbeat lag (client reports ~every 4s).
 * Larger jumps are treated as illegal seeks and ignored.
 */
export const VIDEO_FORWARD_TOLERANCE_SECONDS = 20;

export function computeWatchPercent(maxWatchedSeconds, durationSeconds) {
  const duration = Number(durationSeconds) || 0;
  const watched = Number(maxWatchedSeconds) || 0;
  if (duration <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((watched / duration) * 100)));
}

export function isVideoWatchComplete({ maxWatchedSeconds, durationSeconds, ended = false }) {
  const duration = Number(durationSeconds) || 0;
  const watched = Number(maxWatchedSeconds) || 0;
  if (duration <= 0) return false;

  const ratioComplete = watched >= duration * VIDEO_COMPLETION_RATIO;
  const nearEndComplete = ended && watched >= Math.max(duration - 5, duration * 0.9);
  return ratioComplete || nearEndComplete;
}

export function clampReportedWatchTime({
  previousMaxWatched,
  reportedCurrentTime,
  duration,
}) {
  const prev = Math.max(0, Number(previousMaxWatched) || 0);
  const reported = Math.max(0, Number(reportedCurrentTime) || 0);
  const safeDuration = Math.max(0, Number(duration) || 0);
  const cappedReported = safeDuration > 0 ? Math.min(reported, safeDuration) : reported;

  // Reject scrubbing far ahead of continuous watch progress.
  if (cappedReported > prev + VIDEO_FORWARD_TOLERANCE_SECONDS) {
    return prev;
  }

  return Math.max(prev, cappedReported);
}
