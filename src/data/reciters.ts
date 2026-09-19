import { SURAHS } from "@/src/data/surahs";

// The five approved reciters. `folder` is the EveryAyah data directory.
// `cleanIntro` points at the Islamic Network ayah edition whose first ayah
// starts at the ayah itself instead of prepending a surah-opening Bismillah.
export type Reciter = {
  id: string;
  name: string;
  folder: string;
  cleanIntro?: { edition: string; bitrate: number };
};

export const RECITER_PREVIEW_SURAH = 2;
export const RECITER_PREVIEW_AYAH = 255;

export const RECITERS: Reciter[] = [
  {
    id: "alafasy",
    name: "Mishary Rashid Alafasy",
    folder: "Alafasy_128kbps",
    cleanIntro: { edition: "ar.alafasy", bitrate: 128 },
  },
  {
    id: "ayyoub",
    name: "Muhammad Ayyoub",
    folder: "Muhammad_Ayyoub_128kbps",
    cleanIntro: { edition: "ar.muhammadayoub", bitrate: 128 },
  },
  {
    id: "sudais",
    name: "Abdul Rahman Al-Sudais",
    folder: "Abdurrahmaan_As-Sudais_192kbps",
    cleanIntro: { edition: "ar.sudais", bitrate: 192 },
  },
  { id: "jaber", name: "Ali Jaber", folder: "Ali_Jaber_64kbps" },
  {
    id: "minshawi",
    name: "Mohamed Siddiq Al-Minshawi",
    folder: "Minshawy_Murattal_128kbps",
    cleanIntro: { edition: "ar.minshawi", bitrate: 128 },
  },
];

const GLOBAL_AYAH_START = (() => {
  const starts = new Array<number>(SURAHS.length + 1).fill(0);
  let total = 0;
  for (const surah of SURAHS) {
    starts[surah.number] = total;
    total += surah.ayahs;
  }
  return starts;
})();

export function reciterById(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

export function globalAyahNumber(surah: number, ayah: number) {
  const meta = SURAHS[surah - 1];
  if (!meta || ayah < 1 || ayah > meta.ayahs) throw new Error("Invalid ayah");
  return GLOBAL_AYAH_START[surah] + ayah;
}

// Deterministic EveryAyah filename: SSSAAA.mp3 (e.g. 006032.mp3 -> surah 6, ayah 32)
export function everyAyahUrl(reciterId: string, surah: number, ayah: number): string {
  const r = reciterById(reciterId);
  const sss = String(surah).padStart(3, "0");
  const aaa = String(ayah).padStart(3, "0");
  return `https://everyayah.com/data/${r.folder}/${sss}${aaa}.mp3`;
}

/**
 * Returns the normal verse audio while explicitly avoiding a redundant
 * surah-opening Bismillah before ayah 1. Al-Fatihah is excluded because 1:1 is
 * itself the Bismillah in our canonical 6,236-ayah text. At-Tawbah has no
 * opening Bismillah.
 *
 * Ali Jaber stays on EveryAyah: that catalog exposes the Bismillah separately
 * as SSS000.mp3, while SSS001.mp3 is the first numbered ayah.
 */
export function recitationUrl(reciterId: string, surah: number, ayah: number): string {
  const reciter = reciterById(reciterId);
  const isPrefatoryBismillahCase = ayah === 1 && surah !== 1 && surah !== 9;
  if (isPrefatoryBismillahCase && reciter.cleanIntro) {
    const globalAyah = globalAyahNumber(surah, ayah);
    return `https://cdn.islamic.network/quran/audio/${reciter.cleanIntro.bitrate}/${reciter.cleanIntro.edition}/${globalAyah}.mp3`;
  }
  return everyAyahUrl(reciterId, surah, ayah);
}

export function audioCacheVariant(reciterId: string, surah: number, ayah: number) {
  const reciter = reciterById(reciterId);
  return ayah === 1 && surah !== 1 && surah !== 9 && reciter.cleanIntro ? "nobasmala-v2" : "standard";
}
