import { Text } from "@/src/components/AppText";
import { BrandMark } from "@/src/components/BrandMark";
import { Icon } from "@/src/components/Icon";
import type { ReaderTheme } from "@/src/lib/reader-themes";
import { serifFont } from "@/src/typography";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const ReaderHeader = memo(function ReaderHeader({
  theme: t,
  surahName,
  ayah,
  totalAyahs,
  onBack,
  onOpenSettings,
}: {
  theme: ReaderTheme;
  surahName: string;
  ayah: number;
  totalAyahs: number;
  onBack: () => void;
  onOpenSettings: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 12 }]}>
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave reader"
          onPress={onBack}
          testID="reader-leave"
          style={({ pressed }) => [
            styles.iconButton,
            { borderColor: t.accent + "66", backgroundColor: "rgba(4,5,8,0.72)" },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="arrow-left" color="#FFFFFF" size={22} />
        </Pressable>

        <View style={styles.brand}>
          <BrandMark size={43} tint={t.accent} glow={t.accent} intensity="strong" />
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>OurQuran</Text>
            <Text style={[styles.brandTag, { color: t.accent }]}>READ AND ASCEND</Text>
          </View>
        </View>

        <View style={styles.location}>
          <Text style={styles.surahName} numberOfLines={1}>{surahName}</Text>
          <Text style={styles.ayahMeta}>Ayah {ayah} / {totalAyahs}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open reader settings"
          onPress={onOpenSettings}
          testID="reader-quick-settings-open"
          style={({ pressed }) => [
            styles.settingsButton,
            { borderColor: t.accent + "55", backgroundColor: "rgba(4,5,8,0.72)" },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="tune-variant" color={t.accent} size={21} />
          <Text style={styles.settingsLabel}>Reader</Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    maxWidth: 1500,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  bar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minWidth: 190,
  },
  brandCopy: { gap: 0 },
  brandName: {
    color: "#FFFFFF",
    fontFamily: serifFont,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.35,
  },
  brandTag: {
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: "900",
    letterSpacing: 1.45,
  },
  location: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  surahName: {
    color: "#FFFFFF",
    fontFamily: serifFont,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  ayahMeta: {
    color: "#D9D5DE",
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  settingsButton: {
    minWidth: 98,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  settingsLabel: {
    color: "#FFFFFF",
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "800",
  },
});
