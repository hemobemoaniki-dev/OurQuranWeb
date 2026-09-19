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
  const glowOpacity = intensity === "strong" ? 0.34 : intensity === "soft" ? 0.14 : 0.22;
  const iconSize = Math.round(size * 0.72);
  const haloSize = Math.round(size * 0.84);
  const sparkle = Math.max(5, Math.round(size * 0.105));

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
          width: haloSize,
          height: haloSize,
          borderRadius: haloSize / 2,
          backgroundColor: glow,
          opacity: glowOpacity * 0.42,
          shadowColor: glow,
          shadowOpacity: glowOpacity,
          shadowRadius: Math.round(size * 0.34),
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      <View
        style={{
          position: "absolute",
          width: Math.round(size * 0.62),
          height: Math.round(size * 0.62),
          borderRadius: size,
          borderWidth: 1,
          borderColor: tint + "52",
          opacity: 0.88,
        }}
      />
      <Icon name="mosque" size={iconSize} color={tint} />
      <View
        style={{
          position: "absolute",
          right: Math.round(size * 0.07),
          top: Math.round(size * 0.10),
          width: sparkle,
          height: sparkle,
          backgroundColor: tint,
          transform: [{ rotate: "45deg" }],
          opacity: 0.92,
          shadowColor: glow,
          shadowOpacity: 0.55,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </View>
  );
});
