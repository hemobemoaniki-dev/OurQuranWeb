import { memo } from "react";
import { View } from "react-native";

import { Text } from "@/src/components/AppText";
import { BrandMark } from "@/src/components/BrandMark";

export const BrandLockup = memo(function BrandLockup({
  tint,
  size = 58,
  orientation = "horizontal",
  lightText = false,
}: {
  tint: string;
  size?: number;
  orientation?: "horizontal" | "vertical";
  lightText?: boolean;
}) {
  const vertical = orientation === "vertical";
  return (
    <View
      style={{
        flexDirection: vertical ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: vertical ? 5 : 10,
      }}
      pointerEvents="none"
    >
      <BrandMark size={size} tint={tint} glow={tint} intensity="strong" />
      <View style={{ alignItems: vertical ? "center" : "flex-start", minWidth: 0 }}>
        <Text
          style={{
            color: lightText ? "#FFFFFF" : "#17130D",
            fontSize: vertical ? 17 : 24,
            lineHeight: vertical ? 20 : 28,
            fontWeight: "900",
            letterSpacing: -0.55,
          }}
          numberOfLines={1}
        >
          OurQuran
        </Text>
        <Text
          style={{
            color: tint,
            fontSize: vertical ? 6.8 : 8.5,
            lineHeight: vertical ? 9 : 11,
            fontWeight: "900",
            letterSpacing: vertical ? 1.35 : 1.65,
            marginTop: 1,
          }}
          numberOfLines={1}
        >
          READ AND ASCEND
        </Text>
      </View>
    </View>
  );
});
