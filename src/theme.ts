// OurQuran design tokens — dual theme (Light default, Dark available).
// Black / Gold / Cream identity. Keys mirror design_guidelines.json.
// Build sheets with makeStyles((colors) => ...) and read useTheme().colors
// for non-style color props. Never write raw color literals in components.

import { useMemo, useSyncExternalStore } from "react";
import { Appearance, Platform, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const GOLD = "#D4AF37";
const GOLD_DEEP = "#B8962E";

const dark = {
  surface: "#030303", // deep desktop canvas
  onSurface: "#FFFFFF", // cream text on canvas
  surfaceSecondary: "rgba(236,202,105,0.055)", // premium warm glass cards
  onSurfaceSecondary: "#FFFFFF",
  surfaceTertiary: "rgba(236,202,105,0.085)", // elevated warm glass controls
  onSurfaceTertiary: "#FFFFFF",
  surfaceInverse: "#FDFBF7",
  onSurfaceInverse: "#080808",
  muted: "#D2CEC6", // higher-contrast secondary/caption text

  brand: GOLD,
  onBrand: "#121212",
  brandPrimary: GOLD,
  onBrandPrimary: "#121212",
  brandSecondary: GOLD_DEEP,
  onBrandSecondary: "#121212",
  brandTertiary: "#141414",
  onBrandTertiary: "#FFFFFF",

  success: "#2D6A4F",
  onSuccess: "#FFFFFF",
  warning: "#F4A261",
  onWarning: "#121212",
  error: "#9B2226",
  onError: "#FFFFFF",
  info: "#457B9D",
  onInfo: "#FFFFFF",

  border: "rgba(255,255,255,0.13)", // neutral glass hairline
  borderStrong: "rgba(236,202,105,0.34)",
  divider: "rgba(255,255,255,0.08)",

  // OurQuran extras
  gold: GOLD, // gold text/icon on dark
  goldBorder: "rgba(236,202,105,0.44)", // intentional gold hairline for elevation
  goldSoft: "rgba(236,202,105,0.16)", // translucent premium gold backflow
  overlay: "rgba(0,0,0,0.62)", // image scrim base
  streakDim: "#141414",
};

const light: typeof dark = {
  surface: "#FDFBF7",
  onSurface: "#1A1814",
  surfaceSecondary: "rgba(255,253,247,0.96)",
  onSurfaceSecondary: "#1A1814",
  surfaceTertiary: "rgba(212,175,55,0.085)",
  onSurfaceTertiary: "#1A1814",
  surfaceInverse: "#121212",
  onSurfaceInverse: "#FFF7E6",
  muted: "#484239",

  brand: GOLD,
  onBrand: "#121212",
  brandPrimary: GOLD,
  onBrandPrimary: "#121212",
  brandSecondary: GOLD_DEEP,
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#F5F2EB",
  onBrandTertiary: "#1A1814",

  success: "#2D6A4F",
  onSuccess: "#FFFFFF",
  warning: "#B4671E",
  onWarning: "#FFFFFF",
  error: "#9B2226",
  onError: "#FFFFFF",
  info: "#457B9D",
  onInfo: "#FFFFFF",

  border: "rgba(128,96,22,0.20)",
  borderStrong: "rgba(128,96,22,0.38)",
  divider: "rgba(128,96,22,0.16)",

  gold: "#806016",
  goldBorder: GOLD,
  goldSoft: "rgba(212,175,55,0.20)",
  overlay: "rgba(0,0,0,0.55)",
  streakDim: "#EDE7D8",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

let webScheme: ColorScheme | null = defaultScheme;
const webThemeListeners = new Set<() => void>();

function subscribeWebTheme(listener: () => void) {
  if (Platform.OS !== "web") return () => {};
  webThemeListeners.add(listener);
  return () => webThemeListeners.delete(listener);
}

function getWebThemeSnapshot() {
  return webScheme;
}

export function setColorScheme(scheme: ColorScheme | null) {
  if (Platform.OS === "web") {
    webScheme = scheme;
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = scheme ?? "system";
      document.documentElement.style.colorScheme = scheme ?? "light dark";
    }
    webThemeListeners.forEach((listener) => listener());
    return;
  }
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

// Light default until the saved account preference is applied.
if (Platform.OS !== "web") Appearance.setColorScheme?.(defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const selected = useSyncExternalStore(
    subscribeWebTheme,
    getWebThemeSnapshot,
    getWebThemeSnapshot,
  );

  const resolvedSystem: ColorScheme =
    system === "dark" || system === "light" ? system : defaultScheme;
  const scheme: ColorScheme =
    Platform.OS === "web"
      ? selected ?? resolvedSystem
      : resolvedSystem;

  return { scheme, colors: themes[scheme] ?? themes.dark ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
