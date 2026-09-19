import { dateKey } from '@/src/lib/dates';
// Sample elapsed time instead of assuming JS timers fire every second.
export function readingSecondsBetween(start: number, end: number): Record<string, number> {
  const result: Record<string, number> = {};
  let cursor = start;
  while (cursor + 1000 <= end) {
    const date = new Date(cursor);
    const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    const seconds = Math.min(Math.floor((end - cursor) / 1000), Math.max(1, Math.ceil((midnight - cursor) / 1000)));
    const key = dateKey(date);
    result[key] = (result[key] ?? 0) + seconds;
    cursor += seconds * 1000;
  }
  return result;
}
