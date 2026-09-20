// One app-wide recitation controller. Text navigation never waits for this
// module; audio is an independent, cancelable side effect.
import {
  createAudioPlayer,
  preload,
  clearPreloadedSource,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from "expo-audio";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { getCachedAyahUri, queueAyahAudio, warmAudioNeighborhood } from "@/src/lib/audio-cache";
import { recitationFallbackUrl, recitationUrl } from "@/src/data/reciters";
import { surahMeta } from "@/src/data/surahs";

type AudioSnapshot = {
  isPlaying: boolean;
  isLoading: boolean;
  error: boolean;
  key: string | null;
};

type PendingLoad = {
  request: number;
  settle: (loaded: boolean) => void;
};

let snapshot: AudioSnapshot = { isPlaying: false, isLoading: false, error: false, key: null };
let audioModeReady: Promise<void> | null = null;
let player: AudioPlayer | null = null;
let statusSubscription: { remove: () => void } | null = null;
let pendingLoad: PendingLoad | null = null;
let requestId = 0;
let wantsPlayback = false;
let audioSessionActive = false;
let activeTarget: { reciterId: string; surah: number; ayah: number } | null = null;

// Keep at most one speculative Expo preload active. The previous implementation
// could leave multiple stale downloads fighting the verse the user actually
// selected after rapid Surah/Ayah changes.
let preloadGeneration = 0;
let preloadWork: Promise<void> = Promise.resolve();
let preloadedSource: string | null = null;
let preloadedKey: string | null = null;
let activePlaybackRate = 1;

const stateListeners = new Set<() => void>();

function publish(next: Partial<AudioSnapshot>) {
  const updated = { ...snapshot, ...next };
  if (
    updated.isPlaying === snapshot.isPlaying &&
    updated.isLoading === snapshot.isLoading &&
    updated.error === snapshot.error &&
    updated.key === snapshot.key
  ) return;
  snapshot = updated;
  stateListeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function cancelPendingLoad() {
  pendingLoad?.settle(false);
  pendingLoad = null;
}

function waitUntilLoaded(request: number) {
  cancelPendingLoad();
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => finish(false), 8000);
    function finish(value: boolean) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (pendingLoad?.request === request) pendingLoad = null;
      resolve(value);
    }
    pendingLoad = { request, settle: finish };
  });
}

async function safeClearPreloadedSource(uri: string) {
  try {
    await clearPreloadedSource({ uri });
  } catch {}
}

async function sourceFor(reciterId: string, surah: number, ayah: number) {
  try {
    return (await getCachedAyahUri(reciterId, surah, ayah)) ?? recitationUrl(reciterId, surah, ayah);
  } catch {
    return recitationUrl(reciterId, surah, ayah);
  }
}

async function playbackSources(reciterId: string, surah: number, ayah: number) {
  const sources: string[] = [];
  try {
    const cached = await getCachedAyahUri(reciterId, surah, ayah);
    if (cached) sources.push(cached);
  } catch {}

  const primary = recitationUrl(reciterId, surah, ayah);
  if (!sources.includes(primary)) sources.push(primary);

  const fallback = recitationFallbackUrl(reciterId, surah, ayah);
  if (fallback && !sources.includes(fallback)) sources.push(fallback);
  return sources;
}

function adjacentAyah(surah: number, ayah: number) {
  if (ayah < surahMeta(surah).ayahs) return { surah, ayah: ayah + 1 };
  return { surah: surah === 114 ? 1 : surah + 1, ayah: 1 };
}

function prepareAyah(reciterId: string, surah: number, ayah: number, current: boolean) {
  const generation = ++preloadGeneration;
  const target = current ? { surah, ayah } : adjacentAyah(surah, ayah);
  const targetKey = `${reciterId}:${target.surah}:${target.ayah}`;

  preloadWork = preloadWork.then(async () => {
    if (generation !== preloadGeneration) return;

    if (preloadedSource) {
      await safeClearPreloadedSource(preloadedSource);
      preloadedSource = null;
      preloadedKey = null;
    }
    if (generation !== preloadGeneration) return;

    const source = await sourceFor(reciterId, target.surah, target.ayah);
    if (generation !== preloadGeneration) return;
    // Mark the logical verse before the network await so an immediate autoplay
    // request for the same picker selection does not invalidate useful work.
    preloadedKey = targetKey;
    await preload({ uri: source });
    if (generation === preloadGeneration) preloadedSource = source;
    else {
      await safeClearPreloadedSource(source);
      if (preloadedKey === targetKey) preloadedKey = null;
    }
  }).catch(() => {
    if (preloadedKey === targetKey) preloadedKey = null;
  });
}

