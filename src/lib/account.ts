import { readerTheme, type ReaderThemeId } from "@/src/lib/reader-themes";
import { RECITERS } from "@/src/data/reciters";
import { DEFAULT_SITE_BACKGROUND, siteBackground, type SiteBackgroundId } from "@/src/data/site-backgrounds";
// users/{uid} account model + local-first merge logic (ported from web semantics).
import type { DayStat, History } from "@/src/lib/dates";
import { todayKey } from "@/src/lib/dates";

export type Bookmark = { surah: number; ayah: number; createdAt: string };
export type NameBookmark = { nameNumber: number; createdAt: string };
type Progress = { history: History; totalHasanaat: number; completedReads: number; totalSeconds: number };

export type AppSettings = {
  readerTheme: ReaderThemeId;
  theme: "dark" | "light" | "system";
  siteBackground: SiteBackgroundId;
  readingSize: "small" | "standard" | "large" | "xlarge";
  reciter: string;
  speed: number;
  autoplay: boolean;
  language: string;
  dailyGoal: number;
  notifications: { enabled: boolean; time: string };
};

export type AdhkarProgress = {
  date: string; // day key the counts belong to
  counts: Record<string, number>; // dhikrId -> repetitions done
};

export type Account = {
  schemaVersion: number;
  uid: string;
  email: string;
  fullName: string;
  username: string;
  photoURL: string;
  profile: { bio: string };
  history: History;
  progressBase: Progress;
  deviceProgress: Record<string, Progress>;
  settings: AppSettings;
  settingsUpdatedAt?: Partial<Record<keyof AppSettings, string>>;
  profileUpdatedAt?: string;
  profileFieldUpdatedAt?: Partial<Record<"fullName" | "username" | "photoURL" | "bio", string>>;
  adhkarProgress: AdhkarProgress;
  tasbeeh: { phrase: string; target: number; count: number };
  currentSurah: number;
  currentAyah: number;
  totalHasanaat: number;
  completedReads: number;
  totalSeconds: number;
  todayKey: string;
  todayStats: DayStat;
  appState: {
    bookmarks: Bookmark[];
    nameBookmarks: NameBookmark[];
    removedBookmarks?: Record<string, string>;
    removedNameBookmarks?: Record<string, string>;
  };
  revision: number;
  lastMutationId: string;
  updatedAt: string; // ISO
};

// Normalize live Firestore Timestamps and their persisted JSON representation.
export function accountTimestamp(value: any): string {
  let ms: number;
  if (value && typeof value === "object" && typeof value.seconds === "number") {
    ms = value.seconds * 1000 + (typeof value.nanoseconds === "number" ? value.nanoseconds / 1e6 : 0);
  } else if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    ms = new Date(value).getTime();
  } else ms = NaN;
  return Number.isFinite(ms) && Math.abs(ms) <= 8.64e15 ? new Date(ms).toISOString() : new Date(0).toISOString();
}

