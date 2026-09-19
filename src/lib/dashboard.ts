import { dateKey, hasReadingActivity, type History } from "@/src/lib/dates";
import type { Account } from "@/src/lib/account";

export type Period = "today" | "week" | "all";
export function dashboardDays(ref = new Date()) {
  const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return ["M", "T", "W", "T", "F", "S", "S"].map((label, index) => {
    const date = new Date(monday); date.setDate(monday.getDate() + index);
    return { key: dateKey(date), label };
  });
}
export function readingDayState(history: History, key: string, today = dateKey(new Date())) {
  if (key > today) return "future";
  if (hasReadingActivity(history[key])) return "read";

  // Do not paint days before this profile/guest ever started reading as missed.
  // This is especially important after sign-out: a fresh guest should not
  // inherit a row of red "missed" days simply because it is later in the week.
  const firstTrackedDay = Object.keys(history)
    .filter((dayKey) => dayKey <= today && hasReadingActivity(history[dayKey]))
    .sort()[0];

  if (!firstTrackedDay || key < firstTrackedDay) return key === today ? "pending" : "untracked";
  return key < today ? "missed" : "pending";
}
export function dashboardStats(account: Pick<Account, "history" | "totalHasanaat" | "completedReads" | "totalSeconds">, period: Period, ref = new Date()) {
  const today = dateKey(ref);
  const keys = period === "today" ? [today] : period === "week" ? dashboardDays(ref).map(d => d.key).filter(k => k <= today) : Object.keys(account.history).filter(k => k <= today);
  const sum = (field: "hasanaat" | "ayat" | "seconds") => keys.reduce((n, k) => n + (account.history[k]?.[field] ?? 0), 0);
  return {
    hasanaat: period === "all" ? account.totalHasanaat : sum("hasanaat"),
    ayat: period === "all" ? account.completedReads : sum("ayat"),
    seconds: period === "all" ? account.totalSeconds : sum("seconds"),
    days: keys.filter(k => readingDayState(account.history, k, today) === "read").length,
  };
}
export function readingDuration(seconds: number) {
  const n = Math.max(0, Math.floor(seconds));
  if (n < 60) return `${n}s`;
  if (n < 3600) return `${Math.floor(n / 60)}m ${n % 60}s`;
  return `${Math.floor(n / 3600)}h ${Math.floor(n % 3600 / 60)}m`;
}
