import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";

import { computeStreak, dateKey, type History } from "@/src/lib/dates";
import { storage } from "@/src/utils/storage";

export const CROWN_STREAK_DAYS = 3;
export const CROWN_PENDING_KEY = "streak_crown_pending_day_v2";

const SOUND_NAME = "ourquran-crown-triumph-v2.wav";
const SAMPLE_RATE = 16000;
const SOUND_SECONDS = 1.08;

let soundUriPromise: Promise<string | null> | null = null;
let pendingCrownMemory: { scope: string; day: string } | null = null;
let triumphPlayer: AudioPlayer | null = null;
let triumphSubscription: { remove: () => void } | null = null;

export function crownActiveForStreak(streak: number) {
  return streak >= CROWN_STREAK_DAYS;
}

export function shouldCelebrateCrown(beforeStreak: number, afterStreak: number) {
  return beforeStreak < CROWN_STREAK_DAYS && afterStreak >= CROWN_STREAK_DAYS;
}

/**
 * Called inside local progress mutations. The flag is deliberately local and
 * tiny: the crown itself is derived from synced history, while this flag only
 * prevents the one-shot celebration from replaying on every render/device pull.
 */
export function queueCrownCelebrationIfEarned(
  beforeHistory: History,
  afterHistory: History,
  scope: string,
  ref = new Date(),
) {
  const before = computeStreak(beforeHistory, ref);
  const after = computeStreak(afterHistory, ref);
  if (!shouldCelebrateCrown(before, after)) return false;
  const day = dateKey(ref);
  // Set the in-memory flag synchronously so an immediate Reader -> Home
  // transition cannot outrun AsyncStorage.
  const normalizedScope = scope || "guest";
  pendingCrownMemory = { scope: normalizedScope, day };
  if (normalizedScope !== "guest") void storage.setItem(pendingKey(normalizedScope), day);
  return true;
}

export async function consumePendingCrownCelebration(streak: number, today: string, scope: string) {
  const normalizedScope = scope || "guest";
  const memoryDay = pendingCrownMemory?.scope === normalizedScope ? pendingCrownMemory.day : "";
  const key = pendingKey(normalizedScope);

  // The Reader sets this memory flag synchronously. Consume it without waiting
  // on storage so Home can begin the crown animation on its first visible frame.
  if (memoryDay) {
    pendingCrownMemory = null;
    void storage.removeItem(key);
    return memoryDay === today && crownActiveForStreak(streak);
  }

  if (normalizedScope === "guest") {
    void storage.removeItem(key);
    return false;
  }

  const pending = await storage.getItem(key, "");
  if (!pending) return false;

  if (pending !== today || !crownActiveForStreak(streak)) {
    await storage.removeItem(key);
    return false;
  }

  await storage.removeItem(key);
  return true;
}

function pendingKey(scope: string) {
  return CROWN_PENDING_KEY + ":" + scope;
}

export async function playCrownTriumph() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

  try {
    const uri = await ensureTriumphSound();
    if (!uri) return;

    stopTriumphPlayer();
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    await setIsAudioActiveAsync(true);

    const next = createAudioPlayer({ uri }, { updateInterval: 80 });
    triumphPlayer = next;
    triumphSubscription = next.addListener("playbackStatusUpdate", (status) => {
      if (triumphPlayer !== next) return;
      if (status.error || status.didJustFinish) stopTriumphPlayer();
    });
    next.play();
  } catch {
    stopTriumphPlayer();
  }
}

function stopTriumphPlayer() {
  const player = triumphPlayer;
  const subscription = triumphSubscription;
  triumphPlayer = null;
  triumphSubscription = null;
  try { player?.pause(); } catch {}
  try { subscription?.remove(); } catch {}
  try { player?.remove(); } catch {}
}

/**
 * Generate a tiny local WAV the first time the crown is earned. Keeping the
 * sound procedural avoids another binary asset/dependency while guaranteeing
 * the celebration still works offline.
 */
