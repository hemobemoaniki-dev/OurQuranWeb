// Local Reader session clock. Survives reloads, resets at local midnight, runs
// only while the Reader is active, and never syncs to Firebase.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { readingSecondsBetween } from "@/src/lib/reading-clock";
import { dateKey } from "@/src/lib/dates";
import { storage } from "@/src/utils/storage";
import { useAuth } from "@/src/context/AppState";

type SessionApi = {
  seconds: number; // today's accumulated reading seconds
  running: boolean;
  start: () => void;
  drain: () => Record<string, number>;
  stop: () => Record<string, number>; // seconds by local date since last start
};

const SessionContext = createContext<SessionApi | null>(null);
const SessionControlsContext = createContext<Pick<SessionApi, "start" | "stop" | "drain"> | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const owner = user?.uid ?? "guest";
  return <SessionClock key={owner} owner={owner}>{children}</SessionClock>;
}

function SessionClock({ children, owner }: { children: React.ReactNode; owner: string }) {
  const key = `session_clock_v2_${owner}`;
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const deltaRef = useRef<Record<string, number>>({});
  const secondsRef = useRef(0);
  const lastTick = useRef<number | null>(null);
  const dayRef = useRef(dateKey(new Date()));

  // Load persisted clock (reset if it belongs to a previous day).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await storage.getItem<any>(key, null);
      if (cancelled || interval.current) return;
      const value = saved && saved.date === dateKey(new Date()) ? saved.seconds : 0;
      secondsRef.current = value;
      setSeconds(value);
    })();
    return () => { cancelled = true; };
  }, [key]);

  const persist = useCallback((s: number) => {
    storage.setItem<any>(key, { date: dateKey(new Date()), seconds: s });
  }, [key]);

  const tick = useCallback(() => {
    const now = Date.now();
    if (lastTick.current === null) return;
    if (now < lastTick.current) { lastTick.current = now; return; }
    const deltas = readingSecondsBetween(lastTick.current, now);
    const elapsed = Object.values(deltas).reduce((n, value) => n + value, 0);
    lastTick.current += elapsed * 1000;
    const today = dateKey(new Date(now));
    if (today !== dayRef.current) { dayRef.current = today; secondsRef.current = 0; }
    secondsRef.current += deltas[today] ?? 0;
    for (const [day, count] of Object.entries(deltas)) deltaRef.current[day] = (deltaRef.current[day] ?? 0) + count;
    setSeconds(secondsRef.current);
    if (elapsed > 0 && secondsRef.current % 10 === 0) persist(secondsRef.current);
  }, [persist]);

  const start = useCallback(() => {
    if (interval.current) return;
    lastTick.current = Date.now();
    setRunning(true);
    interval.current = setInterval(tick, 1000);
  }, [tick]);

  const drain = useCallback(() => {
    tick();
    const deltas = deltaRef.current;
    deltaRef.current = {};
    return deltas;
  }, [tick]);
  const stop = useCallback(() => {
    tick();
    lastTick.current = null;
    if (interval.current) {
      clearInterval(interval.current);
      interval.current = null;
    }
    setRunning(false);
    persist(secondsRef.current);
    const d = deltaRef.current;
    deltaRef.current = {};
    return d;
  }, [persist, tick]);

  // Pause when app is backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && interval.current) {
        tick();
        lastTick.current = null;
        clearInterval(interval.current);
        interval.current = null;
        setRunning(false);
        persist(secondsRef.current);
      }
    });
    return () => sub.remove();
  }, [persist, tick]);

  useEffect(() => {
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, []);

  const controls = useMemo(() => ({ start, stop, drain }), [start, stop, drain]);
  return (
    <SessionControlsContext.Provider value={controls}>
    <SessionContext.Provider value={{ seconds, running, start, stop, drain }}>
      {children}
    </SessionContext.Provider>
    </SessionControlsContext.Provider>
  );
}

export function useSessionControls() {
  const ctx = useContext(SessionControlsContext);
  if (!ctx) throw new Error("useSessionControls must be used within SessionProvider");
  return ctx;
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
