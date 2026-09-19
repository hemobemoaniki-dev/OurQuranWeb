import { Platform } from "react-native";

// Elegant serif for display/headings (system serif — no remote font needed,
// works in Expo Go). Clean sans for body uses the platform default.
export const serifFont = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" });

// Arabic script: rely on the platform's Arabic-capable system font. Large
// line-height is applied at the component level.
export const arabicFont = Platform.select({ ios: "Geeza Pro", android: undefined, default: undefined });

export const READING_SIZES: Record<string, number> = {
  small: 26,
  standard: 32,
  large: 38,
  xlarge: 46,
};
