import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Image, Platform, View } from "react-native";

export const BRAND_MARK_URI = "data:image/png;base64,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";

export const BRAND_FAVICON_URI = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#050403"/>
      <stop offset=".42" stop-color="#1F1205"/>
      <stop offset=".74" stop-color="#D49A19"/>
      <stop offset="1" stop-color="#FFCF45"/>
    </linearGradient>
    <radialGradient id="r" cx=".78" cy=".18" r=".8">
      <stop offset="0" stop-color="#FFD95F" stop-opacity=".7"/>
      <stop offset=".55" stop-color="#D49A19" stop-opacity=".14"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="3" y="3" width="122" height="122" rx="27" fill="url(#g)" stroke="#ECCA69" stroke-opacity=".65"/>
  <rect x="3" y="3" width="122" height="122" rx="27" fill="url(#r)"/>
  <image href="${BRAND_MARK_URI}" x="18" y="31" width="92" height="69" preserveAspectRatio="xMidYMid meet"/>
</svg>`)}`;

type BrandMarkProps = {
  size?: number;
  tint: string;
  glow?: string;
  intensity?: "soft" | "medium" | "strong";
  variant?: "mark" | "appIcon";
  finish?: "pearl" | "gold";
};

export const BrandMark = memo(function BrandMark({
  size = 48,
  tint,
  glow = tint,
  intensity = "medium",
  variant = "mark",
  finish = "pearl",
}: BrandMarkProps) {
  const glowOpacity = intensity === "strong" ? 0.48 : intensity === "soft" ? 0.18 : 0.3;

  const goldImageStyle = Platform.OS === "web" && finish === "gold"
    ? ({ filter: "sepia(1) saturate(3.4) hue-rotate(350deg) brightness(1.15) contrast(1.06) drop-shadow(0 0 12px rgba(255,211,86,0.72))" } as any)
    : undefined;

  if (variant === "appIcon") {
    return (
      <View
        accessible={false}
        pointerEvents="none"
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.24),
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#060504",
          borderWidth: 1,
          borderColor: tint + "80",
          shadowColor: glow,
          shadowOpacity: glowOpacity,
          shadowRadius: Math.round(size * 0.22),
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <LinearGradient
          colors={["#050403", "#2B1805", tint, "#120B04"]}
          locations={[0, 0.42, 0.72, 1]}
          start={{ x: 0.06, y: 0.95 }}
          end={{ x: 0.92, y: 0.08 }}
          style={{ position: "absolute", inset: 0 } as any}
        />
        <View
          style={{
            position: "absolute",
            right: -Math.round(size * 0.25),
            top: -Math.round(size * 0.18),
            width: Math.round(size * 0.95),
            height: Math.round(size * 0.95),
            borderRadius: Math.round(size * 0.5),
            backgroundColor: "#FFD24E",
            opacity: 0.15,
            shadowColor: "#FFD24E",
            shadowOpacity: 0.68,
            shadowRadius: Math.round(size * 0.24),
            shadowOffset: { width: 0, height: 0 },
          }}
        />
        <Image
          source={{ uri: BRAND_MARK_URI }}
          resizeMode="contain"
          style={[{
            width: Math.round(size * 0.72),
            height: Math.round(size * 0.58),
            marginTop: Math.round(size * 0.06),
          }, goldImageStyle]}
        />
      </View>
    );
  }

  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={{
        width: Math.round(size * 1.22),
        height: size,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: Math.round(size * 0.92),
          height: Math.round(size * 0.55),
          borderRadius: Math.round(size * 0.5),
          backgroundColor: glow,
          opacity: glowOpacity * 0.12,
          shadowColor: glow,
          shadowOpacity: glowOpacity * 0.72,
          shadowRadius: Math.round(size * 0.32),
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      <Image
        source={{ uri: BRAND_MARK_URI }}
        resizeMode="contain"
        style={[{
          width: Math.round(size * 1.18),
          height: Math.round(size * 0.9),
        }, goldImageStyle]}
      />
    </View>
  );
});