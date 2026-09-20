import Head from "expo-router/head";
import { Text, TextInput } from "@/src/components/AppText";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";

import { SubHeader } from "@/src/components/SubHeader";
import { Icon } from "@/src/components/Icon";
import { WebPageBackdrop } from "@/src/components/WebPageBackdrop";
import { useAccount } from "@/src/context/AppState";
import { SURAHS, surahMeta } from "@/src/data/surahs";
import { makeStyles, useTheme } from "@/src/theme";
import { serifFont } from "@/src/typography";

export default function ReadTab() {
  const { width } = useWindowDimensions();
  if (Platform.OS === "web" && width >= 1080) return <DesktopRead />;
  return <MobileRead />;
}

function MobileRead() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { account } = useAccount();
  const meta = surahMeta(account.currentSurah);

  return (
    <>
      <Head><title>Read Quran Online — OurQuran</title><meta name="description" content="Read all 114 surahs of the Quran with a modern, focused reading experience, recitation controls, bookmarks and synced progress." /></Head>
      <View style={styles.root}>
      <SubHeader title="Read" showBack={false} />
      <FlatList
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        data={SURAHS}
        keyExtractor={(s) => String(s.number)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.sectionEyebrow}>PICK UP WHERE YOU LEFT OFF</Text>
            <Pressable
              style={styles.continueCard}
              onPress={() => router.push("/reader")}
              testID="read-continue-card"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.continueLabel}>Continue Reading</Text>
                <Text style={styles.continueSurah}>{meta.name}</Text>
                <Text style={styles.continueMeta}>
                  Ayah {account.currentAyah} of {meta.ayahs}
                </Text>
              </View>
              <View style={styles.playBtn}>
                <Icon name="play" size={22} color={colors.onBrandPrimary} />
              </View>
            </Pressable>
            <Text style={styles.listTitle}>All Surahs</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: "/reader", params: { surah: item.number, ayah: 1 } })}
            testID={`surah-row-${item.number}`}
          >
            <View style={styles.numBadge}>
              <Text style={styles.numText}>{item.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.surahName}>{item.name}</Text>
              <Text style={styles.surahSub}>{item.ayahs} verses</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        )}
      />
    </View>
    </>
  );
}

