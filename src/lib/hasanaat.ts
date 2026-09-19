// Hasanaat reward + Bismillah rules (ported from the web logic).
// Reward = countArabicLetters(visibleAyah) * 10.

// Strip harakat/diacritics/tatweel, then count Arabic letters.
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const ARABIC_LETTER = /[\u0621-\u063A\u0641-\u064A\u066E-\u06D3\u06FA-\u06FF]/g;

export function countArabicLetters(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(DIACRITICS, "");
  const matches = cleaned.match(ARABIC_LETTER);
  return matches ? matches.length : 0;
}

export function computeReward(arabicText: string): number {
  return countArabicLetters(arabicText) * 10;
}

