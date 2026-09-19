import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { View } from "react-native";

import { Icon } from "@/src/components/Icon";

type BrandMarkProps = {
  size?: number;
  tint: string;
  glow?: string;
  intensity?: "soft" | "medium" | "strong";
};

export const BrandMark = memo(function BrandMark({
  size = 48,
  tint,
  glow = tint,
  intensity = "medium",
}: BrandMarkProps) {
  const glowOpacity = intensity === "strong" ? 0.44 : intensity === "soft" ? 0.18 : 0.3;
  const outer = Math.round(size * 0.92);
  const inner = Math.round(size * 0.68);
  const iconSize = Math.round(size * 0.62);
  const sparkle = Math.max(6, Math.round(size * 0.11));

  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          backgroundColor: glow,
          opacity: glowOpacity * 0.24,
          shadowColor: glow,
          shadowOpacity: glowOpacity,
          shadowRadius: Math.round(size * 0.42),
          shadowOffset: { width: 0, height: 0 },
        }}
      />

      <LinearGradient
        colors={[tint + "4D", tint + "16", "rgba(0,0,0,0.08)"]}
        start={{ x: 0.15, y: 0.08 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          position: "absolute",
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: 1,
          borderColor: tint + "65",
          shadowColor: glow,
          shadowOpacity: glowOpacity * 0.55,
          shadowRadius: Math.round(size * 0.24),
          shadowOffset: { width: 0, height: 0 },
        }}
      />

      <View
        style={{
          position: "absolute",
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          borderWidth: 1.5,
          borderColor: tint + "8A",
          backgroundColor: "rgba(255,255,255,0.025)",
          shadowColor: glow,
          shadowOpacity: glowOpacity * 0.6,
          shadowRadius: Math.round(size * 0.14),
          shadowOffset: { width: 0, height: 0 },
        }}
      />

      <Icon name="mosque" size={iconSize} color={tint} />

      <View
        style={{
          position: "absolute",
          left: Math.round(size * 0.13),
          bottom: Math.round(size * 0.16),
          width: Math.round(size * 0.46),
          height: 2,
          borderRadius: 2,
          backgroundColor: tint,
          opacity: 0.7,
          shadowColor: glow,
          shadowOpacity: 0.48,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 0 },
        }}
      />

      <View
        style={{
          position: "absolute",
          right: Math.round(size * 0.04),
          top: Math.round(size * 0.07),
          width: sparkle,
          height: sparkle,
          backgroundColor: tint,
          transform: [{ rotate: "45deg" }],
          opacity: 0.96,
          shadowColor: glow,
          shadowOpacity: 0.8,
          shadowRadius: Math.max(5, Math.round(size * 0.09)),
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </View>
  );
});
