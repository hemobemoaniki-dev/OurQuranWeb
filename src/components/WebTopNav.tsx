import { Text } from "@/src/components/AppText";
import { BrandMark } from "@/src/components/BrandMark";
import { ProfileMenu } from "@/src/components/ProfileMenu";
import { serifFont } from "@/src/typography";
import { usePathname, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
  const selected = active ?? activeFromPath(pathname);

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]} testID="desktop-top-nav">
      <View style={styles.inner}>
        <Pressable accessibilityRole="link" accessibilityLabel="OurQuran home" onPress={() => router.push("/")} style={styles.brandButton}>
          <WebBrand />
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
                style={({ pressed, hovered }: any) => [styles.navItem, (current || hovered) && styles.navItemActive, pressed && styles.pressed]}
                testID={`web-nav-${item.key}`}
              >
                <Text style={[styles.navText, current && styles.navTextActive]}>{item.label}</Text>
                {current ? <View style={styles.navUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.accountZone}>
          <ProfileMenu accent="#ECCA69" />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  shell: { width: "100%", minHeight: 78, zIndex: 100, backgroundColor: "rgba(3,4,4,0.95)", borderBottomWidth: 1, borderBottomColor: "rgba(236,202,105,0.28)", shadowColor: "#000000", shadowOpacity: 0.42, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  inner: { width: "100%", maxWidth: 1530, minHeight: 78, alignSelf: "center", paddingHorizontal: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 28 },
  brandButton: { minWidth: 250, cursor: "pointer" },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandIcon: { width: 68, height: 50, alignItems: "center", justifyContent: "center", position: "relative" },
  brandIconCompact: { width: 58, height: 44 },
  brandName: { color: "#FFFDF7", fontFamily: serifFont, fontSize: 29, lineHeight: 32, letterSpacing: -0.7 },
  brandNameCompact: { fontSize: 24, lineHeight: 27 },
  brandTag: { color: "#F2C94C", fontSize: 8.5, lineHeight: 10, fontWeight: "900", letterSpacing: 2.25, marginTop: 1 },
  nav: { flex: 1, flexDirection: "row", alignItems: "stretch", justifyContent: "center", gap: 16, height: 78 },
  navItem: { minWidth: 82, height: 78, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, position: "relative", cursor: "pointer" },
  navItemActive: { backgroundColor: "rgba(236,202,105,0.035)" },
  navText: { color: "#EFEAE0", fontFamily: serifFont, fontSize: 16.5, lineHeight: 22 },
  navTextActive: { color: "#F2CE52" },
  navUnderline: { position: "absolute", left: 13, right: 13, bottom: 9, height: 2, borderRadius: 2, backgroundColor: "#F2CE52", shadowColor: "#FFD760", shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  accountZone: { minWidth: 205, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12 },
  searchButton: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, borderColor: "transparent", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  accountDivider: { width: 1, height: 38, backgroundColor: "rgba(255,255,255,0.22)" },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
