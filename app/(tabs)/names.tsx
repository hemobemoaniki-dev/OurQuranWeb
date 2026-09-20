import Head from "expo-router/head";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";

import { Text, TextInput } from "@/src/components/AppText";
import { Icon } from "@/src/components/Icon";
import { WebPageBackdrop } from "@/src/components/WebPageBackdrop";
import { useAccount } from "@/src/context/AppState";
import { NAMES_99, nameOfDay, type DivineName } from "@/src/data/names99";
import { localDayNumber } from "@/src/lib/dates";
import { makeStyles, useTheme } from "@/src/theme";
import { arabicFont, serifFont } from "@/src/typography";

const ARCH_BG = require("../../assets/reader/solar-ember.jpg");
const FILTERS = ["All", "Mercy", "Guidance", "Forgiveness", "Power", "Protection", "Sustenance", "Justice", "Beauty"] as const;
type NameFilter = typeof FILTERS[number];

const FILTER_WORDS: Record<Exclude<NameFilter, "All">, string[]> = {
  Mercy: ["merc", "compassion", "kind", "gentle", "forbearing"],
  Guidance: ["guide", "wisdom", "truth", "knowing", "aware"],
  Forgiveness: ["forgiv", "pardon", "repent"],
  Power: ["king", "mighty", "power", "strong", "supreme", "prevail", "compeller"],
  Protection: ["protect", "guardian", "preserv", "security", "watch"],
  Sustenance: ["provid", "sustain", "nourish", "enrich", "bestow"],
  Justice: ["just", "judge", "equitable", "reckon", "account"],
  Beauty: ["beautiful", "glory", "majestic", "generous", "light", "peace", "love"],
};

const VIEWED_KEY = "ourquran_names_viewed_v1";

function readNumbers(key: string) {
  if (Platform.OS !== "web" || typeof window === "undefined") return new Set<number>();
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return new Set<number>(Array.isArray(value) ? value.filter((n) => Number.isInteger(n)) : []);
  } catch {
    return new Set<number>();
  }
}

function storeNumbers(key: string, value: Set<number>) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify([...value])); } catch {}
}

