import { Text } from "@/src/components/AppText";
import { BrandLockup } from "@/src/components/BrandLockup";
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
    <View style={[styles.wrapper, { paddingTop: insets.top + 10 }]}>
      <View style={styles.bar}>
        <View style={styles.sideZone}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Finish reading and return home"
            onPress={onBack}
            testID="reader-leave"
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: t.accent + "72", backgroundColor: "rgba(4,5,8,0.78)" },
              pressed && styles.pressed,
            ]}
          >
            <Icon name="arrow-left" color="#FFFFFF" size={24} />
          </Pressable>

          <View style={styles.brandWrap}>
            <BrandLockup tint={t.accent} size={56} lightText />
          </View>
        </View>

        <View style={styles.location}>
          <Text style={styles.surahName} numberOfLines={1}>{surahName}</Text>
          <View style={styles.ayahPill}>
            <Text style={[styles.ayahMeta, { color: t.accent }]}>Ayah {ayah} of {totalAyahs}</Text>
          </View>
        </View>

        <View style={[styles.sideZone, styles.sideZoneRight]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open reader settings"
            onPress={onOpenSettings}
            testID="reader-quick-settings-open"
            style={({ pressed }) => [
              styles.settingsButton,
              { borderColor: t.accent + "66", backgroundColor: "rgba(4,5,8,0.78)" },
              pressed && styles.pressed,
            ]}
          >
            <Icon name="tune-variant" color={t.accent} size={22} />
            <Text style={styles.settingsLabel}>Reader settings</Text>
          </Pressable>
        </View>
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
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  sideZone: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sideZoneRight: {
    justifyContent: "flex-end",
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  brandWrap: {
    minWidth: 220,
    alignItems: "flex-start",
  },
  location: {
    width: 360,
    minWidth: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  surahName: {
    color: "#FFFFFF",
    fontFamily: serifFont,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.7,
    textAlign: "center",
  },
  ayahPill: {
    minHeight: 26,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginTop: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  ayahMeta: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "900",
    letterSpacing: 0.35,
    textAlign: "center",
  },
  settingsButton: {
    minWidth: 150,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  settingsLabel: {
    color: "#FFFFFF",
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "900",
  },
});
