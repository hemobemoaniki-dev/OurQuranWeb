import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  reauthenticateWithCredential,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  type User,
} from "firebase/auth";
import { doc, runTransaction } from "firebase/firestore";

import { createAccountWriter } from "@/src/lib/account-writer";
import { createSyncQueue } from "@/src/lib/sync-queue";
import { auth, db } from "@/src/lib/firebase";
import {
  Account,
  Bookmark,
  absorbGuest,
  addProgress,
  defaultAccount,
  fromRemote,
  mergeAccounts,
  normalizeSettings,
} from "@/src/lib/account";
import { todayKey } from "@/src/lib/dates";
import { queueCrownCelebrationIfEarned } from "@/src/lib/streak-crown";
import { storage } from "@/src/utils/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SyncStatus = "synced" | "syncing" | "offline" | "error";

type AuthApi = {
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
};

type AccountApi = {
  account: Account;
  hydrated: boolean;
  isGuest: boolean;
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  saveReaderPosition: (surah: number, ayah: number) => void;
  commitReward: (surah: number, ayah: number, reward: number) => void;
  addReadingSeconds: (seconds: number, day?: string) => void;
  setAdhkarCount: (dhikrId: string, value: number | ((current: number) => number)) => void;
  resetAdhkarIfNewDay: () => void;
  setTasbeeh: (partial: Partial<Account["tasbeeh"]> | ((current: Account["tasbeeh"]) => Partial<Account["tasbeeh"]>)) => void;
  updateSettings: (partial: Partial<Account["settings"]>) => void;
  updateProfile: (fields: {
    fullName?: string;
    username?: string;
    bio?: string;
    photoURL?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  toggleBookmark: (surah: number, ayah: number) => void;
  isBookmarked: (surah: number, ayah: number) => boolean;
  toggleNameBookmark: (nameNumber: number) => void;
  isNameBookmarked: (nameNumber: number) => boolean;
  resetLocalData: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<{ ok: boolean; error?: string }>;
  flush: () => Promise<void>;
  syncNow: () => Promise<boolean>;
};

const AuthContext = createContext<AuthApi | null>(null);
const AccountContext = createContext<AccountApi | null>(null);

type ReaderApi = Pick<AccountApi, "hydrated" | "saveReaderPosition" | "commitReward" | "addReadingSeconds" | "updateSettings" | "toggleBookmark" | "isBookmarked" | "flush"> & {
  account: Pick<Account, "currentSurah" | "currentAyah"> & { settings: Pick<Account["settings"], "reciter" | "speed" | "autoplay" | "readerTheme" | "readingSize"> };
};
const ReaderContext = createContext<ReaderApi | null>(null);

const GUEST_KEY = "guest_account_v2";
const GUEST_PREFS_KEY = "guest_preferences_v1";
const accountKey = (uid: string) => `account_v1_${uid}`;

function strip<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Firestore's web/RN one-shot document read can be implemented with a temporary Watch
// ("Listen") stream. On React Native that WebChannel stream can throw repeated
// transport warnings. A read-only transaction uses the normal transaction RPC
// instead, so one-shot sync reads do not open a Listen stream.
async function readRemoteAccount(uid: string): Promise<Account | null> {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(doc(db, "users", uid));
    return snap.exists() ? fromRemote(uid, snap.data()) : null;
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [registering, setRegistering] = useState(false);

  const [account, setAccountState] = useState<Account>(() => defaultAccount());
  const [hydrated, setHydrated] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const accountRef = useRef(account);
  const userRef = useRef(user);
  const guestCarryRef = useRef<Account | null>(null);
  const readyRef = useRef(false);
  const deviceRef = useRef("");
  const setAccount = useCallback((value: Account | ((a: Account) => Account)) => {
    const next = typeof value === "function" ? value(accountRef.current) : value;
    accountRef.current = next;
    setAccountState(next);
  }, []);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncVersion = useRef(0);
  const pendingSync = useRef(false);
  const authGeneration = useRef(0);
  const syncQueue = useRef(createSyncQueue());

  const accountWriter = useRef(createAccountWriter<Account>((key, value) => storage.setItem<any>(key, value)));

  // --- persistence ---------------------------------------------------------
  const persist = useCallback((a: Account) => {
    if (!a.uid) {
      // Anonymous reading activity is session-only. Only personalization stays local.
      void storage.setItem<any>(GUEST_PREFS_KEY, { settings: a.settings });
      return;
    }
    void accountWriter.current(accountKey(a.uid), a);
  }, []);

  // --- firestore push (transaction merge) ----------------------------------
  const pushNow = useCallback(() => syncQueue.current(async () => {
    const u = userRef.current;
    const local = accountRef.current;
    if (!u || local.uid !== u.uid || !readyRef.current || !pendingSync.current) return true;
    const version = syncVersion.current;
    const generation = authGeneration.current;
    setSyncStatus("syncing");
    try {
      let saved = local;
      await runTransaction(db, async (tx) => {
        const ref = doc(db, "users", u.uid);
        const snap = await tx.get(ref);
        const remote = snap.exists() ? fromRemote(u.uid, snap.data()) : null;
        const merged = mergeAccounts(remote, local);
        saved = merged;
        tx.set(ref, strip(merged));
      });
      if (userRef.current?.uid !== u.uid || generation !== authGeneration.current) return false;
      setAccount((a) => {
        if (a.uid !== u.uid) return a;
        const next = mergeAccounts(saved, a);
        persist(next);
        return next;
      });
      if (version === syncVersion.current) pendingSync.current = false;
      setSyncStatus(pendingSync.current ? "syncing" : "synced");
      setLastSyncAt(new Date().toISOString());
      return !pendingSync.current;
    } catch (e: any) {
      if (userRef.current?.uid !== u.uid || generation !== authGeneration.current) return false;
      console.log("[sync] push failed", e?.code ?? "unknown");
      setSyncStatus(["unavailable", "deadline-exceeded"].includes(e?.code) ? "offline" : "error");
      return false;
    }
  }), [persist, setAccount]);

  const scheduleSync = useCallback(() => {
    if (!userRef.current) return;
    syncVersion.current += 1;
    pendingSync.current = true;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    setSyncStatus("syncing");
    syncTimer.current = setTimeout(() => {
      syncTimer.current = null;
      pushNow();
    }, 1200);
  }, [pushNow]);

  const flush = useCallback(async () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = null;
    await pushNow();
  }, [pushNow]);

  const syncNow = useCallback(async () => {
    const u = userRef.current;
    if (!u || !readyRef.current || accountRef.current.uid !== u.uid) return false;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = null;

    const pushed = await pushNow();
    if (!pushed && pendingSync.current) return false;

    try {
      const remote = await readRemoteAccount(u.uid);
      if (userRef.current?.uid !== u.uid) return false;
      if (!remote) {
        // A signed-in user without a document is not "synced". Recreate the
        // document from the local canonical account and confirm that write.
        syncVersion.current += 1;
        pendingSync.current = true;
        const created = await pushNow();
        return !!created && !pendingSync.current;
      }
      setAccount((local) => {
        if (local.uid !== u.uid) return local;
        const merged = mergeAccounts(remote, local);
        persist(merged);
        return merged;
      });
      setSyncStatus("synced");
      setLastSyncAt(new Date().toISOString());
      return true;
    } catch (e: any) {
      if (userRef.current?.uid === u.uid) {
        setSyncStatus(["unavailable", "deadline-exceeded"].includes(e?.code) ? "offline" : "error");
      }
      return false;
    }
  }, [persist, pushNow, setAccount]);

  // --- local-first mutation ------------------------------------------------
  const applyMutation = useCallback(
    (updater: (a: Account) => Account) => {
      if (!readyRef.current || accountRef.current.uid !== (userRef.current?.uid ?? "")) return;
      const prev = accountRef.current;
      const updated = updater(prev);
      if (updated === prev) return;
      const next = { ...updated, updatedAt: new Date().toISOString() };
      setAccount(next);
      persist(next);
      scheduleSync();
    },
    [persist, scheduleSync, setAccount],
  );

  // --- auth listener -------------------------------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      const previousUser = userRef.current;
      if (u && !previousUser && !accountRef.current.uid) {
        guestCarryRef.current = accountRef.current;
      } else if (!u) {
        guestCarryRef.current = null;
      }
      authGeneration.current += 1;
      readyRef.current = false;
      pendingSync.current = false;
      syncVersion.current += 1;
      userRef.current = u;
      if (syncTimer.current) clearTimeout(syncTimer.current);
      setHydrated(false);
      setAccount(defaultAccount({ uid: u?.uid ?? "" }));
      setUser(u);
      setIsGuest(!u);
      setLastSyncAt(null);
      setSyncStatus(u ? "syncing" : "synced");
      setInitializing(false);
    });
    return unsub;
  }, [setAccount]);

  // --- hydration on user change -------------------------------------------
  useEffect(() => {
    if (initializing || registering) return;
    let cancelled = false;
    (async () => {
      setHydrated(false);
      const existingDevice = await storage.getItem<string>("sync_device_v1", "");
      if (cancelled) return;
      deviceRef.current = existingDevice || `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      if (!existingDevice) await storage.setItem("sync_device_v1", deviceRef.current);
      if (cancelled) return;
      if (!user) {
        // Guest reading activity never survives a refresh. Purge legacy guest
        // progress while keeping harmless local preferences.
        const guestPrefs = await storage.getItem<any>(GUEST_PREFS_KEY, null);
        await Promise.all([
          storage.removeItem(GUEST_KEY),
          storage.removeItem("guest_account_v1"),
          storage.removeItem("guest_v2_migrated"),
          storage.removeItem("session_clock_v1"),
          storage.removeItem("session_clock_v2_guest"),
        ]);
        if (cancelled) return;
        const guestAccount = defaultAccount();
        if (guestPrefs?.settings) guestAccount.settings = normalizeSettings(guestPrefs.settings);
        setAccount(guestAccount);
        setIsGuest(true);
        setSyncStatus("synced");
        readyRef.current = true;
        setHydrated(true);
        return;
      }
      setIsGuest(false);
      // 1) instant local cache
      const cached = await storage.getItem<any>(accountKey(user.uid), null);
      if (cancelled) return;
      let localAcc = cached
        ? fromRemote(user.uid, cached)
        : defaultAccount({
            uid: user.uid,
            email: user.email ?? "",
            fullName: user.displayName?.trim() ?? "",
          });
      // 2) one-time in-memory guest carry-over. Signing in without
      // reloading keeps the reading just completed in this live session.
      const guest = guestCarryRef.current;
      guestCarryRef.current = null;
      const hadGuest = !!guest && !guest.uid && (
        guest.totalHasanaat > 0 ||
        guest.completedReads > 0 ||
        guest.totalSeconds > 0 ||
        Object.keys(guest.history).length > 0 ||
        guest.currentSurah !== 1 ||
        guest.currentAyah !== 1 ||
        guest.appState.bookmarks.length > 0 ||
        guest.appState.nameBookmarks.length > 0
      );
      if (hadGuest && guest) localAcc = absorbGuest(localAcc, guest);
      if (cancelled) return;
      setAccount(localAcc);
      await accountWriter.current(accountKey(user.uid), localAcc);
      if (cancelled) return;
      // Offline reading must not wait for a Firestore network response.
      readyRef.current = true;
      setHydrated(true);
      scheduleSync();
      // 3) reconcile with cloud
      try {
        const remote = await readRemoteAccount(user.uid);
        if (cancelled) return;
        if (remote) {
          // Fresh device with no local changes: adopt cloud as-is (never let a
          // fresh default overwrite the real cloud reading position/profile).
          // Only run the merge when we actually have local changes to reconcile.
          const hasLocalChanges = !!cached || hadGuest || pendingSync.current;
          const merged = hasLocalChanges ? mergeAccounts(remote, accountRef.current) : remote;
          if (!cancelled) {
            setAccount(merged);
            persist(merged);
          }
          if (hasLocalChanges) {
            scheduleSync();
          }
        } else {
          // brand-new signed-in user with no doc yet: create it (registration write)
          scheduleSync();
        }
        if (!cancelled) setSyncStatus(pendingSync.current ? "syncing" : "synced");
      } catch (e) {
        console.log("[hydrate] cloud reconcile failed", e);
        if (!cancelled) setSyncStatus("offline");
      }
      if (!cancelled) {
        readyRef.current = true;
        setHydrated(true);
        scheduleSync();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, initializing, registering]);

  // Pull on foreground instead of keeping a WebChannel Listen stream alive.
  // Firestore's RN streaming transport is the source of repeated transport
  // warnings and can monopolize the bridge while the reader is changing Ayahs.
  useEffect(() => {
    if (!hydrated || !user) return;
    const uid = user.uid;
    let pulling = false;
    const pull = async () => {
      if (pulling || !readyRef.current || userRef.current?.uid !== uid) return;
      pulling = true;
      try {
        const pushed = await pushNow();
        if (!pushed && pendingSync.current) return;
        const remote = await readRemoteAccount(uid);
        if (!remote || userRef.current?.uid !== uid) return;
        setAccount((local) => {
          const merged = mergeAccounts(remote, local);
          persist(merged);
          return merged;
        });
        setSyncStatus("synced");
        setLastSyncAt(new Date().toISOString());
      } catch { if (userRef.current?.uid === uid) setSyncStatus("offline"); }
      finally { pulling = false; }
    };
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") void pull(); });
    // Authenticated cross-device refresh without a long-lived Firestore Listen
    // stream. Only poll while the app is actually active.
    const refresh = setInterval(() => {
      if (AppState.currentState === "active") void pull();
    }, 15000);
    return () => { sub.remove(); clearInterval(refresh); };
  }, [hydrated, user, persist, pushNow, setAccount]);

  // ---------------------------------------------------------------------------
  // Auth API
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const refreshDay = () => {
      const day = todayKey();
      if (!readyRef.current || accountRef.current.todayKey === day) return;
      setAccount((a) => {
        const next = { ...a, todayKey: day, todayStats: a.history[day] ?? { hasanaat: 0, ayat: 0 },
          adhkarProgress: a.adhkarProgress.date === day ? a.adhkarProgress : { date: day, counts: {} } };
        persist(next);
        return next;
      });
    };
    const timer = setInterval(refreshDay, 30000);
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") refreshDay(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [persist, setAccount]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS !== "web") {
      const error = new Error("Native Google sign-in is not configured yet.") as Error & { code?: string };
      error.code = "auth/operation-not-supported-in-this-environment";
      throw error;
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, username: string) => {
      const uname = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(uname)) throw new Error("invalid-username");
      setRegistering(true);
      try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      // reserve username + create the account document atomically
      try {
        await runTransaction(db, async (tx) => {
        if (uname) {
          const unameRef = doc(db, "usernames", uname);
          const unameSnap = await tx.get(unameRef);
          if (unameSnap.exists() && unameSnap.data()?.uid && unameSnap.data()?.uid !== uid) {
            throw new Error("username-taken");
          }
          tx.set(unameRef, { uid });
        }
        const acc = defaultAccount({
          uid,
          email: email.trim(),
          fullName: fullName.trim(),
          profileUpdatedAt: new Date().toISOString(),
          username: uname,
          revision: 1,
          updatedAt: new Date().toISOString(),
        });
        tx.set(doc(db, "users", uid), strip(acc));
        });
      } catch (error) {
        // Roll back only the brand-new Auth identity from this failed signup.
        // Existing accounts never enter this path.
        await deleteUser(cred.user).catch(() => fbSignOut(auth));
        throw error;
      }
      try {
        await fbUpdateProfile(cred.user, { displayName: fullName.trim() });
      } catch {}
      } finally {
        setRegistering(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    // Preserve pending work under this UID even if offline sign-out cannot
    // finish a cloud transaction. Do not strand the user waiting on network.
    const local = accountRef.current;
    if (local.uid) await accountWriter.current(accountKey(local.uid), local);
    await Promise.race([pushNow(), new Promise<void>((resolve) => setTimeout(resolve, 3000))]);

    // Keep only personalization after sign-out. Anonymous progress resets.
    guestCarryRef.current = null;
    await storage.setItem<any>(GUEST_PREFS_KEY, { settings: local.settings });
    await storage.removeItem(GUEST_KEY);
    await storage.removeItem("guest_v2_migrated");
    await storage.removeItem("guest_account_v1");
    await storage.removeItem("session_clock_v1");
    await storage.removeItem("session_clock_v2_guest");

    await fbSignOut(auth);
  }, [pushNow]);

  // ---------------------------------------------------------------------------
  // Account API
  // ---------------------------------------------------------------------------
  const saveReaderPosition = useCallback(
    (surah: number, ayah: number) => {
      applyMutation((a) => ({ ...a, currentSurah: surah, currentAyah: ayah }));
    },
    [applyMutation],
  );

  const commitReward = useCallback(
    (surah: number, ayah: number, reward: number) => {
      applyMutation((a) => {
        const progressed = addProgress(a, deviceRef.current, { hasanaat: reward, ayat: 1 });
        queueCrownCelebrationIfEarned(a.history, progressed.history, a.uid || "guest");
        return {
          ...progressed,
          currentSurah: surah,
          currentAyah: ayah,
        };
      });
    },
    [applyMutation],
  );

  const addReadingSeconds = useCallback(
    (seconds: number, day?: string) => {
      if (seconds <= 0) return;
      applyMutation((a) => {
        const progressed = addProgress(a, deviceRef.current, { hasanaat: 0, ayat: 0, seconds }, day);
        queueCrownCelebrationIfEarned(a.history, progressed.history, a.uid || "guest");
        return progressed;
      });
    },
    [applyMutation],
  );

  const setAdhkarCount = useCallback(
    (dhikrId: string, value: number | ((current: number) => number)) => {
      applyMutation((a) => {
        const key = todayKey();
        const base = a.adhkarProgress.date === key ? a.adhkarProgress.counts : {};
        return {
          ...a,
          adhkarProgress: { date: key, counts: { ...base, [dhikrId]: typeof value === "function" ? value(base[dhikrId] ?? 0) : value } },
        };
      });
    },
    [applyMutation],
  );

  const resetAdhkarIfNewDay = useCallback(() => {
    const key = todayKey();
    if (accountRef.current.adhkarProgress.date !== key) {
      applyMutation((a) => ({ ...a, adhkarProgress: { date: key, counts: {} } }));
    }
  }, [applyMutation]);

  const setTasbeeh = useCallback(
    (partial: Partial<Account["tasbeeh"]> | ((current: Account["tasbeeh"]) => Partial<Account["tasbeeh"]>)) => {
      applyMutation((a) => ({ ...a, tasbeeh: { ...a.tasbeeh, ...(typeof partial === "function" ? partial(a.tasbeeh) : partial) } }));
    },
    [applyMutation],
  );

  const updateSettings = useCallback(
    (partial: Partial<Account["settings"]>) => {
      applyMutation((a) => {
        const changedKeys = (Object.keys(partial) as (keyof Account["settings"])[]).filter((key) => {
          const current = a.settings[key];
          const next = partial[key];
          if (typeof current === "object" && current && typeof next === "object" && next) {
            return JSON.stringify(current) !== JSON.stringify(next);
          }
          return !Object.is(current, next);
        });
        if (!changedKeys.length) return a;
        const now = new Date().toISOString();
        return {
          ...a,
          settings: { ...a.settings, ...partial },
          settingsUpdatedAt: {
            ...a.settingsUpdatedAt,
            ...Object.fromEntries(changedKeys.map((key) => [key, now])),
          },
        };
      });
    },
    [applyMutation],
  );

  const updateProfile = useCallback(
    async (fields: { fullName?: string; username?: string; bio?: string; photoURL?: string }) => {
      const u = userRef.current;
      const current = accountRef.current;
      const newUname = fields.username?.trim().toLowerCase();
      if (!u || !readyRef.current || current.uid !== u.uid) return { ok: false, error: "Sign in and wait for your account to load." };
      if (newUname !== undefined && !/^[a-z0-9_]{3,24}$/.test(newUname)) return { ok: false, error: "Use 3–24 letters, numbers, or underscores for your username." };
      if (fields.fullName !== undefined && !fields.fullName.trim()) return { ok: false, error: "Enter a display name." };
      try {
        if (u && newUname && newUname !== current.username) {
          await runTransaction(db, async (tx) => {
            const ref = doc(db, "usernames", newUname);
            const snap = await tx.get(ref);
            if (snap.exists() && snap.data()?.uid && snap.data()?.uid !== u.uid) {
              throw new Error("username-taken");
            }
            const oldRef = current.username ? doc(db, "usernames", current.username) : null;
            const oldSnap = oldRef ? await tx.get(oldRef) : null;
            tx.set(ref, { uid: u.uid });
            // Deployed rules allow the owner to delete, not transfer to null.
            // Missing or stale reservations must not block a profile edit.
            if (oldRef && oldSnap?.exists() && oldSnap.data()?.uid === u.uid) tx.delete(oldRef);
          });
        }
        if (userRef.current?.uid !== u.uid) return { ok: false, error: "Your account changed. Please sign in again." };
        applyMutation((a) => {
          const now = new Date().toISOString();
          const nextFullName = fields.fullName?.trim() ?? a.fullName;
          const nextUsername = newUname ?? a.username;
          const nextPhotoURL = fields.photoURL ?? a.photoURL;
          const nextBio = fields.bio ?? a.profile.bio;
          const profileFieldUpdatedAt = { ...a.profileFieldUpdatedAt };
          let changed = false;
          if (nextFullName !== a.fullName) { profileFieldUpdatedAt.fullName = now; changed = true; }
          if (nextUsername !== a.username) { profileFieldUpdatedAt.username = now; changed = true; }
          if (nextPhotoURL !== a.photoURL) { profileFieldUpdatedAt.photoURL = now; changed = true; }
          if (nextBio !== a.profile.bio) { profileFieldUpdatedAt.bio = now; changed = true; }
          if (!changed) return a;
          return {
            ...a,
            fullName: nextFullName,
            username: nextUsername,
            photoURL: nextPhotoURL,
            profile: { ...a.profile, bio: nextBio },
            profileUpdatedAt: now,
            profileFieldUpdatedAt,
          };
        });
        return { ok: true };
      } catch (e: any) {
        if (e?.message === "username-taken") return { ok: false, error: "That username is already taken." };
        return { ok: false, error: "Could not save profile. Check your connection and try again." };
      }
    },
    [applyMutation],
  );

  const toggleBookmark = useCallback(
    (surah: number, ayah: number) => {
      applyMutation((a) => {
        const exists = a.appState.bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
        const bookmarks = exists
          ? a.appState.bookmarks.filter((b) => !(b.surah === surah && b.ayah === ayah))
          : [...a.appState.bookmarks, { surah, ayah, createdAt: new Date().toISOString() } as Bookmark];
        const removedBookmarks = { ...a.appState.removedBookmarks };
        if (exists) removedBookmarks[`${surah}:${ayah}`] = new Date().toISOString();
        return { ...a, appState: { ...a.appState, bookmarks, removedBookmarks } };
      });
    },
    [applyMutation],
  );

  const isBookmarked = useCallback(
    (surah: number, ayah: number) => accountRef.current.appState.bookmarks.some((b) => b.surah === surah && b.ayah === ayah),
    [],
  );

  const toggleNameBookmark = useCallback(
    (nameNumber: number) => {
      if (!Number.isInteger(nameNumber) || nameNumber < 1 || nameNumber > 99) return;
      applyMutation((a) => {
        const exists = a.appState.nameBookmarks.some((b) => b.nameNumber === nameNumber);
        const nameBookmarks = exists
          ? a.appState.nameBookmarks.filter((b) => b.nameNumber !== nameNumber)
          : [...a.appState.nameBookmarks, { nameNumber, createdAt: new Date().toISOString() }];
        const removedNameBookmarks = { ...a.appState.removedNameBookmarks };
        if (exists) removedNameBookmarks[String(nameNumber)] = new Date().toISOString();
        return { ...a, appState: { ...a.appState, nameBookmarks, removedNameBookmarks } };
      });
    },
    [applyMutation],
  );

  const isNameBookmarked = useCallback(
    (nameNumber: number) => accountRef.current.appState.nameBookmarks.some((b) => b.nameNumber === nameNumber),
    [],
  );

  const deleteAccount = useCallback(async (password?: string) => {
    const u = userRef.current;
    const current = accountRef.current;
    if (!u || !readyRef.current || current.uid !== u.uid) {
      return { ok: false, error: "Sign in and wait for your account to load." };
    }

    const passwordProvider = u.providerData.some((provider) => provider.providerId === "password");
    if (passwordProvider) {
      if (!u.email || !password) return { ok: false, error: "Enter your current password." };
      try {
        await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
      } catch (e: any) {
        const code = e?.code ?? "";
        if (code.includes("invalid-credential") || code.includes("wrong-password")) {
          return { ok: false, error: "Current password is incorrect." };
        }
        if (code.includes("too-many-requests")) {
          return { ok: false, error: "Too many attempts. Wait a moment and try again." };
        }
        return { ok: false, error: "Could not verify your identity. Check your connection and try again." };
      }
    }

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = null;
    pendingSync.current = false;
    readyRef.current = false;

    try {
      // Delete the cloud account document and the username reservation while
      // Firebase Auth is still valid. All synced OurQuran account data lives
      // in users/{uid}; bookmarks, progress, settings and profile are fields
      // of that document.
      await runTransaction(db, async (tx) => {
        if (current.username) {
          const unameRef = doc(db, "usernames", current.username);
          const unameSnap = await tx.get(unameRef);
          if (unameSnap.exists() && unameSnap.data()?.uid === u.uid) tx.delete(unameRef);
        }
        tx.delete(doc(db, "users", u.uid));
      });

      await deleteUser(u);

      await storage.removeItem(accountKey(u.uid));
      await storage.removeItem(`session_clock_v2_${u.uid}`);
      await storage.removeItem("session_clock_v1");
      await storage.removeItem(GUEST_KEY);
      await storage.removeItem(GUEST_PREFS_KEY);
      await storage.removeItem("guest_v2_migrated");
      await storage.removeItem("guest_account_v1");
      await storage.removeItem("session_clock_v2_guest");

      return { ok: true };
    } catch (e: any) {
      // Keep the UI usable if the network fails. If Firestore deletion
      // succeeded but Auth deletion did not, retrying this flow is safe.
      readyRef.current = true;
      const code = e?.code ?? "";
      if (code.includes("requires-recent-login")) {
        return { ok: false, error: "Please sign in again, then retry account deletion." };
      }
      if (["unavailable", "deadline-exceeded", "network-request-failed"].some((part) => code.includes(part))) {
        return { ok: false, error: "Account deletion could not finish while offline. Reconnect and try again." };
      }
      return { ok: false, error: "Could not delete your account. Please try again." };
    }
  }, []);

  const resetLocalData = useCallback(async () => {
    const u = userRef.current;
    // Invalidate in-flight completions before clearing the local account.
    authGeneration.current += 1;
    readyRef.current = false;
    pendingSync.current = false;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    guestCarryRef.current = null;
    await storage.removeItem(GUEST_KEY);
    await storage.removeItem(GUEST_PREFS_KEY);
    await storage.removeItem("guest_v2_migrated");
    await storage.removeItem("guest_account_v1");
    await storage.removeItem("session_clock_v1");
    await storage.removeItem("session_clock_v2_guest");
    if (u) await storage.removeItem(`session_clock_v2_${u.uid}`);
    try { await fbSignOut(auth); }
    catch (error) { readyRef.current = true; throw error; }
    if (u) await storage.removeItem(accountKey(u.uid));
  }, []);

  const authApi = useMemo<AuthApi>(
    () => ({ user, initializing, signIn, signInWithGoogle, signUp, signOut }),
    [user, initializing, signIn, signInWithGoogle, signUp, signOut],
  );

  const accountApi = useMemo<AccountApi>(
    () => ({
      account,
      hydrated,
      isGuest,
      syncStatus,
      lastSyncAt,
      saveReaderPosition,
      commitReward,
      addReadingSeconds,
      setAdhkarCount,
      resetAdhkarIfNewDay,
      setTasbeeh,
      updateSettings,
      updateProfile,
      toggleBookmark,
      isBookmarked,
      toggleNameBookmark,
      isNameBookmarked,
      resetLocalData,
      deleteAccount,
      flush,
      syncNow,
    }),
    [
      account,
      hydrated,
      isGuest,
      syncStatus,
      lastSyncAt,
      saveReaderPosition,
      commitReward,
      addReadingSeconds,
      setAdhkarCount,
      resetAdhkarIfNewDay,
      setTasbeeh,
      updateSettings,
      updateProfile,
      toggleBookmark,
      isBookmarked,
      toggleNameBookmark,
      isNameBookmarked,
      resetLocalData,
      deleteAccount,
      flush,
      syncNow,
    ],
  );

  // Cloud status and reward counters do not need to redraw the Arabic reader.
  const bookmarkSignature = account.appState.bookmarks.map((b) => `${b.surah}:${b.ayah}`).sort().join(",");
  const readerAccount = useMemo(() => ({ currentSurah: account.currentSurah, currentAyah: account.currentAyah,
    settings: { readerTheme: account.settings.readerTheme, readingSize: account.settings.readingSize, reciter: account.settings.reciter, speed: account.settings.speed, autoplay: account.settings.autoplay },
  }), [account.currentSurah, account.currentAyah, account.settings.readerTheme, account.settings.readingSize, account.settings.reciter, account.settings.speed, account.settings.autoplay]);
  const readerApi = useMemo<ReaderApi>(() => ({ account: readerAccount, hydrated, saveReaderPosition, commitReward,
    addReadingSeconds, updateSettings, toggleBookmark, isBookmarked, flush,
    // Signature invalidates bookmark consumers only when membership changes.
    bookmarkSignature,
  }), [readerAccount, hydrated, saveReaderPosition, commitReward, addReadingSeconds, updateSettings, toggleBookmark, isBookmarked, flush, bookmarkSignature]);

  // Flush pending sync when app is backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      // Do not start a second network operation when returning to foreground;
      // the foreground pull above already handles reconciliation.
      if (state !== "active") flush().catch(() => {});
    });
    return () => sub.remove();
  }, [flush]);

  return (
    <AuthContext.Provider value={authApi}>
      <AccountContext.Provider value={accountApi}><ReaderContext.Provider value={readerApi}>{children}</ReaderContext.Provider></AccountContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AppProviders");
  return ctx;
}

export function useAccount(): AccountApi {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AppProviders");
  return ctx;
}

export function useReaderAccount(): ReaderApi {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error("useReaderAccount must be used within AppProviders");
  return ctx;
}
