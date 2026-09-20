import { Text } from "@/src/components/AppText";
import { BrandMark } from "@/src/components/BrandMark";
import { ProfileMenu } from "@/src/components/ProfileMenu";
import { serifFont } from "@/src/typography";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import { memo } from "react";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Shared adaptive glass navigation.
type NavKey = "home" | "quran" | "adhkar" | "names" | "settings";

const NAV: { key: NavKey; label: string; href: "/" | "/read" | "/adhkar" | "/names" | "/preferences" }[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "quran", label: "Quran", href: "/read" },
  { key: "adhkar", label: "Adhkar", href: "/adhkar" },
  { key: "names", label: "Names", href: "/names" },
  { key: "settings", label: "Settings", href: "/preferences" },
];

function activeFromPath(pathname: string): NavKey {
  if (pathname === "/reader" || pathname.startsWith("/read")) return "quran";
  if (pathname.startsWith("/adhkar")) return "adhkar";
  if (pathname.startsWith("/names") || pathname.startsWith("/name/")) return "names";
  if (pathname.startsWith("/preferences") || pathname.startsWith("/settings")) return "settings";
  return "home";
}

const webGlass = Platform.OS === "web"
  ? ({
      backdropFilter: "blur(22px) saturate(1.24)",
      WebkitBackdropFilter: "blur(22px) saturate(1.24)",
    } as any)
  : undefined;

export const WebBrand = memo(function WebBrand({ compact = false }: { compact?: boolean }) {
  return (
    <View pointerEvents="none" style={[styles.brand, compact && styles.brandCompact]}>
      <View style={[styles.brandIcon, compact && styles.brandIconCompact]}>
        <BrandMark size={compact ? 45 : 54} tint="#ECCA69" glow="#ECCA69" intensity="strong" variant="mark" />
      </View>
      <View style={styles.brandCopy}>
        <Text style={[styles.brandName, compact && styles.brandNameCompact]}>OurQuran</Text>
        {!compact ? <Text style={styles.brandTag}>READ AND ASCEND</Text> : null}
      </View>
    </View>
  );
});

export const WebTopNav = memo(function WebTopNav({ active }: { active?: NavKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 1240;
  const tight = width < 1080;
  const selected = active ?? activeFromPath(pathname);

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]} testID="desktop-top-nav">
      <View style={[styles.inner, webGlass, compact && styles.innerCompact]}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.075)", "rgba(236,202,105,0.026)", "rgba(0,0,0,0.08)"]}
          locations={[0, 0.44, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.96, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.glassTopSheen} />
        <View pointerEvents="none" style={styles.edgeGlow} />

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="OurQuran home"
          onPress={() => router.push("/")}
          style={({ pressed, hovered }: any) => [
            styles.brandButton,
            compact && styles.brandButtonCompact,
            hovered && styles.brandButtonHover,
            pressed && styles.pressed,
          ]}
        >
          <WebBrand compact={compact} />
        </Pressable>

        <View style={[styles.nav, compact && styles.navCompact]} accessibilityRole="tablist">
          {NAV.map((item) => {
            const current = selected === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: current }}
                onPress={() => router.push(item.href)}
                style={({ pressed, hovered }: any) => [
                  styles.navItem,
                  compact && styles.navItemCompact,
                  (current || hovered) && styles.navItemActive,
                  current && styles.navItemCurrent,
                  pressed && styles.pressed,
                ]}
                testID={`web-nav-${item.key}`}
              >
                <Text style={[styles.navText, compact && styles.navTextCompact, current && styles.navTextActive]}>{item.label}</Text>
                {current ? <View style={styles.navUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.accountZone, compact && styles.accountZoneCompact]}>
          <ProfileMenu accent="#ECCA69" compact={tight} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    minHeight: 86,
    zIndex: 100,
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: "transparent",
  },
  inner: {
    width: "100%",
    maxWidth: 1540,
    minHeight: 70,
    alignSelf: "center",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    position: "relative",
    overflow: "visible",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(236,202,105,0.24)",
    backgroundColor: "rgba(6,7,7,0.60)",
    shadowColor: "#D9B64D",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  innerCompact: { minHeight: 66, paddingHorizontal: 14, gap: 10, borderRadius: 21 },
  glassTopSheen: {
    position: "absolute",
    left: 22,
    right: 22,
    top: 1,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,249,224,0.36)",
    opacity: 0.72,
  },
  edgeGlow: {
    position: "absolute",
    left: "18%",
    right: "18%",
    bottom: -1,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(239,196,66,0.40)",
    shadowColor: "#ECCA69",
    shadowOpacity: 0.72,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  brandButton: {
    minWidth: 255,
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 17,
    cursor: "pointer",
  },
  brandButtonCompact: { minWidth: 184, paddingHorizontal: 4 },
  brandButtonHover: { backgroundColor: "rgba(236,202,105,0.045)" },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandCompact: { gap: 8 },
  brandIcon: { width: 72, height: 54, alignItems: "center", justifyContent: "center", position: "relative" },
  brandIconCompact: { width: 58, height: 46 },
  brandCopy: { justifyContent: "center" },
  brandName: {
    color: "#FFFDF7",
    fontFamily: serifFont,
    fontSize: 29,
    lineHeight: 31,
    letterSpacing: -0.75,
    textShadowColor: "rgba(255,255,255,0.10)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  brandNameCompact: { fontSize: 23.5, lineHeight: 26 },
  brandTag: { color: "#F2C94C", fontSize: 8.4, lineHeight: 10, fontWeight: "900", letterSpacing: 2.25, marginTop: 1 },
  nav: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 58 },
  navCompact: { gap: 3 },
  navItem: {
    minWidth: 86,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    position: "relative",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "transparent",
    cursor: "pointer",
  },
  navItemCompact: { minWidth: 68, height: 44, paddingHorizontal: 8, borderRadius: 13 },
  navItemActive: { backgroundColor: "rgba(236,202,105,0.055)", borderColor: "rgba(236,202,105,0.12)" },
  navItemCurrent: {
    backgroundColor: "rgba(212,175,55,0.105)",
    borderColor: "rgba(236,202,105,0.26)",
    shadowColor: "#ECCA69",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  navText: { color: "#EFEAE0", fontFamily: serifFont, fontSize: 16.5, lineHeight: 22, fontWeight: "600" },
  navTextCompact: { fontSize: 15, lineHeight: 19 },
  navTextActive: { color: "#F4D15A" },
  navUnderline: {
    position: "absolute",
    width: 28,
    bottom: 5,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#F2CE52",
    shadowColor: "#FFD760",
    shadowOpacity: 0.95,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  accountZone: { minWidth: 220, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  accountZoneCompact: { minWidth: 116 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
