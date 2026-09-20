import { Platform } from "react-native";

// A single bundled display face keeps desktop typography crisp and consistent
// across browsers instead of falling back to mismatched system serifs.
export const serifFont = Platform.select({ web: "LatoBold", ios: "LatoBold", android: "LatoBold", default: "LatoBold" });

// Arabic script: rely on the platform's Arabic-capable system font. Large
// line-height is applied at the component level.
export const arabicFont = Platform.select({ web: '"Noto Naskh Arabic", "Segoe UI", serif', ios: "Geeza Pro", android: undefined, default: undefined });

export const READING_SIZES: Record<string, number> = {
  small: 26,
  standard: 32,
  large: 38,
  xlarge: 46,
};
