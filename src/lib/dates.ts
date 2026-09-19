// Local-calendar helpers. Today = local midnight..23:59:59. Week = Mon..Sun.
// Month = 1st..last day. History is keyed by local YYYY-MM-DD.

export type DayStat = { hasanaat: number; ayat: number; seconds?: number };
export type History = Record<string, DayStat>;

export function hasReadingActivity(day?: DayStat): boolean {
  return (day?.ayat ?? 0) > 0 || (day?.hasanaat ?? 0) > 0 || (day?.seconds ?? 0) > 0;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function dayOfYear(d = new Date()): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000);
}

// Local calendar components, not elapsed local hours: stable across DST and
// continuous across New Year. Calendar display preference doesn't change days.
export function localDayNumber(d = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

// Seven dates for the current week, Monday..Sunday.
export function weekDays(ref = new Date()): { date: Date; key: string; label: string }[] {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sunday = new Date(ref);
  sunday.setDate(ref.getDate() - (ref.getDay() + 6) % 7);
  sunday.setHours(0, 0, 0, 0);
  return labels.map((label, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    return { date, key: dateKey(date), label };
  });
}

export function weekKeys(ref = new Date()): string[] {
  return weekDays(ref).map((d) => d.key);
}

export function monthKeys(ref = new Date()): string[] {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const keys: string[] = [];
  for (let d = 1; d <= days; d++) keys.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  return keys;
}

function sumField(history: History, keys: string[], field: "hasanaat" | "ayat"): number {
  return keys.reduce((acc, k) => acc + (history[k]?.[field] ?? 0), 0);
}

export function todayValue(history: History, field: "hasanaat" | "ayat"): number {
  return history[todayKey()]?.[field] ?? 0;
}
export function weekValue(history: History, field: "hasanaat" | "ayat"): number {
  return sumField(history, weekKeys(), field);
}
export function monthValue(history: History, field: "hasanaat" | "ayat"): number {
  return sumField(history, monthKeys(), field);
}

// Consecutive-day streak. Counts back from today (or yesterday if today has no
// activity yet). Does NOT reset weekly.
export function computeStreak(history: History, ref = new Date()): number {
  const hasActivity = (d: Date) => hasReadingActivity(history[dateKey(d)]);
  const cursor = new Date(ref);
  cursor.setHours(0, 0, 0, 0);
  // A still-unread current day does not kill yesterday's streak. Once a full
  // local calendar day is missed, the streak resets.
  if (!hasActivity(cursor)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!hasActivity(cursor)) return 0;
  }
  let streak = 0;
  while (hasActivity(cursor)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function formatK(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad(m)}:${pad(s)}`;
}
