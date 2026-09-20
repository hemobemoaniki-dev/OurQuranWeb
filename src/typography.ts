import { Platform } from "react-native";

// Premium, highly readable web typography without depending on a network font.
// Windows/macOS/Linux all have strong fallbacks in these stacks.
export const uiFont = Platform.select({
  web: '"Segoe UI", Inter, "Helvetica Neue", Arial, sans-serif',
  ios: "Avenir Next",
  android: "sans-serif",
  default: undefined,
});

export const serifFont = Platform.select({
  web: 'Georgia, "Times New Roman", serif',
  ios: "New York",
  android: "serif",
  default: "serif",
});

// Arabic script: prefer Naskh-capable faces while preserving shaping.
export const arabicFont = Platform.select({
  web: '"Noto Naskh Arabic", "Traditional Arabic", "Segoe UI", serif',
  ios: "Geeza Pro",
  android: undefined,
  default: undefined,
});

export const READING_SIZES: Record<string, number> = {
  small: 26,
  standard: 32,
  large: 38,
  xlarge: 46,
};
