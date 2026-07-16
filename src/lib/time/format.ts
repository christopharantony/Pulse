/**
 * `mm:ss` under an hour, `h:mm:ss` at or above an hour. Unlike the goal/habit timer widgets' own
 * inline `formatElapsed` (which only ever displays a single in-progress session and so never needs
 * the hour segment), today/history totals on the Time Tracker page routinely exceed an hour.
 */
export function formatElapsedTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');

  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