function discardPreloads() {
  preloadGeneration += 1;
  const oldSource = preloadedSource;
  preloadedSource = null;
  preloadedKey = null;
  if (oldSource) void safeClearPreloadedSource(oldSource);
}

function ensurePlayer() {
  if (player) return player;

  const nextPlayer = createAudioPlayer(null, {
    updateInterval: 500,
    preferredForwardBufferDuration: 8,
  });
  player = nextPlayer;
  statusSubscription = nextPlayer.addListener("playbackStatusUpdate", (status) => {
    if (player !== nextPlayer) return;

    if (status.error) {
      // Treat a source error as a failed attempt while a load is pending so
      // the controller can immediately try the alternate CDN.
      if (pendingLoad) {
        pendingLoad.settle(false);
        publish({ isPlaying: false, isLoading: true, error: false });
        return;
      }
      wantsPlayback = false;
      activeTarget = null;
      publish({ isPlaying: false, isLoading: false, error: true });
      return;
    }

    if (status.isLoaded) pendingLoad?.settle(true);
    publish({
      isPlaying: !!status.playing,
      isLoading: wantsPlayback && !status.isLoaded,
      error: false,
    });

    if (status.didJustFinish) {
      const finished = activeTarget;
      activeTarget = null;
      wantsPlayback = false;
      publish({ isPlaying: false, isLoading: false, key: null });
      // The first play streams immediately; after it finishes, save that exact
      // Ayah to disk without ever delaying initial playback.
      if (finished) void queueAyahAudio(finished);
    }
  });

  return nextPlayer;
}

function destroyPlayer() {
  cancelPendingLoad();
  const oldPlayer = player;
  const oldSubscription = statusSubscription;
  player = null;
  statusSubscription = null;

  try { oldPlayer?.pause(); } catch {}
  try { oldSubscription?.remove(); } catch {}
  try { oldPlayer?.remove(); } catch {}
}

/** Immediately kills recitation and disables the native audio subsystem. */
export function stopAllAyahAudio() {
  discardPreloads();
  requestId += 1;
  wantsPlayback = false;
  activeTarget = null;
  destroyPlayer();
  publish({ isPlaying: false, isLoading: false, error: false, key: null });
  if (audioSessionActive) {
    audioSessionActive = false;
    setIsAudioActiveAsync(false).catch(() => {});
  }
}

/** Route-level Reader teardown. Kept explicit so navigation never depends on
 * hook cleanup timing or on a component still being mounted. */
export function exitReaderAudio() {
  stopAllAyahAudio();
}

function pauseAyahAudio() {
  const resumable = !!player && !!activeTarget && !!snapshot.key && !snapshot.isLoading && !snapshot.error;
  requestId += 1;
  wantsPlayback = false;
  cancelPendingLoad();
  try { player?.pause(); } catch {}
  if (resumable) {
    // Preserve the current verse/player so Play resumes from the paused
    // position instead of replacing the source and restarting the ayah.
    publish({ isPlaying: false, isLoading: false, error: false });
  } else {
    activeTarget = null;
    publish({ isPlaying: false, isLoading: false, key: null });
  }
}

function resumePausedAyah(reciterId: string, surah: number, ayah: number) {
  const key = `${reciterId}:${surah}:${ayah}`;
  if (
    snapshot.key !== key ||
    snapshot.isLoading ||
    snapshot.error ||
    !player ||
    !activeTarget ||
    activeTarget.reciterId !== reciterId ||
    activeTarget.surah !== surah ||
    activeTarget.ayah !== ayah
  ) return false;

  requestId += 1;
  wantsPlayback = true;
  try {
    player.play();
    publish({ isPlaying: true, isLoading: false, error: false, key });
    return true;
  } catch {
    wantsPlayback = false;
    activeTarget = null;
    publish({ isPlaying: false, isLoading: false, error: true, key: null });
    return false;
  }
}