async function ensureTriumphSound() {
  if (!FileSystem.cacheDirectory) return null;
  soundUriPromise ??= (async () => {
    const uri = FileSystem.cacheDirectory + SOUND_NAME;
    const existing = await FileSystem.getInfoAsync(uri);
    if (existing.exists) return uri;

    const bytes = makeTriumphWav();
    await FileSystem.writeAsStringAsync(uri, bytesToBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
  })().catch(() => {
    soundUriPromise = null;
    return null;
  });
  return soundUriPromise;
}

function makeTriumphWav() {
  const frameCount = Math.floor(SAMPLE_RATE * SOUND_SECONDS);
  const bytes = new Uint8Array(44 + frameCount * 2);
  writeAscii(bytes, 0, "RIFF");
  writeU32(bytes, 4, 36 + frameCount * 2);
  writeAscii(bytes, 8, "WAVE");
  writeAscii(bytes, 12, "fmt ");
  writeU32(bytes, 16, 16);
  writeU16(bytes, 20, 1);
  writeU16(bytes, 22, 1);
  writeU32(bytes, 24, SAMPLE_RATE);
  writeU32(bytes, 28, SAMPLE_RATE * 2);
  writeU16(bytes, 32, 2);
  writeU16(bytes, 34, 16);
  writeAscii(bytes, 36, "data");
  writeU32(bytes, 40, frameCount * 2);

  const notes = [
    { start: 0.00, duration: 0.24, frequency: 523.25, gain: 0.16 },
    { start: 0.09, duration: 0.30, frequency: 659.25, gain: 0.18 },
    { start: 0.21, duration: 0.38, frequency: 783.99, gain: 0.20 },
    { start: 0.34, duration: 0.42, frequency: 1046.50, gain: 0.18 },
    // Quiet high notes form the little celebratory "cheer" afterglow.
    { start: 0.57, duration: 0.20, frequency: 1567.98, gain: 0.055 },
    { start: 0.68, duration: 0.22, frequency: 1760.00, gain: 0.050 },
    { start: 0.80, duration: 0.22, frequency: 2093.00, gain: 0.045 },
  ];

  for (let i = 0; i < frameCount; i += 1) {
    const t = i / SAMPLE_RATE;
    let sample = 0;

    for (const note of notes) {
      if (t < note.start || t >= note.start + note.duration) continue;
      const u = (t - note.start) / note.duration;
      const attack = Math.min(1, u / 0.06);
      const release = u < 0.58 ? 1 : Math.max(0, 1 - (u - 0.58) / 0.42);
      const envelope = attack * release;
      sample += note.gain * envelope * (
        Math.sin(2 * Math.PI * note.frequency * t) +
        0.18 * Math.sin(4 * Math.PI * note.frequency * t)
      );
    }

    if (t >= 0.34 && t < 0.53) {
      const u = (t - 0.34) / 0.19;
      sample += 0.085 * Math.exp(-4.5 * u) * Math.sin(2 * Math.PI * 190 * t);
    }

    if (t >= 0.54 && t < 1.03) {
      const u = (t - 0.54) / 0.49;
      const tail = Math.sin(Math.PI * Math.min(1, u)) * (1 - u * 0.68);
      sample += 0.018 * tail * Math.sin(2 * Math.PI * 2350 * t);
      sample += 0.012 * tail * Math.sin(2 * Math.PI * 2780 * t + 0.7);
    }

    const pcm = Math.round(Math.max(-0.9, Math.min(0.9, sample)) * 32767);
    const offset = 44 + i * 2;
    bytes[offset] = pcm & 0xff;
    bytes[offset + 1] = (pcm >> 8) & 0xff;
  }

  return bytes;
}

function writeAscii(bytes: Uint8Array, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i);
}

function writeU16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
}

function writeU32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
  bytes[offset + 3] = (value >> 24) & 0xff;
}

function bytesToBase64(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    output += alphabet[(triple >> 18) & 63];
    output += alphabet[(triple >> 12) & 63];
    output += i + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : "=";
    output += i + 2 < bytes.length ? alphabet[triple & 63] : "=";
  }
  return output;
}
