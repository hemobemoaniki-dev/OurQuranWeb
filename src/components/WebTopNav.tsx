import { Text } from "@/src/components/AppText";
import { BrandMark } from "@/src/components/BrandMark";
import { ProfileMenu } from "@/src/components/ProfileMenu";
import { serifFont } from "@/src/typography";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import { memo } from "react";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export const WebBrand = memo(function WebBrand({ compact = false }: { compact?: boolean }) {
  return (
    <View pointerEvents="none" style={styles.brand}>
      <View style={[styles.brandIcon, compact && styles.brandIconCompact]}>
        <BrandMark size={compact ? 42 : 50} tint="#ECCA69" glow="#ECCA69" intensity="medium" variant="mark" />
      </View>
      <View>
        <Text style={[styles.brandName, compact && styles.brandNameCompact]}>OurQuran</Text>
        <Text style={styles.brandTag}>READ AND ASCEND</Text>
      </View>
    </View>
  );
});

export const WebTopNav = memo(function WebTopNav({ active }: { active?: NavKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 1220;
  const selected = active ?? activeFromPath(pathname);

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]} testID="desktop-top-nav">
      <View style={[styles.inner, compact && styles.innerCompact, Platform.OS === "web" ? styles.webGlass : null]}>
        <LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0.075)", "rgba(255,255,255,0.012)", "rgba(236,202,105,0.035)"]} locations={[0, 0.42, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.glossLine} />
        <View pointerEvents="none" style={styles.goldBloom} />
        <Pressable accessibilityRole="link" accessibilityLabel="OurQuran home" onPress={() => router.push("/")} style={[styles.brandButton, compact && styles.brandButtonCompact]}>
          <WebBrand compact={compact} />
        </Pressable>
        <View style={styles.nav} accessibilityRole="tablist">
          {NAV.map((item) => {
            const current = selected === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: current }}
                onPress={() => router.push(item.href)}
                style={({ pressed, hovered }: any) => [styles.navItem, compact && styles.navItemCompact, (current || hovered) && styles.navItemActive, pressed && styles.pressed]}
                testID={`web-nav-${item.key}`}
              >
                <Text style={[styles.navText, current && styles.navTextActive]}>{item.label}</Text>
                {current ? <View style={styles.navUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.accountZone, compact && styles.accountZoneCompact]}>
          <ProfileMenu accent="#ECCA69" compact={compact} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  shell: { width: "100%", minHeight: 92, zIndex: 100, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: "transparent" },
  inner: { width: "100%", maxWidth: 1540, minHeight: 72, alignSelf: "center", paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 22, borderRadius: 24, borderWidth: 1, borderColor: "rgba(236,202,105,0.24)", backgroundColor: "rgba(5,6,7,0.58)", shadowColor: "#000000", shadowOpacity: 0.42, shadowRadius: 26, shadowOffset: { width: 0, height: 10 }, overflow: "visible" },
  webGlass: { backdropFilter: "blur(22px) saturate(1.24)", WebkitBackdropFilter: "blur(22px) saturate(1.24)" } as any,
  innerCompact: { minHeight: 66, paddingHorizontal: 16, gap: 12, borderRadius: 20 },
  glossLine: { position: "absolute", left: 22, right: 22, top: 1, height: 1, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.28)", opacity: 0.72 },
  goldBloom: { position: "absolute", width: 290, height: 110, left: -40, top: -58, borderRadius: 150, backgroundColor: "rgba(236,202,105,0.08)", shadowColor: "#ECCA69", shadowOpacity: 0.26, shadowRadius: 46, shadowOffset: { width: 0, height: 0 } },
  brandButton: { minWidth: 244, cursor: "pointer", zIndex: 2 },
  brandButtonCompact: { minWidth: 190 },
  brand: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandIcon: { width: 66, height: 48, alignItems: "center", justifyContent: "center", position: "relative" },
  brandIconCompact: { width: 54, height: 40 },
  brandName: { color: "#FFFDF7", fontFamily: serifFont, fontSize: 28, lineHeight: 31, letterSpacing: -0.65, textShadowColor: "rgba(255,255,255,0.10)", textShadowRadius: 8 },
  brandNameCompact: { fontSize: 23, lineHeight: 26 },
  brandTag: { color: "#F2C94C", fontSize: 8.5, lineHeight: 10, fontWeight: "900", letterSpacing: 2.25, marginTop: 1 },
  nav: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 64, zIndex: 2 },
  navItem: { minWidth: 84, minHeight: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer", borderWidth: 1, borderColor: "transparent" },
  navItemCompact: { minWidth: 68, paddingHorizontal: 9 },
  navItemActive: { backgroundColor: "rgba(236,202,105,0.085)", borderColor: "rgba(236,202,105,0.20)", shadowColor: "#ECCA69", shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  navText: { color: "#F1ECE3", fontFamily: serifFont, fontSize: 16.5, lineHeight: 22, fontWeight: "600" },
  navTextActive: { color: "#F5D15A" },
  navUnderline: { position: "absolute", left: 17, right: 17, bottom: 3, height: 2, borderRadius: 2, backgroundColor: "#F2CE52", shadowColor: "#FFD760", shadowOpacity: 0.95, shadowRadius: 9, shadowOffset: { width: 0, height: 0 } },
  accountZone: { minWidth: 224, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", zIndex: 20, paddingRight: 2 },
  accountZoneCompact: { minWidth: 76 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});