export const SCHEMA_VERSION = 4;
const emptyProgress = (): Progress => ({ history: {}, totalHasanaat: 0, completedReads: 0, totalSeconds: 0 });
const safeCount = (value: unknown): number => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
function normalizeProgress(value: any): Progress {
  const history: History = {};
  for (const [key, raw] of Object.entries(value?.history ?? {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !raw || typeof raw !== "object") continue;
    const day = raw as DayStat;
    history[key] = { hasanaat: safeCount(day.hasanaat), ayat: safeCount(day.ayat), seconds: safeCount(day.seconds) };
  }
  const sum = (field: keyof DayStat) => Object.values(history).reduce((n, day) => n + (day[field] ?? 0), 0);
  // Legacy lifetime totals may include days for which no history was retained.
  return { history, totalHasanaat: Math.max(safeCount(value?.totalHasanaat), sum("hasanaat")), completedReads: Math.max(safeCount(value?.completedReads), sum("ayat")), totalSeconds: Math.max(safeCount(value?.totalSeconds), sum("seconds")) };
}
function maxProgress(a: Progress, b: Progress): Progress {
  const history = { ...a.history };
  for (const [key, day] of Object.entries(b.history)) {
    const other = history[key];
    history[key] = { hasanaat: Math.max(day.hasanaat, other?.hasanaat ?? 0), ayat: Math.max(day.ayat, other?.ayat ?? 0), seconds: Math.max(day.seconds ?? 0, other?.seconds ?? 0) };
  }
  return normalizeProgress({ history, totalHasanaat: Math.max(a.totalHasanaat, b.totalHasanaat), completedReads: Math.max(a.completedReads, b.completedReads), totalSeconds: Math.max(a.totalSeconds, b.totalSeconds) });
}
function withProgress(a: Account): Account {
  const total = { ...a.progressBase, history: { ...a.progressBase.history } };
  for (const p of Object.values(a.deviceProgress)) {
    total.totalHasanaat += p.totalHasanaat;
    total.completedReads += p.completedReads;
    total.totalSeconds += p.totalSeconds;
    for (const [key, day] of Object.entries(p.history)) {
      const prev = total.history[key] ?? { hasanaat: 0, ayat: 0, seconds: 0 };
      total.history[key] = { hasanaat: prev.hasanaat + day.hasanaat, ayat: prev.ayat + day.ayat, seconds: (prev.seconds ?? 0) + (day.seconds ?? 0) };
    }
  }
  return { ...a, ...total, todayKey: todayKey(), todayStats: total.history[todayKey()] ?? { hasanaat: 0, ayat: 0 } };
}
export function addProgress(a: Account, device: string, delta: DayStat, key = todayKey()): Account {
  const p = a.deviceProgress[device] ?? emptyProgress();
  const day = p.history[key] ?? { hasanaat: 0, ayat: 0, seconds: 0 };
  return withProgress({ ...a, deviceProgress: { ...a.deviceProgress, [device]: {
    history: { ...p.history, [key]: { hasanaat: day.hasanaat + delta.hasanaat, ayat: day.ayat + delta.ayat, seconds: (day.seconds ?? 0) + (delta.seconds ?? 0) } },
    totalHasanaat: p.totalHasanaat + delta.hasanaat,
    completedReads: p.completedReads + delta.ayat,
    totalSeconds: p.totalSeconds + (delta.seconds ?? 0),
  } } });
}

const VALID_THEMES = ["dark", "light", "system"];
const VALID_RECITERS = new Set(RECITERS.map((reciter) => reciter.id));
const VALID_SPEEDS = new Set([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);

export function defaultSettings(): AppSettings {
  return {
    theme: "dark",
    siteBackground: DEFAULT_SITE_BACKGROUND,
    readerTheme: "moonlit-orchid",
    readingSize: "standard",
    reciter: "alafasy",
    speed: 1.0,
    autoplay: false,
    language: "en",
    dailyGoal: 10,
    notifications: { enabled: false, time: "20:00" },
  };
}

export function defaultAccount(partial: Partial<Account> = {}): Account {
  return {
    schemaVersion: SCHEMA_VERSION,
    uid: "",
    email: "",
    fullName: "",
    username: "",
    photoURL: "",
    profile: { bio: "" },
    profileFieldUpdatedAt: {},
    history: {},
    progressBase: emptyProgress(),
    deviceProgress: {},
    settings: defaultSettings(),
    adhkarProgress: { date: todayKey(), counts: {} },
    tasbeeh: { phrase: "subhanallah", target: 33, count: 0 },
    currentSurah: 1,
    currentAyah: 1,
    totalHasanaat: 0,
    completedReads: 0,
    totalSeconds: 0,
    todayKey: todayKey(),
    todayStats: { hasanaat: 0, ayat: 0 },
    appState: { bookmarks: [], nameBookmarks: [] },
    revision: 0,
    lastMutationId: "",
    // Epoch so a fresh default never wins over real cloud data during merge.
    // The first real user mutation bumps this to "now".
    updatedAt: new Date(0).toISOString(),
    ...partial,
  };
}

// Map any legacy/unknown theme value safely without corrupting the setting.
export function normalizeSettings(s: any): AppSettings {
  const d = defaultSettings();
  if (!s || typeof s !== "object") return d;
  return {
    readerTheme: readerTheme(s.readerTheme).id,
    theme: VALID_THEMES.includes(s.theme) ? s.theme : d.theme,
    siteBackground: siteBackground(s.siteBackground).id,
    readingSize: ["small", "standard", "large", "xlarge"].includes(s.readingSize)
      ? s.readingSize
      : d.readingSize,
    reciter: typeof s.reciter === "string" && VALID_RECITERS.has(s.reciter) ? s.reciter : d.reciter,
    speed: typeof s.speed === "number" && VALID_SPEEDS.has(s.speed) ? s.speed : d.speed,
    autoplay: typeof s.autoplay === "boolean" ? s.autoplay : d.autoplay,
    language: typeof s.language === "string" ? s.language : d.language,
    dailyGoal: typeof s.dailyGoal === "number" && s.dailyGoal > 0 ? s.dailyGoal : d.dailyGoal,
    notifications:
      s.notifications && typeof s.notifications === "object"
        ? {
            enabled: !!s.notifications.enabled,
            time: typeof s.notifications.time === "string" ? s.notifications.time : d.notifications.time,
          }
        : d.notifications,
  };
}

// Coerce a remote document (any shape) into a full Account.
export function fromRemote(uid: string, data: any): Account {
  const base = defaultAccount({ uid });
  if (!data || (data.uid && data.uid !== uid)) return base;
  const history: History = data.history && typeof data.history === "object" ? data.history : {};
  return withProgress({
    ...base,
    uid,
    email: data.email ?? base.email,
    fullName: data.fullName ?? base.fullName,
    username: data.username ?? base.username,
    photoURL: data.photoURL ?? base.photoURL,
    profile: { bio: data.profile?.bio ?? "" },
    history,
    progressBase: normalizeProgress(data.progressBase ?? { history, totalHasanaat: data.totalHasanaat, completedReads: data.completedReads, totalSeconds: data.totalSeconds }),
    deviceProgress: Object.fromEntries(Object.entries(data.deviceProgress ?? {}).map(([key, value]) => [key, normalizeProgress(value)])),
    settings: normalizeSettings(data.settings),
    settingsUpdatedAt: Object.fromEntries(Object.keys(base.settings).map((key) => [key, accountTimestamp(data.settingsUpdatedAt?.[key] ?? data.updatedAt)])),
    profileUpdatedAt: accountTimestamp(data.profileUpdatedAt ?? data.updatedAt),
    profileFieldUpdatedAt: {
      fullName: accountTimestamp(data.profileFieldUpdatedAt?.fullName ?? data.profileUpdatedAt ?? data.updatedAt),
      username: accountTimestamp(data.profileFieldUpdatedAt?.username ?? data.profileUpdatedAt ?? data.updatedAt),
      photoURL: accountTimestamp(data.profileFieldUpdatedAt?.photoURL ?? data.profileUpdatedAt ?? data.updatedAt),
      bio: accountTimestamp(data.profileFieldUpdatedAt?.bio ?? data.profileUpdatedAt ?? data.updatedAt),
    },
    adhkarProgress:
      data.adhkarProgress && typeof data.adhkarProgress === "object"
        ? { date: data.adhkarProgress.date ?? todayKey(), counts: data.adhkarProgress.counts ?? {} }
        : base.adhkarProgress,
    tasbeeh:
      data.tasbeeh && typeof data.tasbeeh === "object"
        ? {
            phrase: data.tasbeeh.phrase ?? "subhanallah",
            target: data.tasbeeh.target ?? 33,
            count: data.tasbeeh.count ?? 0,
          }
        : base.tasbeeh,
    currentSurah: typeof data.currentSurah === "number" ? data.currentSurah : base.currentSurah,
    currentAyah: typeof data.currentAyah === "number" ? data.currentAyah : base.currentAyah,
    totalHasanaat: data.totalHasanaat ?? 0,
    completedReads: data.completedReads ?? 0,
    totalSeconds: data.totalSeconds ?? 0,
    todayKey: data.todayKey ?? todayKey(),
    todayStats: data.todayStats ?? base.todayStats,
    appState: {
      bookmarks: Array.isArray(data.appState?.bookmarks) ? data.appState.bookmarks : [],
      nameBookmarks: Array.isArray(data.appState?.nameBookmarks) ? data.appState.nameBookmarks : [],
      removedBookmarks: data.appState?.removedBookmarks ?? {},
      removedNameBookmarks: data.appState?.removedNameBookmarks ?? {},
    },
    revision: data.revision ?? 0,
    lastMutationId: data.lastMutationId ?? "",
    updatedAt: accountTimestamp(data.updatedAt),
  });
}

// Merge two full accounts. Counters/history are monotonic (take max); explicit
// fields (position/profile/settings/adhkar/tasbeeh) use the newer updatedAt.
export function mergeAccounts(remote: Account | null, local: Account): Account {
  if (!remote) return withProgress(local);
  if (remote.uid !== local.uid) throw new Error("Cannot merge different accounts");

  const localNewer = new Date(local.updatedAt).getTime() >= new Date(remote.updatedAt).getTime();

  // History: element-wise max per day.
  const mergedHistory: History = { ...remote.history };
  for (const [key, ls] of Object.entries(local.history)) {
    const rs = remote.history[key];
    mergedHistory[key] = {
      hasanaat: Math.max(ls.hasanaat ?? 0, rs?.hasanaat ?? 0),
      ayat: Math.max(ls.ayat ?? 0, rs?.ayat ?? 0),
      seconds: Math.max(ls.seconds ?? 0, rs?.seconds ?? 0),
    };
  }

  const explicit = localNewer ? local : remote;
  // Reading progress must not roll back a goal or theme edited on another device.
  const settings = { ...remote.settings };
  const settingsUpdatedAt: Partial<Record<keyof AppSettings, string>> = {};
  for (const key of Object.keys(settings) as (keyof AppSettings)[]) {
    const remoteTime = remote.settingsUpdatedAt?.[key] ?? new Date(0).toISOString();
    const localTime = local.settingsUpdatedAt?.[key] ?? new Date(0).toISOString();
    const winner = localTime >= remoteTime ? local : remote;
    Object.assign(settings, { [key]: winner.settings[key] });
    settingsUpdatedAt[key] = localTime >= remoteTime ? localTime : remoteTime;
  }
  const profileKeys = ["fullName", "username", "photoURL", "bio"] as const;
  const profileFieldUpdatedAt: Account["profileFieldUpdatedAt"] = {};
  const profileValues = {
    fullName: remote.fullName,
    username: remote.username,
    photoURL: remote.photoURL,
    bio: remote.profile.bio,
  };
  const profileTime = (account: Account, key: typeof profileKeys[number]) => {
    const fieldTimes = account.profileFieldUpdatedAt;
    // Legacy documents have no per-field map, so their old profile timestamp
    // applies to the whole profile. Once any per-field clock exists, an
    // untouched field must not inherit a timestamp from an unrelated edit.
    if (fieldTimes && Object.keys(fieldTimes).length > 0) {
      return fieldTimes[key] ?? new Date(0).toISOString();
    }
    return account.profileUpdatedAt ?? new Date(0).toISOString();
  };
  for (const key of profileKeys) {
    const remoteTime = profileTime(remote, key);
    const localTime = profileTime(local, key);
    const localWins = localTime >= remoteTime;
    profileFieldUpdatedAt[key] = localWins ? localTime : remoteTime;
    if (localWins) {
      if (key === "bio") profileValues.bio = local.profile.bio;
      else profileValues[key] = local[key];
    }
  }
  const profileUpdatedAt =
    Object.values(profileFieldUpdatedAt).sort().at(-1) ??
    (local.profileUpdatedAt ?? remote.profileUpdatedAt ?? new Date(0).toISOString());

  const deviceProgress = { ...remote.deviceProgress };
  for (const [key, p] of Object.entries(local.deviceProgress)) {
    deviceProgress[key] = maxProgress(deviceProgress[key] ?? emptyProgress(), p);
  }

  // Bookmarks: union by surah:ayah. Merge must tolerate legacy/partial
  // appState objects created before Names favorites and tombstones existed.
  const remoteAppState = remote.appState ?? { bookmarks: [], nameBookmarks: [], removedBookmarks: {}, removedNameBookmarks: {} };
  const localAppState = local.appState ?? { bookmarks: [], nameBookmarks: [], removedBookmarks: {}, removedNameBookmarks: {} };
  const remoteBookmarks = Array.isArray(remoteAppState.bookmarks) ? remoteAppState.bookmarks : [];
  const localBookmarks = Array.isArray(localAppState.bookmarks) ? localAppState.bookmarks : [];
  const remoteNameBookmarks = Array.isArray(remoteAppState.nameBookmarks) ? remoteAppState.nameBookmarks : [];
  const localNameBookmarks = Array.isArray(localAppState.nameBookmarks) ? localAppState.nameBookmarks : [];

  const bmMap = new Map<string, Bookmark>();
  for (const b of [...remoteBookmarks, ...localBookmarks]) {
    const key = `${b.surah}:${b.ayah}`;
    if (!bmMap.has(key) || b.createdAt > bmMap.get(key)!.createdAt) bmMap.set(key, b);
  }
  const removedBookmarks = { ...(remoteAppState.removedBookmarks ?? {}) };
  for (const [key, date] of Object.entries(localAppState.removedBookmarks ?? {})) {
    if (!removedBookmarks[key] || date > removedBookmarks[key]) removedBookmarks[key] = date;
  }
  for (const [key, b] of bmMap) {
    if (removedBookmarks[key] && removedBookmarks[key] >= b.createdAt) bmMap.delete(key);
  }

  // 99 Names favorites use the same account-first merge semantics as Quran bookmarks.
  const nameBmMap = new Map<string, NameBookmark>();
  for (const b of [...remoteNameBookmarks, ...localNameBookmarks]) {
    const key = String(b.nameNumber);
    if (!nameBmMap.has(key) || b.createdAt > nameBmMap.get(key)!.createdAt) nameBmMap.set(key, b);
  }
  const removedNameBookmarks = { ...(remoteAppState.removedNameBookmarks ?? {}) };
  for (const [key, date] of Object.entries(localAppState.removedNameBookmarks ?? {})) {
    if (!removedNameBookmarks[key] || date > removedNameBookmarks[key]) removedNameBookmarks[key] = date;
  }
  for (const [key, b] of nameBmMap) {
    if (removedNameBookmarks[key] && removedNameBookmarks[key] >= b.createdAt) nameBmMap.delete(key);
  }

  // Adhkar progress: if same day, take max per dhikr; else newer wins.
  let mergedAdhkar = explicit.adhkarProgress;
  if (local.adhkarProgress.date === remote.adhkarProgress.date) {
    const counts: Record<string, number> = { ...remote.adhkarProgress.counts };
    for (const [k, v] of Object.entries(local.adhkarProgress.counts)) {
      counts[k] = Math.max(v, counts[k] ?? 0);
    }
    mergedAdhkar = { date: local.adhkarProgress.date, counts };
  }

  return withProgress({
    ...explicit,
    settings,
    settingsUpdatedAt,
    fullName: profileValues.fullName,
    username: profileValues.username,
    photoURL: profileValues.photoURL,
    profile: { bio: profileValues.bio },
    profileUpdatedAt,
    profileFieldUpdatedAt,
    schemaVersion: SCHEMA_VERSION,
    progressBase: maxProgress(remote.progressBase, local.progressBase),
    deviceProgress,
    history: mergedHistory,
    totalHasanaat: Math.max(local.totalHasanaat, remote.totalHasanaat),
    completedReads: Math.max(local.completedReads, remote.completedReads),
    totalSeconds: Math.max(local.totalSeconds, remote.totalSeconds),
    adhkarProgress: mergedAdhkar,
    appState: {
      bookmarks: Array.from(bmMap.values()),
      nameBookmarks: Array.from(nameBmMap.values()),
      removedBookmarks,
      removedNameBookmarks,
    },
    revision: Math.max(local.revision, remote.revision),
    updatedAt: explicit.updatedAt,
  });
}

// Merge guest progress into a signed-in account (one-time on sign-in).
export function absorbGuest(account: Account, guest: Account | null): Account {
  if (!guest) return account;
  // Namespace the entire guest session once, so another guest session on this
  // installation cannot collide with the signed-in device's counter.
  const guestProgress: Progress = { history: guest.history, totalHasanaat: guest.totalHasanaat, completedReads: guest.completedReads, totalSeconds: guest.totalSeconds };
  const imported = mergeAccounts(account, { ...guest, uid: account.uid,
    progressBase: emptyProgress(),
    deviceProgress: { [`guest_${guest.updatedAt.replace(/[^0-9]/g, "")}`]: guestProgress },
  });
  return { ...imported, uid: account.uid, email: account.email, fullName: account.fullName, username: account.username, photoURL: account.photoURL, profile: account.profile, profileUpdatedAt: account.profileUpdatedAt, profileFieldUpdatedAt: account.profileFieldUpdatedAt, settings: account.settings, settingsUpdatedAt: account.settingsUpdatedAt };
}
