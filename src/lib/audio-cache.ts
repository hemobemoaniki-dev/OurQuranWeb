import * as FileSystem from "expo-file-system/legacy";

import { audioCacheVariant, recitationUrl } from "@/src/data/reciters";
import { surahMeta } from "@/src/data/surahs";
import { storage } from "@/src/utils/storage";

const CACHE_DIR = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}ourquran-audio/` : null;
const MANIFEST_KEY = "ayah_audio_cache_v1";
const MAX_CACHE_BYTES = 200 * 1024 * 1024;
const MAX_DOWNLOADS = 1;

type CacheEntry = { size: number; lastAccess: number };
type CacheManifest = Record<string, CacheEntry>;
type Target = { reciterId: string; surah: number; ayah: number };

let manifestPromise: Promise<CacheManifest> | null = null;
let directoryPromise: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let manifestRef: CacheManifest = {};
let activeDownloads = 0;
const pendingJobs: { target: Target; resolve: (uri: string | null) => void }[] = [];
const queuedKeys = new Set<string>();
const inFlight = new Map<string, Promise<string | null>>();

function keyOf({ reciterId, surah, ayah }: Target) {
  return `${reciterId}_${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}_${audioCacheVariant(reciterId, surah, ayah)}`;
}

function fileUri(target: Target) {
  return CACHE_DIR ? `${CACHE_DIR}${keyOf(target)}.mp3` : null;
}

async function ensureDirectory() {
  if (!CACHE_DIR) return;
  directoryPromise ??= (async () => {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  })().catch((error) => {
    directoryPromise = null;
    throw error;
  });
  await directoryPromise;
}

async function manifest() {
  manifestPromise ??= (async () => {
    const raw = await storage.getItem<string>(MANIFEST_KEY, "");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CacheManifest;
        if (parsed && typeof parsed === "object") manifestRef = parsed;
      } catch {}
    }
    return manifestRef;
  })();
  return manifestPromise;
}

function persistManifestSoon() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void storage.setItem(MANIFEST_KEY, JSON.stringify(manifestRef));
  }, 800);
}

function touch(key: string, size?: number) {
  const previous = manifestRef[key];
  manifestRef[key] = {
    size: Math.max(0, size ?? previous?.size ?? 0),
    lastAccess: Date.now(),
  };
  persistManifestSoon();
}

async function removeEntry(key: string) {
  if (!CACHE_DIR) return;
  const uri = `${CACHE_DIR}${key}.mp3`;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  delete manifestRef[key];
}

async function pruneIfNeeded() {
  await manifest();
  let total = Object.values(manifestRef).reduce((sum, entry) => sum + (entry.size || 0), 0);
  if (total <= MAX_CACHE_BYTES) return;

  const oldest = Object.entries(manifestRef).sort((a, b) => a[1].lastAccess - b[1].lastAccess);
  for (const [key, entry] of oldest) {
    if (total <= MAX_CACHE_BYTES) break;
    await removeEntry(key);
    total -= entry.size || 0;
  }
  persistManifestSoon();
}

async function downloadNow(target: Target): Promise<string | null> {
  const uri = fileUri(target);
  if (!uri) return null;
  await ensureDirectory();
  await manifest();

  const existing = await FileSystem.getInfoAsync(uri);
  if (existing.exists) {
    touch(keyOf(target), typeof existing.size === "number" ? existing.size : undefined);
    return uri;
  }

  const temporary = `${uri}.part`;
  await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {});
  const result = await FileSystem.downloadAsync(
    recitationUrl(target.reciterId, target.surah, target.ayah),
    temporary,
  );

  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {});
    return null;
  }

  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  await FileSystem.moveAsync({ from: temporary, to: uri });
  const info = await FileSystem.getInfoAsync(uri);
  touch(keyOf(target), info.exists && typeof info.size === "number" ? info.size : 0);
  void pruneIfNeeded();
  return uri;
}

function pumpQueue() {
  while (activeDownloads < MAX_DOWNLOADS && pendingJobs.length) {
    const job = pendingJobs.shift()!;
    const key = keyOf(job.target);
    queuedKeys.delete(key);
    activeDownloads += 1;

    void downloadNow(job.target)
      .catch(() => null)
      .then(job.resolve)
      .finally(() => {
        activeDownloads -= 1;
        inFlight.delete(key);
        pumpQueue();
      });
  }
}

export function queueAyahAudio(target: Target): Promise<string | null> {
  const key = keyOf(target);
  const current = inFlight.get(key);
  if (current) return current;

  const promise = new Promise<string | null>((resolve) => {
    if (!queuedKeys.has(key)) {
      queuedKeys.add(key);
      pendingJobs.push({ target, resolve });
      pumpQueue();
    } else {
      resolve(null);
    }
  });
  inFlight.set(key, promise);
  return promise;
}

export async function getCachedAyahUri(reciterId: string, surah: number, ayah: number) {
  const target = { reciterId, surah, ayah };
  const uri = fileUri(target);
  if (!uri) return null;

  await manifest();
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    const key = keyOf(target);
    if (manifestRef[key]) {
      delete manifestRef[key];
      persistManifestSoon();
    }
    return null;
  }

  touch(keyOf(target), typeof info.size === "number" ? info.size : undefined);
  return uri;
}

function offsetTarget(reciterId: string, surah: number, ayah: number, offset: number): Target {
  let s = surah;
  let a = ayah;
  let remaining = offset;

  while (remaining > 0) {
    if (a < surahMeta(s).ayahs) a += 1;
    else {
      s = s === 114 ? 1 : s + 1;
      a = 1;
    }
    remaining -= 1;
  }
  while (remaining < 0) {
    if (a > 1) a -= 1;
    else {
      s = s === 1 ? 114 : s - 1;
      a = surahMeta(s).ayahs;
    }
    remaining += 1;
  }

  return { reciterId, surah: s, ayah: a };
}

/**
 * Cache nearby verses without blocking playback. Only one background download
 * runs at once, and it starts after selected playback has already loaded.
 */
export function warmAudioNeighborhood(reciterId: string, surah: number, ayah: number, includeCurrent = false) {
  const offsets = includeCurrent ? [0, 1, -1, 2, 3] : [1, -1, 2, 3];
  for (const offset of offsets) void queueAyahAudio(offsetTarget(reciterId, surah, ayah, offset));
}

export async function warmAudioCache() {
  await Promise.all([ensureDirectory(), manifest()]);
}
