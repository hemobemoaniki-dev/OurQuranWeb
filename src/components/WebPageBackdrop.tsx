import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Image, StyleSheet, View } from "react-native";

const SOLAR_EMBER = require("../../assets/reader/solar-ember.jpg");

/** Shared cinematic canvas for the desktop web experience. */
export const WebPageBackdrop = memo(function WebPageBackdrop({ intensity = "standard" }: { intensity?: "soft" | "standard" | "strong" }) {
  const opacity = intensity === "strong" ? 0.42 : intensity === "soft" ? 0.18 : 0.3;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={SOLAR_EMBER} resizeMode="cover" blurRadius={2} style={[StyleSheet.absoluteFill, { opacity }]} />
      <LinearGradient
        colors={["rgba(2,3,3,0.94)", "rgba(5,6,6,0.72)", "rgba(18,11,3,0.79)", "rgba(2,3,3,0.95)"]}
        locations={[0, 0.34, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.warmGlow} />
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
  edgeGlow: {
    position: "absolute", right: -160, bottom: -220, width: 520, height: 520, borderRadius: 999,
    backgroundColor: "rgba(212,175,55,0.04)", shadowColor: "#D4AF37", shadowOpacity: 0.16,
    shadowRadius: 100, shadowOffset: { width: 0, height: 0 },
  },
});