function isKeyPlaying(key: string) {
  return snapshot.key === key && wantsPlayback;
}

function playExactAyah(reciterId: string, surah: number, ayah: number) {
  const key = `${reciterId}:${surah}:${ayah}`;
  const thisRequest = ++requestId;
  wantsPlayback = true;
  activeTarget = { reciterId, surah, ayah };
  cancelPendingLoad();
  // The chosen verse gets network priority. Cancel speculative work only when
  // it belongs to another verse; picker press-in may already be warming this
  // exact source.
  if (preloadedKey !== key) preloadGeneration += 1;
  publish({ isPlaying: false, isLoading: true, error: false, key });

  void (async () => {
    try {
      audioModeReady ??= setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      }).catch((error) => {
        audioModeReady = null;
        throw error;
      });
      await audioModeReady;
      if (thisRequest !== requestId) return;

      if (!audioSessionActive) {
        await setIsAudioActiveAsync(true);
        audioSessionActive = true;
      }
      if (thisRequest !== requestId) return;

      const sources = await playbackSources(reciterId, surah, ayah);
      if (thisRequest !== requestId) return;

      const nextPlayer = ensurePlayer();
      try { nextPlayer.pause(); } catch {}

      let didLoad = false;
      for (const source of sources) {
        if (thisRequest !== requestId || player !== nextPlayer) return;
        const loaded = waitUntilLoaded(thisRequest);
        try {
          nextPlayer.replace({ uri: source });
          didLoad = await loaded;
        } catch {
          pendingLoad?.settle(false);
          didLoad = false;
        }
        if (didLoad) break;
      }

      if (thisRequest !== requestId || player !== nextPlayer) return;
      if (!didLoad) {
        wantsPlayback = false;
        activeTarget = null;
        publish({ isPlaying: false, isLoading: false, error: true, key: null });
        return;
      }

      nextPlayer.setPlaybackRate(activePlaybackRate, "high");
      if (thisRequest !== requestId || player !== nextPlayer) return;
      nextPlayer.play();

      // Only after selected audio is ready do background work begin. Give the
      // current stream a short head start, then warm the next/previous files.
      prepareAyah(reciterId, surah, ayah, false);
      setTimeout(() => {
        if (thisRequest === requestId && player === nextPlayer) {
          warmAudioNeighborhood(reciterId, surah, ayah, false);
        }
      }, 900);
    } catch {
      if (thisRequest !== requestId) return;
      wantsPlayback = false;
      publish({ isPlaying: false, isLoading: false, error: true, key: null });
    }
  })();
}

export function setAyahPlaybackRate(speed: number) {
  activePlaybackRate = speed;
  try { player?.setPlaybackRate(activePlaybackRate, "high"); } catch {}
}

export function useAyahAudio(opts: { reciterId: string; speed: number }) {
  const { reciterId, speed } = opts;
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    setAyahPlaybackRate(speed);
  }, [speed]);

  const playAyah = useCallback(
    (surah: number, ayah: number) => playExactAyah(reciterId, surah, ayah),
    [reciterId],
  );

  const toggle = useCallback(
    (surah: number, ayah: number) => {
      const key = `${reciterId}:${surah}:${ayah}`;
      if (isKeyPlaying(key)) pauseAyahAudio();
      else if (!resumePausedAyah(reciterId, surah, ayah)) playExactAyah(reciterId, surah, ayah);
    },
    [reciterId],
  );

  const isCurrentlyPlaying = useCallback(() => wantsPlayback, []);

  // Called after the reader has been stable for a moment or on picker press-in.
  // It warms only the selected verse in Expo's playback cache, not a fan-out of
  // stale requests.
  const prefetch = useCallback((surah: number, ayah: number) => {
    prepareAyah(reciterId, surah, ayah, true);
  }, [reciterId]);

  return {
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    error: state.error,
    playAyah,
    toggle,
    stop: pauseAyahAudio,
    dispose: stopAllAyahAudio,
    isCurrentlyPlaying,
    prefetch,
  };
}