function DesktopRead() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { account } = useAccount();
  const [query, setQuery] = useState("");
  const current = surahMeta(account.currentSurah);
  const progress = Math.min(1, account.currentAyah / Math.max(1, current.ayahs));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SURAHS.filter((surah) => !needle || surah.name.toLowerCase().includes(needle) || String(surah.number) === needle);
  }, [query]);

  return (
    <>
      <Head><title>Read the Quran — OurQuran</title><meta name="description" content="Explore all 114 surahs, continue from your exact ayah, listen to recitation and keep your reading progress." /></Head>
      <View style={styles.desktopRoot}>
        <WebPageBackdrop intensity="strong" />
        <ScrollView contentContainerStyle={styles.desktopPage} showsVerticalScrollIndicator={false}>
          <View style={styles.desktopHero}>
            <View>
              <Text style={styles.desktopEyebrow}>THE FINAL REVELATION</Text>
              <Text style={styles.desktopTitle}>Read the Qur’an</Text>
              <Text style={styles.desktopSubtitle}>Every ayah is an invitation to pause, reflect, and draw nearer.</Text>
            </View>
            <Text style={styles.desktopQuote}>“This is the Book about which there is no doubt, a guidance for the mindful.”{`\n`}— Qur’an 2:2</Text>
          </View>

          <Pressable onPress={() => router.push("/reader")} style={({ pressed }) => [styles.desktopContinue, pressed && styles.desktopPressed]} testID="read-continue-card">
            <View style={styles.continueOrnament}><Icon name="book-open-page-variant" size={54} color={colors.gold} /></View>
            <View style={styles.desktopContinueCopy}>
              <Text style={styles.desktopEyebrow}>CONTINUE YOUR JOURNEY</Text>
              <Text style={styles.desktopContinueTitle}>{current.name}</Text>
              <Text style={styles.desktopContinueMeta}>Ayah {account.currentAyah} of {current.ayahs} · {Math.round(progress * 100)}% complete</Text>
              <View style={styles.desktopProgressTrack}><View style={[styles.desktopProgressFill, { width: `${progress * 100}%` }]} /></View>
            </View>
            <View style={styles.desktopReadButton}><Icon name="play" size={21} color={colors.onBrandPrimary} /><Text style={styles.desktopReadButtonText}>Resume reading</Text><Icon name="arrow-right" size={19} color={colors.onBrandPrimary} /></View>
          </Pressable>

          <View style={styles.libraryHead}>
            <View><Text style={styles.libraryTitle}>The 114 Surahs</Text><Text style={styles.librarySubtitle}>Choose a chapter and begin with its first ayah.</Text></View>
            <View style={styles.libraryTools}>
              <View style={styles.librarySearch}><Icon name="magnify" size={21} color={colors.gold} /><TextInput value={query} onChangeText={setQuery} placeholder="Search by name or number…" placeholderTextColor={colors.muted} style={styles.librarySearchInput} testID="quran-search" /></View>
            </View>
          </View>

          <View style={styles.surahGrid}>
            {filtered.map((surah) => {
              const active = surah.number === account.currentSurah;
              return (
                <Pressable key={surah.number} onPress={() => router.push({ pathname: "/reader", params: { surah: surah.number, ayah: 1 } })} style={({ pressed, hovered }: any) => [styles.surahCard, active && styles.surahCardActive, hovered && styles.surahCardHover, pressed && styles.desktopPressed]} testID={`surah-row-${surah.number}`}>
                  <View style={[styles.desktopNumBadge, active && styles.desktopNumBadgeActive]}><Text style={[styles.desktopNumText, active && styles.desktopNumTextActive]}>{String(surah.number).padStart(3, "0")}</Text></View>
                  <View style={styles.surahCardCopy}><Text style={styles.desktopSurahName}>{surah.name}</Text><Text style={styles.desktopSurahMeta}>{surah.ayahs} ayahs</Text></View>
                  {active ? <View style={styles.currentChip}><Text style={styles.currentChipText}>CURRENT</Text></View> : null}
                  <Icon name="arrow-top-right" size={18} color={colors.gold} />
                </Pressable>
              );
            })}
          </View>
          {!filtered.length ? <View style={styles.libraryEmpty}><Icon name="magnify-close" size={28} color={colors.gold} /><Text style={styles.libraryEmptyText}>No surahs match that search.</Text></View> : null}
        </ScrollView>
      </View>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  desktopRoot: { flex: 1, backgroundColor: colors.surface, position: "relative", overflow: "hidden" },
  desktopPage: { width: "100%", maxWidth: 1540, alignSelf: "center", paddingHorizontal: 34, paddingTop: 30, paddingBottom: 76, gap: 20, zIndex: 1 },
  desktopHero: { minHeight: 152, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 30, paddingHorizontal: 38, paddingVertical: 24, borderRadius: 26, borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.surfaceSecondary, shadowColor: colors.gold, shadowOpacity: 0.1, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
  desktopEyebrow: { color: colors.gold, fontSize: 12, lineHeight: 17, fontWeight: "900", letterSpacing: 2.3, marginBottom: 7 },
  desktopTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 52, lineHeight: 58, fontWeight: "700", letterSpacing: -1.3 },
  desktopSubtitle: { color: colors.onSurfaceSecondary, fontSize: 17.5, lineHeight: 27, marginTop: 4 },
  desktopQuote: { color: colors.gold, fontFamily: serifFont, fontSize: 17, lineHeight: 27, maxWidth: 470, textAlign: "right" },
  desktopContinue: { minHeight: 174, flexDirection: "row", alignItems: "center", gap: 22, paddingHorizontal: 28, paddingVertical: 24, borderRadius: 25, borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.surfaceSecondary, cursor: "pointer", overflow: "hidden", shadowColor: colors.gold, shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  continueOrnament: { width: 105, height: 105, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.goldSoft, shadowColor: colors.gold, shadowOpacity: 0.25, shadowRadius: 22 },
  desktopContinueCopy: { flex: 1, minWidth: 0 },
  desktopContinueTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 34, lineHeight: 41, fontWeight: "700" },
  desktopContinueMeta: { color: colors.onSurfaceSecondary, fontSize: 13.5, lineHeight: 20, marginTop: 3 },
  desktopProgressTrack: { width: "72%", maxWidth: 650, height: 6, borderRadius: 99, backgroundColor: colors.surfaceTertiary, overflow: "hidden", marginTop: 18 },
  desktopProgressFill: { height: 6, borderRadius: 99, backgroundColor: colors.gold },
  desktopReadButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 20, borderRadius: 15, backgroundColor: colors.brandPrimary, shadowColor: colors.gold, shadowOpacity: 0.22, shadowRadius: 16 },
  desktopReadButtonText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "900" },
  desktopPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  libraryHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 22, paddingTop: 4 },
  libraryTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 30, lineHeight: 37, fontWeight: "700" },
  librarySubtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  libraryTools: { flexDirection: "row", alignItems: "center", gap: 11 },
  librarySearch: { width: 285, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.surfaceSecondary },
  librarySearchInput: { flex: 1, color: colors.onSurface, fontSize: 14, lineHeight: 20, paddingVertical: 10 },
  lengthFilters: { flexDirection: "row", alignItems: "center", gap: 5, padding: 5, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  lengthFilter: { minHeight: 37, alignItems: "center", justifyContent: "center", paddingHorizontal: 13, borderRadius: 10, cursor: "pointer" },
  lengthFilterActive: { backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder },
  lengthFilterText: { color: colors.muted, fontSize: 11.5, fontWeight: "800" },
  lengthFilterTextActive: { color: colors.gold },
  surahGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 12 },
  surahCard: { width: "32.78%", minWidth: 330, minHeight: 92, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 17, paddingVertical: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, cursor: "pointer" },
  surahCardActive: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  surahCardHover: { borderColor: colors.goldBorder, transform: [{ translateY: -1 }] },
  desktopNumBadge: { width: 49, height: 49, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.surfaceTertiary },
  desktopNumBadgeActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  desktopNumText: { color: colors.gold, fontFamily: serifFont, fontSize: 14, fontWeight: "700" },
  desktopNumTextActive: { color: colors.onBrandPrimary },
  surahCardCopy: { flex: 1, minWidth: 0 },
  desktopSurahName: { color: colors.onSurface, fontFamily: serifFont, fontSize: 19, lineHeight: 24, fontWeight: "700" },
  desktopSurahMeta: { color: colors.muted, fontSize: 11.5, lineHeight: 17, marginTop: 3 },
  currentChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.goldSoft },
  currentChipText: { color: colors.gold, fontSize: 8.5, fontWeight: "900", letterSpacing: 0.8 },
  libraryEmpty: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 22, borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.surfaceSecondary },
  libraryEmptyText: { color: colors.onSurface, fontFamily: serifFont, fontSize: 19 },
  content: { width: "100%", maxWidth: 980, alignSelf: "center", paddingHorizontal: 28, paddingBottom: 56 },
  headerWrap: { gap: 14, paddingTop: 12, paddingBottom: 12 },
  sectionEyebrow: { color: colors.gold, fontSize: 11, letterSpacing: 1.5, fontWeight: "700", marginTop: 4 },
  continueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSecondary,
    minHeight: 132,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  continueLabel: { color: colors.muted, fontSize: 12 },
  continueSurah: { color: colors.onSurface, fontSize: 24, fontFamily: serifFont },
  continueMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
  },
  numBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { color: colors.gold, fontWeight: "700", fontSize: 14 },
  surahName: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  surahSub: { color: colors.muted, fontSize: 12 },
}));
