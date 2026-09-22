import { Icon } from "@/src/components/Icon";
import { SURAHS } from "@/src/data/surahs";
import { useAccount } from "@/src/context/AppState";
import { useTheme } from "@/src/theme";
import { Text, TextInput } from "@/src/components/AppText";
import { BrandMark } from "@/src/components/BrandMark";
import { ProfileMenu } from "@/src/components/ProfileMenu";
import { serifFont } from "@/src/typography";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import { memo, useState } from "react";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NavKey = "home" | "quran" | "adhkar" | "names" | "settings";

const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "home", label: "Home", href: "/(tabs)" },
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
  const [query, setQuery] = useState("");
  const { updateSettings } = useAccount();
  const { scheme } = useTheme();
  const matches = query.trim() ? SURAHS.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || String(s.number) === query.trim()).slice(0, 5) : [];
  const openSurah = (number: number) => { setQuery(""); router.push({ pathname: "/reader", params: { surah: number, ayah: 1 } }); };


  return (
    <View style={[styles.shell, { paddingTop: insets.top + 7 }]} testID="desktop-top-nav">
      <View style={[styles.inner, compact && styles.innerCompact, Platform.OS === "web" ? styles.webGlass : null]}>
        <LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0.075)", "rgba(255,255,255,0.012)", "rgba(236,202,105,0.035)"]} locations={[0, 0.42, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.glossLine} />
        <View pointerEvents="none" style={styles.goldBloom} />
        <Pressable accessibilityRole="link" accessibilityLabel="OurQuran home" onPress={() => router.replace("/(tabs)" as any)} style={[styles.brandButton, compact && styles.brandButtonCompact]}>
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
                onPress={() => router.replace(item.href as any)}
                style={({ pressed, hovered }: any) => [styles.navItem, compact && styles.navItemCompact, (current || hovered) && styles.navItemActive, pressed && styles.pressed]}
                testID={`web-nav-${item.key}`}
              >
                <Text style={[styles.navText, current && styles.navTextActive]}>{item.label}</Text>
                {current ? <View style={styles.navUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>
        {width >= 1250 ? <View style={styles.searchWrap}>
          <View style={styles.searchField}><Icon name="magnify" size={18} color="#E5E2DB" /><TextInput accessibilityLabel="Search surahs" placeholder="Search anything…" placeholderTextColor="#B1AEAA" value={query} onChangeText={setQuery} onSubmitEditing={() => { if(matches[0]) openSurah(matches[0].number); }} style={styles.searchInput} /></View>
          {query.trim() ? <View style={styles.searchResults}>{matches.length ? matches.map(s => <Pressable key={s.number} onPress={() => openSurah(s.number)} style={{ padding: 12 }}><Text style={{ color: "#FFF6D9" }}>{s.number}. {s.name}</Text></Pressable>) : <Text style={{ color: "#FFF6D9", padding: 12 }}>No matching surah</Text>}</View> : null}
        </View> : null}
        <Pressable accessibilityLabel="Notification settings" onPress={() => router.push("/settings/notifications")} style={styles.utilityButton}><Icon name="bell-outline" size={21} color="#F8D35D" /></Pressable>
        <Pressable accessibilityLabel={scheme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onPress={() => updateSettings({ theme: scheme === "dark" ? "light" : "dark" })} style={styles.utilityButton}><Icon name={scheme === "dark" ? "white-balance-sunny" : "weather-night"} size={18} color="#F8D35D" /></Pressable>
        <View style={[styles.accountZone, compact && styles.accountZoneCompact]}>
          <ProfileMenu accent="#ECCA69" compact={compact} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  shell: { width: "100%", minHeight: 76, zIndex: 100, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: "transparent" },
  inner: { width: "100%", maxWidth: 1396, minHeight: 62, alignSelf: "center", paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14, borderRadius: 32, borderWidth: 1, borderColor: "rgba(236,202,105,0.24)", backgroundColor: "rgba(5,6,7,0.58)", shadowColor: "#000000", shadowOpacity: 0.42, shadowRadius: 26, shadowOffset: { width: 0, height: 10 }, overflow: "visible" },
  webGlass: { backdropFilter: "blur(22px) saturate(1.24)", WebkitBackdropFilter: "blur(22px) saturate(1.24)" } as any,
  innerCompact: { minHeight: 66, paddingHorizontal: 16, gap: 12, borderRadius: 20 },
  glossLine: { position: "absolute", left: 22, right: 22, top: 1, height: 1, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.28)", opacity: 0.72 },
  goldBloom: { position: "absolute", width: 290, height: 110, left: -40, top: -58, borderRadius: 150, backgroundColor: "rgba(236,202,105,0.08)", shadowColor: "#ECCA69", shadowOpacity: 0.26, shadowRadius: 46, shadowOffset: { width: 0, height: 0 } },
  brandButton: { minWidth: 250, cursor: "pointer", zIndex: 2 },
  brandButtonCompact: { minWidth: 190 },
  brand: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandIcon: { width: 66, height: 48, alignItems: "center", justifyContent: "center", position: "relative" },
  brandIconCompact: { width: 54, height: 40 },
  brandName: { color: "#FFFDF7", fontFamily: serifFont, fontSize: 28, lineHeight: 31, letterSpacing: -0.65, textShadowColor: "rgba(255,255,255,0.10)", textShadowRadius: 8 },
  brandNameCompact: { fontSize: 23, lineHeight: 26 },
  brandTag: { color: "#F2C94C", fontSize: 8.5, lineHeight: 10, fontWeight: "900", letterSpacing: 2.25, marginTop: 1 },
  nav: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 58, zIndex: 2 },
  navItem: { minWidth: 84, minHeight: 38, paddingHorizontal: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer", borderWidth: 1, borderColor: "transparent" },
  navItemCompact: { minWidth: 68, paddingHorizontal: 9 },
  navItemActive: { backgroundColor: "rgba(236,202,105,0.22)", borderColor: "rgba(255,215,85,0.70)", shadowColor: "#ECCA69", shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  navText: { color: "#F1ECE3", fontSize: 15, lineHeight: 22, fontWeight: "600" },
  navTextActive: { color: "#F5D15A" },
  navUnderline: { position: "absolute", left: 17, right: 17, bottom: 3, height: 2, borderRadius: 2, backgroundColor: "#F2CE52", shadowColor: "#FFD760", shadowOpacity: 0.95, shadowRadius: 9, shadowOffset: { width: 0, height: 0 } },
  accountZone: { minWidth: 140, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", zIndex: 20, paddingRight: 2 },
  accountZoneCompact: { minWidth: 76 },
  searchWrap: { width: 212, zIndex: 30 },
  searchField: { borderWidth: 1, borderColor: "#494940", borderRadius: 20, height: 39, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "rgba(15,17,16,0.7)" },
  searchInput: { flex: 1, minWidth: 0, color: "#FFFFFF", fontSize: 13, outlineStyle: "none" } as any,
  searchResults: { position: "absolute", top: 44, left: 0, right: 0, backgroundColor: "#091116", borderRadius: 12, borderWidth: 1, borderColor: "#AB913C", overflow: "hidden" },
  utilityButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: "rgba(236,202,105,0.4)", alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});