import { Text } from "@/src/components/AppText";
import { Icon } from "@/src/components/Icon";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { useAccount, useAuth } from "@/src/context/AppState";
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
        <Icon name="book-open-page-variant" size={compact ? 31 : 38} color="#FFFDF7" />
        <View style={styles.brandSpark} />
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
  const { account } = useAccount();
  const { user } = useAuth();
  const selected = active ?? activeFromPath(pathname);
  const name = user ? account.username || account.fullName || "Reader" : "Guest";

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
          <Pressable accessibilityRole="button" accessibilityLabel="Search Quran" onPress={() => router.push("/read")} style={({ pressed, hovered }: any) => [styles.searchButton, hovered && styles.glassHover, pressed && styles.pressed]}>
            <Icon name="magnify" size={26} color="#FFFDF7" />
          </Pressable>
          <View style={styles.accountDivider} />
          <Pressable accessibilityRole="button" accessibilityLabel={user ? "Open profile" : "Sign in"} onPress={() => router.push(user ? "/settings/profile" : "/auth")} style={({ pressed, hovered }: any) => [styles.accountButton, hovered && styles.glassHover, pressed && styles.pressed]}>
            <ProfileAvatar value={user ? account.photoURL : undefined} size={40} />
            <Text style={styles.accountName} numberOfLines={1}>{name}</Text>
            <Icon name="chevron-down" size={18} color="#D8D1C2" />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  shell: { width: "100%", minHeight: 78, zIndex: 100, backgroundColor: "rgba(3,4,4,0.95)", borderBottomWidth: 1, borderBottomColor: "rgba(236,202,105,0.28)", shadowColor: "#000000", shadowOpacity: 0.42, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  inner: { width: "100%", maxWidth: 1530, minHeight: 78, alignSelf: "center", paddingHorizontal: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 28 },
  brandButton: { minWidth: 230, cursor: "pointer" },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandIcon: { width: 52, height: 48, alignItems: "center", justifyContent: "center", position: "relative" },
  brandIconCompact: { width: 44, height: 42 },
  brandSpark: { position: "absolute", right: 3, top: 2, width: 7, height: 7, backgroundColor: "#ECCA69", transform: [{ rotate: "45deg" }] },
  brandName: { color: "#FFFDF7", fontFamily: serifFont, fontSize: 29, lineHeight: 32, letterSpacing: -0.7 },
  brandNameCompact: { fontSize: 24, lineHeight: 27 },
  brandTag: { color: "#F2C94C", fontSize: 8.5, lineHeight: 10, fontWeight: "900", letterSpacing: 2.25, marginTop: 1 },
  nav: { flex: 1, flexDirection: "row", alignItems: "stretch", justifyContent: "center", gap: 16, height: 78 },
  navItem: { minWidth: 82, height: 78, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, position: "relative", cursor: "pointer" },
  navItemActive: { backgroundColor: "rgba(236,202,105,0.035)" },
  navText: { color: "#EFEAE0", fontFamily: serifFont, fontSize: 16.5, lineHeight: 22 },
  navTextActive: { color: "#F2CE52" },
  navUnderline: { position: "absolute", left: 13, right: 13, bottom: 9, height: 2, borderRadius: 2, backgroundColor: "#F2CE52", shadowColor: "#FFD760", shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  accountZone: { minWidth: 260, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12 },
  searchButton: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, borderColor: "transparent", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  accountDivider: { width: 1, height: 38, backgroundColor: "rgba(255,255,255,0.22)" },
  accountButton: { maxWidth: 190, minHeight: 54, paddingHorizontal: 10, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 9, cursor: "pointer", borderWidth: 1, borderColor: "transparent" },
  accountName: { flexShrink: 1, color: "#FFFDF7", fontFamily: serifFont, fontSize: 15.5, lineHeight: 20 },
  glassHover: { backgroundColor: "rgba(236,202,105,0.10)", borderColor: "rgba(236,202,105,0.25)" },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
