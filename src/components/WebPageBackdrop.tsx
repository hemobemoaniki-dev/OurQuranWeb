import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { useAccount } from "@/src/context/AppState";
import { siteBackground } from "@/src/data/site-backgrounds";
import { useTheme } from "@/src/theme";

/** Shared cinematic canvas for desktop web. The selected preset is account-synced. */
export const WebPageBackdrop = memo(function WebPageBackdrop({ intensity = "standard" }: { intensity?: "soft" | "standard" | "strong" }) {
  const { account } = useAccount();
  const { scheme } = useTheme();
  const preset = siteBackground(account.settings.siteBackground);
  const intensityFactor = intensity === "strong" ? 1 : intensity === "soft" ? 0.62 : 0.82;
  const opacity = Math.min(0.68, preset.opacity * intensityFactor);
  const dark = scheme === "dark";

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={preset.source}
        contentFit="cover"
        contentPosition={preset.position as any}
        transition={220}
        style={[StyleSheet.absoluteFill, { opacity }]}
      />
      <LinearGradient
        colors={dark
          ? ["rgba(2,3,3,0.94)", "rgba(4,5,5,0.74)", "rgba(14,10,5,0.78)", "rgba(2,3,3,0.96)"]
          : ["rgba(252,250,245,0.86)", "rgba(252,250,245,0.74)", "rgba(248,244,235,0.82)", "rgba(252,250,245,0.92)"]}
        locations={[0, 0.34, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.warmGlow, !dark && styles.lightGlow]} />
      <View style={styles.edgeGlow} />
    </View>
  );
});

const styles = StyleSheet.create({
  warmGlow: {
    position: "absolute", top: -180, left: "28%", width: 680, height: 420, borderRadius: 999,
    backgroundColor: "rgba(236,202,105,0.055)", shadowColor: "#ECCA69", shadowOpacity: 0.16,
    shadowRadius: 120, shadowOffset: { width: 0, height: 0 },
  },
  lightGlow: { backgroundColor: "rgba(255,244,203,0.09)", shadowOpacity: 0.08 },
  edgeGlow: {
    position: "absolute", right: -160, bottom: -220, width: 520, height: 520, borderRadius: 999,
    backgroundColor: "rgba(212,175,55,0.04)", shadowColor: "#D4AF37", shadowOpacity: 0.16,
    shadowRadius: 100, shadowOffset: { width: 0, height: 0 },
  },
});