export default function Names() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 1080;
  const [day, setDay] = useState(() => localDayNumber());
  const featured = nameOfDay(day);
  const [selectedNumber, setSelectedNumber] = useState(featured.number);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NameFilter>("All");
  const { account, toggleNameBookmark } = useAccount();
  const favorites = useMemo(() => new Set(account.appState.nameBookmarks.map((item) => item.nameNumber)), [account.appState.nameBookmarks]);
  const [viewed, setViewed] = useState<Set<number>>(() => readNumbers(VIEWED_KEY));

  useEffect(() => {
    const timer = setInterval(() => setDay(localDayNumber()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const selected = NAMES_99.find((item) => item.number === selectedNumber) ?? featured;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return NAMES_99.filter((item) => {
      const haystack = `${item.number} ${item.transliteration} ${item.arabic} ${item.meaning} ${item.description}`.toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (filter === "All") return true;
      return FILTER_WORDS[filter].some((word) => haystack.includes(word));
    });
  }, [filter, query]);

  const selectName = (item: DivineName) => {
    setSelectedNumber(item.number);
    setViewed((current) => {
      const next = new Set(current).add(item.number);
      storeNumbers(VIEWED_KEY, next);
      return next;
    });
  };

  const toggleFavorite = (number: number) => {
    toggleNameBookmark(number);
  };

  const nextName = () => selectName(NAMES_99[selected.number % NAMES_99.length]);
  const learnedPct = Math.round((viewed.size / NAMES_99.length) * 100);

  return (
    <>
      <Head><title>99 Names of Allah — OurQuran</title><meta name="description" content="Explore the 99 Names of Allah with Arabic, meanings, reflection, search and learning progress." /></Head>
      <View style={styles.root}>
        {desktop ? <WebPageBackdrop intensity="strong" /> : null}
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroRow, !desktop && styles.stack]}>
            <View style={styles.heroStory}>
              <Image source={ARCH_BG} style={styles.heroImage} contentFit="cover" />
              <View pointerEvents="none" style={styles.heroScrim} />
              <Text style={styles.salam}>As-salamu alaykum,</Text>
              <Text style={styles.heroTitle}><Text style={styles.heroNumber}>99 </Text>Names of Allah</Text>
              <Text style={styles.heroKicker}>Beautiful Names. Infinite Meanings. A Deeper Connection.</Text>
              <Text style={styles.heroCopy}>Explore Asma ul-Husna, understand their meanings, and reflect on their wisdom to bring more presence, peace, and purpose into your life.</Text>
            </View>

            <View style={[styles.dayCard, !desktop && styles.mobileFull]} testID="name-of-day-card">
              <View style={styles.cardHead}>
                <Text style={styles.cardEyebrow}>NAME OF THE DAY</Text>
                <Icon name="calendar-outline" size={18} color={colors.gold} />
              </View>
              <Text style={styles.dayArabic}>{featured.arabic}</Text>
              <Text style={styles.dayName}>{featured.transliteration}</Text>
              <Text style={styles.dayMeaning}>{featured.meaning}</Text>
              <Pressable accessibilityRole="button" onPress={() => selectName(featured)} style={({ pressed }) => [styles.goldButton, pressed && styles.pressed]}>
                <Text style={styles.goldButtonText}>Read reflection</Text>
                <Icon name="arrow-right" size={18} color={colors.onBrandPrimary} />
              </Pressable>
            </View>

            <View style={[styles.progressCard, !desktop && styles.mobileFull]}>
              <Text style={styles.cardEyebrow}>YOUR PROGRESS</Text>
              <View style={styles.progressRing}>
                <Text style={styles.progressValue}>{learnedPct}%</Text>
                <Text style={styles.progressLabel}>explored</Text>
              </View>
              <Text style={styles.progressCount}><Text style={styles.progressStrong}>{viewed.size}</Text> names explored</Text>
              <Text style={styles.progressCount}><Text style={styles.progressStrong}>{99 - viewed.size}</Text> remaining</Text>
              <Text style={styles.progressQuote}>“To Allah belong the most beautiful names.”</Text>
            </View>
          </View>

          <View style={[styles.toolbar, !desktop && styles.toolbarStack]}>
            <View style={[styles.searchShell, !desktop && styles.mobileFull]}>
              <Icon name="magnify" size={21} color={colors.gold} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search in Arabic, English, or meaning…" placeholderTextColor={colors.muted} style={styles.searchInput} testID="names-search" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {FILTERS.map((item) => (
                <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterChipActive]} testID={`names-filter-${item.toLowerCase()}`}>
                  <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.contentRow, !desktop && styles.stack]}>
            <View style={styles.namesColumn}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>All 99 Names</Text>
                <Text style={styles.resultText}>Showing {filtered.length} names</Text>
              </View>
              {filtered.length ? (
                <View style={styles.grid}>
                  {filtered.map((item) => {
                    const active = selected.number === item.number;
                    const saved = favorites.has(item.number);
                    return (
                      <Pressable key={item.number} accessibilityRole={Platform.OS === "web" ? undefined : "button"} onPress={() => selectName(item)} style={({ pressed }) => [styles.nameCard, active && styles.nameCardActive, pressed && styles.pressed]} testID={`name-row-${item.number}`}>
                        <View style={styles.nameCardTop}>
                          <View style={styles.numBadge}><Text style={styles.numText}>{item.number}</Text></View>
                          <Pressable accessibilityRole="button" accessibilityLabel={saved ? "Remove from favorites" : "Add to favorites"} onPress={(event) => { event.stopPropagation(); toggleFavorite(item.number); }} hitSlop={8}>
                            <Icon name={saved ? "heart" : "heart-outline"} size={21} color={saved ? colors.gold : colors.muted} />
                          </Pressable>
                        </View>
                        <Text style={styles.nameArabic}>{item.arabic}</Text>
                        <Text style={styles.nameEnglish}>{item.transliteration}</Text>
                        <Text style={styles.nameMeaning}>{item.meaning}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}><Icon name="magnify-close" size={28} color={colors.gold} /><Text style={styles.emptyText}>No names match this search.</Text></View>
              )}
            </View>

            <View style={[styles.detailCard, !desktop && styles.mobileFull]} testID="name-detail-panel">
              <View style={styles.detailHead}>
                <View style={styles.detailNumber}><Text style={styles.detailNumberText}>{selected.number}</Text></View>
                <View style={styles.detailTitleCopy}>
                  <Text style={styles.detailTitle}>{selected.transliteration}</Text>
                  <Text style={styles.detailSubtitle}>{selected.meaning}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Toggle favorite" onPress={() => toggleFavorite(selected.number)} style={styles.detailIconButton}>
                  <Icon name={favorites.has(selected.number) ? "heart" : "heart-outline"} size={24} color={colors.gold} />
                </Pressable>
              </View>
              <View style={styles.detailArabicFrame}><Text style={styles.detailArabic}>{selected.arabic}</Text></View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Meaning</Text>
                <Text style={styles.detailBody}>{selected.description}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Reflection</Text>
                <Text style={styles.detailBody}>Pause with this name today. Notice where its meaning already appears in your life, then carry that awareness into your du’a and actions.</Text>
              </View>
              <View style={styles.benefitsBox}>
                <Text style={styles.detailLabel}>Benefits of reflection</Text>
                {["Strengthens faith and reliance on Allah", "Brings clarity and purpose to daily life", "Makes remembrance more intentional"].map((line) => (
                  <View key={line} style={styles.benefitLine}><Icon name="star-four-points-outline" size={17} color={colors.gold} /><Text style={styles.benefitText}>{line}</Text></View>
                ))}
              </View>
              <View style={styles.detailActions}>
                <Pressable accessibilityRole="button" onPress={() => toggleFavorite(selected.number)} style={({ pressed }) => [styles.goldButton, styles.detailFavorite, pressed && styles.pressed]}>
                  <Icon name={favorites.has(selected.number) ? "heart" : "heart-outline"} size={18} color={colors.onBrandPrimary} />
                  <Text style={styles.goldButtonText}>{favorites.has(selected.number) ? "Saved to favorites" : "Add to favorites"}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={nextName} style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}>
                  <Text style={styles.nextButtonText}>Next name</Text><Icon name="arrow-right" size={18} color={colors.gold} />
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface, position: "relative" },
  page: { width: "100%", maxWidth: 1510, alignSelf: "center", paddingHorizontal: 34, paddingTop: 30, paddingBottom: 54, gap: 20, zIndex: 1 },
  stack: { flexDirection: "column" },
  mobileFull: { width: "100%" },
  toolbarStack: { flexDirection: "column", alignItems: "stretch" },
  heroRow: { minHeight: 280, flexDirection: "row", gap: 16, alignItems: "stretch" },
  heroStory: { flex: 1.5, minHeight: 280, borderRadius: 24, overflow: "hidden", padding: 28, justifyContent: "center", borderWidth: 1, borderColor: c.goldBorder, backgroundColor: c.surfaceSecondary },
  heroImage: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, opacity: 0.36 },
  heroScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(2,3,3,0.72)" },
  salam: { color: c.gold, fontFamily: serifFont, fontSize: 19, lineHeight: 24, fontWeight: "700" },
  heroTitle: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 52, lineHeight: 59, fontWeight: "700", marginTop: 4, textShadowColor: "rgba(0,0,0,0.72)", textShadowRadius: 12 },
  heroNumber: { color: c.gold },
  heroKicker: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 17, lineHeight: 23, fontWeight: "800", marginTop: 8, textShadowColor: "rgba(0,0,0,0.72)", textShadowRadius: 10 },
  heroCopy: { color: "#F1EBDD", maxWidth: 640, fontSize: 15.5, lineHeight: 24, marginTop: 13, fontWeight: "600", textShadowColor: "rgba(0,0,0,0.72)", textShadowRadius: 9 },
  dayCard: { width: 320, minHeight: 280, padding: 22, borderRadius: 22, borderWidth: 1, borderColor: c.goldBorder, backgroundColor: c.surfaceSecondary, alignItems: "center", shadowColor: c.gold, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  cardHead: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardEyebrow: { color: c.gold, fontSize: 12, lineHeight: 16, fontWeight: "900", letterSpacing: 1.1 },
  dayArabic: { color: c.gold, fontFamily: arabicFont, fontSize: 43, lineHeight: 68, textAlign: "center", writingDirection: "rtl", marginTop: 8 },
  dayName: { color: c.onSurface, fontFamily: serifFont, fontSize: 25, lineHeight: 31, fontWeight: "700" },
  dayMeaning: { color: c.muted, fontSize: 14, lineHeight: 19, marginTop: 2, marginBottom: 15 },
  goldButton: { minHeight: 46, borderRadius: 14, backgroundColor: c.brandPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, cursor: "pointer", shadowColor: c.gold, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  goldButtonText: { color: c.onBrandPrimary, fontSize: 14.5, lineHeight: 19, fontWeight: "900" },
  progressCard: { width: 260, minHeight: 280, padding: 22, borderRadius: 22, borderWidth: 1, borderColor: c.goldBorder, backgroundColor: c.surfaceSecondary, alignItems: "center" },
  progressRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 8, borderColor: c.goldBorder, alignItems: "center", justifyContent: "center", backgroundColor: c.goldSoft, marginVertical: 16 },
  progressValue: { color: c.onSurface, fontFamily: serifFont, fontSize: 29, lineHeight: 34, fontWeight: "700" },
  progressLabel: { color: c.muted, fontSize: 11, lineHeight: 14 },
  progressCount: { color: c.muted, fontSize: 13.5, lineHeight: 20 },
  progressStrong: { color: c.onSurface, fontWeight: "900" },
  progressQuote: { color: c.gold, fontFamily: serifFont, fontStyle: "italic", fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: 13 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 14 },
  searchShell: { width: 420, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surfaceSecondary },
  searchInput: { flex: 1, color: c.onSurface, fontSize: 15.5, lineHeight: 21, paddingVertical: 10 },
  filters: { alignItems: "center", gap: 8, paddingRight: 8 },
  filterChip: { minHeight: 38, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center", cursor: "pointer" },
  filterChipActive: { borderColor: c.goldBorder, backgroundColor: c.goldSoft },
  filterText: { color: c.muted, fontSize: 13, lineHeight: 17, fontWeight: "700" },
  filterTextActive: { color: c.gold },
  contentRow: { flexDirection: "row", alignItems: "flex-start", gap: 18 },
  namesColumn: { flex: 1, minWidth: 0, gap: 13 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 26, lineHeight: 32, fontWeight: "700" },
  resultText: { color: c.muted, fontSize: 13.5, lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  nameCard: { width: "23.7%", minWidth: 190, minHeight: 156, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, padding: 14, alignItems: "center", cursor: "pointer" },
  nameCardActive: { borderColor: c.gold, backgroundColor: c.goldSoft, shadowColor: c.gold, shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 0 } },
  nameCardTop: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  numBadge: { width: 31, height: 31, borderRadius: 16, borderWidth: 1, borderColor: c.goldBorder, alignItems: "center", justifyContent: "center" },
  numText: { color: c.onSurface, fontFamily: serifFont, fontSize: 14, lineHeight: 17, fontWeight: "700" },
  nameArabic: { color: c.gold, fontFamily: arabicFont, fontSize: 27, lineHeight: 42, writingDirection: "rtl", textAlign: "center", marginTop: 2 },
  nameEnglish: { color: c.onSurface, fontFamily: serifFont, fontSize: 17, lineHeight: 21, fontWeight: "700" },
  nameMeaning: { color: c.muted, fontSize: 12.5, lineHeight: 17, textAlign: "center", marginTop: 2 },
  emptyState: { minHeight: 180, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { color: c.muted, fontSize: 15 },
  detailCard: { width: 420, flexShrink: 0, alignSelf: "flex-start", borderRadius: 22, borderWidth: 1, borderColor: c.goldBorder, backgroundColor: c.surfaceSecondary, padding: 21, gap: 15, shadowColor: "#000000", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  detailHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailNumber: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: c.goldBorder, alignItems: "center", justifyContent: "center" },
  detailNumberText: { color: c.gold, fontFamily: serifFont, fontSize: 18, lineHeight: 22, fontWeight: "700" },
  detailTitleCopy: { flex: 1, minWidth: 0 },
  detailTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 25, lineHeight: 30, fontWeight: "700" },
  detailSubtitle: { color: c.muted, fontSize: 13.5, lineHeight: 18 },
  detailIconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", cursor: "pointer" },
  detailArabicFrame: { minHeight: 165, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: "rgba(0,0,0,0.22)", alignItems: "center", justifyContent: "center", padding: 18 },
  detailArabic: { color: c.gold, fontFamily: arabicFont, fontSize: 55, lineHeight: 76, writingDirection: "rtl", textAlign: "center" },
  detailSection: { gap: 5, paddingTop: 3 },
  detailLabel: { color: c.gold, fontSize: 13.5, lineHeight: 18, fontWeight: "900" },
  detailBody: { color: c.onSurface, fontSize: 15, lineHeight: 23, fontWeight: "600" },
  benefitsBox: { gap: 8, padding: 13, borderRadius: 15, borderWidth: 1, borderColor: c.goldBorder, backgroundColor: c.goldSoft },
  benefitLine: { flexDirection: "row", alignItems: "center", gap: 9 },
  benefitText: { flex: 1, color: c.onSurface, fontSize: 12.5, lineHeight: 18 },
  detailActions: { flexDirection: "row", gap: 10 },
  detailFavorite: { flex: 1 },
  nextButton: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: c.goldBorder, backgroundColor: c.goldSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 14, cursor: "pointer" },
  nextButtonText: { color: c.gold, fontSize: 13.5, lineHeight: 18, fontWeight: "800" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
}));
