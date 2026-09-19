// Bundled Quran reader data: no network request is required to change Surahs.
// The JSON is split into small static chunks so Metro can load only the chunk
// containing the requested Surah, while all 6,236 Ayahs ship with the app.
import { surahMeta } from "@/src/data/surahs";

export type Ayah = {
  numberInSurah: number;
  arabic: string;
  english: string;
};

export type SurahContent = {
  number: number;
  ayahs: Ayah[];
};

const QURANIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

function normalizedArabicWord(word: string): string {
  return word
    .replace(QURANIC_MARKS, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/[^ء-ي]/g, "");
}

export function stripLeadingBismillah(text: string, surah: number, ayahInSurah: number): string {
  if (ayahInSurah !== 1 || surah === 1 || surah === 9) return text.trim();

  const words = text.trim().split(/\s+/);
  const prefix = words.slice(0, 4).map(normalizedArabicWord);
  const isBismillah =
    prefix[0] === "بسم" &&
    prefix[1] === "الله" &&
    prefix[2] === "الرحمن" &&
    prefix[3] === "الرحيم";

  return isBismillah ? words.slice(4).join(" ").trim() : text.trim();
}

type BundleLoader = () => SurahContent[];

const bundleLoaders: BundleLoader[] = [
  () => require("../data/quran-offline/001-010.json") as SurahContent[],
  () => require("../data/quran-offline/011-020.json") as SurahContent[],
  () => require("../data/quran-offline/021-030.json") as SurahContent[],
  () => require("../data/quran-offline/031-040.json") as SurahContent[],
  () => require("../data/quran-offline/041-050.json") as SurahContent[],
  () => require("../data/quran-offline/051-060.json") as SurahContent[],
  () => require("../data/quran-offline/061-070.json") as SurahContent[],
  () => require("../data/quran-offline/071-080.json") as SurahContent[],
  () => require("../data/quran-offline/081-090.json") as SurahContent[],
  () => require("../data/quran-offline/091-100.json") as SurahContent[],
  () => require("../data/quran-offline/101-110.json") as SurahContent[],
  () => require("../data/quran-offline/111-114.json") as SurahContent[],
];

const loadedBundles = new Map<number, Map<number, SurahContent>>();
const memoryCache = new Map<number, SurahContent>();

function validateSurah(content: SurahContent, number: number): SurahContent {
  if (
    content?.number !== number ||
    !Array.isArray(content.ayahs) ||
    content.ayahs.length !== surahMeta(number).ayahs
  ) {
    throw new Error(`Bundled Qur'an data is incomplete for Surah ${number}`);
  }

  const ayahs = content.ayahs.map((ayah, index) => {
    if (
      ayah.numberInSurah !== index + 1 ||
      typeof ayah.arabic !== "string" ||
      !ayah.arabic.trim() ||
      typeof ayah.english !== "string" ||
      !ayah.english.trim()
    ) {
      throw new Error(`Bundled Qur'an data is invalid at ${number}:${index + 1}`);
    }
    return {
      numberInSurah: ayah.numberInSurah,
      arabic: stripLeadingBismillah(ayah.arabic, number, ayah.numberInSurah),
      english: ayah.english.trim(),
    };
  });

  return { number, ayahs };
}

function loadBundle(bundleIndex: number) {
  const existing = loadedBundles.get(bundleIndex);
  if (existing) return existing;

  const rows = bundleLoaders[bundleIndex]?.();
  if (!rows) throw new Error("Invalid Quran bundle");

  const bundle = new Map<number, SurahContent>();
  for (const row of rows) {
    const validated = validateSurah(row, row.number);
    bundle.set(validated.number, validated);
    memoryCache.set(validated.number, validated);
  }
  loadedBundles.set(bundleIndex, bundle);
  return bundle;
}

export function getBundledSurah(number: number): SurahContent {
  if (!Number.isInteger(number) || number < 1 || number > 114) throw new Error("Invalid surah");

  const cached = memoryCache.get(number);
  if (cached) return cached;

  const bundleIndex = Math.min(bundleLoaders.length - 1, Math.floor((number - 1) / 10));
  const content = loadBundle(bundleIndex).get(number);
  if (!content) throw new Error(`Bundled Qur'an data is missing Surah ${number}`);
  return content;
}

export function fetchSurah(number: number): Promise<SurahContent> {
  try {
    return Promise.resolve(getBundledSurah(number));
  } catch (error) {
    return Promise.reject(error);
  }
}

export function prefetchSurah(number: number) {
  if (number < 1 || number > 114) return;
  try {
    getBundledSurah(number);
  } catch {}
}

export function warmAllQuranText() {
  for (let index = 0; index < bundleLoaders.length; index += 1) loadBundle(index);
}

// 1.8 MB of bundled text is cheap compared with recitation audio. Parse and
// validate it once when this module enters the app so Reader navigation is a
// Map lookup, never a network request or first-tap JSON parse.
warmAllQuranText();
