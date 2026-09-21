import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useAccount } from "@/src/context/AppState";
import { siteBackground } from "@/src/data/site-backgrounds";
import { useTheme } from "@/src/theme";

/**
 * Shared cinematic canvas for desktop web.
 *
 * The image stays deliberately visible in both themes. Readability comes from
 * the layered scrims and the translucent content surfaces above it rather than
 * from washing the background out.
 */
export const WebPageBackdrop = memo(function WebPageBackdrop({
  intensity = "standard",
}: {
  intensity?: "soft" | "standard" | "strong";
}) {
  const { account } = useAccount();
  const { scheme } = useTheme();
  const preset = siteBackground(account.settings.siteBackground);
  const dark = scheme === "dark";
  // The approved wallpaper already contains its dark center and lighting.
  // Do not bury the architecture under the generic background scrims.
  if (preset.id === "golden-sanctuary") return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={preset.source} contentFit="cover" contentPosition="center" style={StyleSheet.absoluteFill} />
      {!dark ? <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,252,243,0.72)" }]} /> : null}
    </View>
  );


  const intensityFactor =
    intensity === "strong" ? 1 : intensity === "soft" ? 0.82 : 0.92;

  // Keep the photography present. Strong pages used to cap the image around
  // 0.55–0.68, then stack a very opaque scrim on top, which made the selected
  // background nearly disappear.
  const imageOpacity = Math.min(
    0.96,
    (dark ? 0.9 : 0.78) * intensityFactor,
  );

  const imageStyle = Platform.OS === "web"
    ? ({ filter: dark ? "saturate(1.08) contrast(1.03)" : "saturate(0.96) contrast(0.94)" } as any)
    : undefined;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={preset.source}
        contentFit="cover"
        contentPosition={preset.position as any}
        transition={220}
        style={[StyleSheet.absoluteFill, imageStyle, { opacity: imageOpacity }]}
      />

      {/* Main readability veil. Light mode is intentionally translucent so the
          scenery remains part of the page instead of becoming a white sheet. */}
      <LinearGradient
        colors={dark
          ? [
              "rgba(2,3,3,0.68)",
              "rgba(3,4,4,0.40)",
              "rgba(12,8,4,0.46)",
              "rgba(2,3,3,0.72)",
            ]
          : [
              "rgba(255,252,245,0.58)",
              "rgba(255,252,245,0.38)",
              "rgba(250,244,232,0.44)",
              "rgba(255,252,245,0.64)",
            ]}
        locations={[0, 0.34, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top/bottom vignette protects navigation and footer text while leaving
          the middle of the scene brighter. */}
      <LinearGradient
        colors={dark
          ? ["rgba(0,0,0,0.62)", "rgba(0,0,0,0.04)", "rgba(0,0,0,0.50)"]
          : ["rgba(255,253,248,0.72)", "rgba(255,253,248,0.03)", "rgba(255,253,248,0.58)"]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.warmGlow, !dark && styles.lightGlow]} />
      <View style={[styles.edgeGlow, !dark && styles.lightEdgeGlow]} />
    </View>
  );
});

const styles = StyleSheet.create({
  warmGlow: {
    position: "absolute",
    top: -180,
    left: "25%",
    width: 760,
    height: 450,
    borderRadius: 999,
    backgroundColor: "rgba(236,202,105,0.065)",
    shadowColor: "#ECCA69",
    shadowOpacity: 0.18,
    shadowRadius: 130,
    shadowOffset: { width: 0, height: 0 },
  },
  lightGlow: {
    backgroundColor: "rgba(255,238,180,0.08)",
    shadowOpacity: 0.09,
  },
  edgeGlow: {
    position: "absolute",
    right: -180,
    bottom: -220,
    width: 560,
    height: 560,
    borderRadius: 999,
    backgroundColor: "rgba(212,175,55,0.045)",
    shadowColor: "#D4AF37",
    shadowOpacity: 0.15,
    shadowRadius: 110,
    shadowOffset: { width: 0, height: 0 },
  },
  lightEdgeGlow: {
    backgroundColor: "rgba(212,175,55,0.035)",
    shadowOpacity: 0.07,
  },
});
