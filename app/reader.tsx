import { Text } from "@/src/components/AppText";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AccessibilityInfo, Animated, AppState, Easing, FlatList, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ReaderHeader } from "@/src/components/ReaderHeader";
import { ReaderQuickSettings } from "@/src/components/ReaderQuickSettings";
import { ReaderBackdrop } from "@/src/components/ReaderBackdrop";
import { ReaderTextActions } from "@/src/components/ReaderTextActions";
import { readerTheme } from "@/src/lib/reader-themes";
import { Icon } from "@/src/components/Icon";
import { useReaderAccount } from "@/src/context/AppState";
import { useSessionControls } from "@/src/context/SessionContext";
import { juzForAyah } from "@/src/data/juz";
import { SURAHS, surahMeta } from "@/src/data/surahs";
import { computeReward } from "@/src/lib/hasanaat";
import { getBundledSurah } from "@/src/lib/quran";
import { useAyahAudio } from "@/src/lib/audio";
import { themes, type ThemeColors } from "@/src/theme";
import { arabicFont, serifFont } from "@/src/typography";

function runAfterPaint(work: () => void) {
  requestAnimationFrame(() => setTimeout(work, 0));
}

export default function Reader() {

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const compactReader = windowWidth < 980;
  const arabicScrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const {
    account,
    hydrated,
    saveReaderPosition,
    commitReward,
    addReadingSeconds,
    toggleBookmark,
    isBookmarked,
    flush,
  } = useReaderAccount();
  const t = readerTheme(account.settings.readerTheme);
  const colors = useMemo<ThemeColors>(() => ({ ...themes.dark!, surface: t.base, surfaceSecondary: 'rgba(5,6,10,0.86)', surfaceTertiary: 'rgba(255,255,255,0.09)', onSurface: '#FFFFFF', muted: '#E5E2E8', gold: t.accent, goldSoft: `${t.accent}1F`, goldBorder: `${t.accent}66`, border: 'rgba(255,255,255,0.14)', borderStrong: `${t.accent}66`, brandPrimary: t.accent }), [t]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translationScrollRef = useRef<ScrollView>(null);
  const session = useSessionControls();

  const [surahNum, setSurahNum] = useState<number | null>(null);
  const [ayahIndex, setAyahIndex] = useState(0);
  const [pendingAudio, setPendingAudio] = useState<{ surah: number; ayah: number } | null>(null);
  const readerFocused = useRef(false);
  const seeded = useRef(false);
  const committing = useRef(false);
  const [verseMotion] = useState(() => new Animated.Value(1));
  const scrollRef = useRef<ScrollView>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; sub.remove(); };
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    translationScrollRef.current?.scrollTo({ y: 0, animated: false });
    arabicScrollRef.current?.scrollTo({ y: 0, animated: false });
    verseMotion.stopAnimation();
    verseMotion.setValue(reduceMotion ? 1 : 0);
    if (reduceMotion) return;
    const animation = Animated.timing(verseMotion, {
      toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [surahNum, ayahIndex, reduceMotion, verseMotion]);

  // Surah picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [quickSettingsVisible, setQuickSettingsVisible] = useState(false);
  const [pickerStep, setPickerStep] = useState<"surah" | "ayah">("surah");
  const [pickerSurah, setPickerSurah] = useState(1);

  const settings = account.settings;
  const audio = useAyahAudio({
    reciterId: settings.reciter,
    speed: settings.speed,
  });
  const disposeAudio = audio.dispose;

  // Stack screens can remain mounted after navigating away. Let navigation
  // paint first, then release native audio. Synchronous player teardown during
  // blur was making "I'm Done" feel frozen on Android.
  useFocusEffect(
    useCallback(() => {
      readerFocused.current = true;
      return () => {
        readerFocused.current = false;
        setPendingAudio(null);
        setQuickSettingsVisible(false);
        runAfterPaint(() => {
          if (!readerFocused.current) disposeAudio();
        });
      };
    }, [disposeAudio]),
  );

  // Seed reader position once account is hydrated.
  useEffect(() => {
    if (seeded.current || !hydrated) return;
    const pS = params.surah ? parseInt(String(params.surah), 10) : account.currentSurah;
    const pA = params.ayah ? parseInt(String(params.ayah), 10) : account.currentAyah;
    const validSurah = pS && pS >= 1 && pS <= 114 ? pS : 1;
    setSurahNum(validSurah);
    setAyahIndex(Math.min(surahMeta(validSurah).ayahs - 1, Math.max(0, (pA || 1) - 1)));
    seeded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const startSession = session.start;
  const stopSession = session.stop;
  const drainSession = session.drain;
  useFocusEffect(useCallback(() => {
    if (!hydrated) return;
    const persistDeltas = (deltas: Record<string, number>) => {
      for (const [day, seconds] of Object.entries(deltas)) {
        if (seconds > 0) addReadingSeconds(seconds, day);
      }
    };
    const saveSession = () => persistDeltas(stopSession());

    startSession();
    // Reading time does not need a state/storage write every 10 seconds.
    // Fewer checkpoints mean fewer provider rerenders while the user is tapping.
    const checkpoint = setInterval(() => persistDeltas(drainSession()), 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") startSession();
      else saveSession();
    });
    return () => {
      clearInterval(checkpoint);
      sub.remove();
      const deltas = stopSession();
      runAfterPaint(() => persistDeltas(deltas));
    };
  }, [startSession, stopSession, drainSession, addReadingSeconds, hydrated]));

  // Quran text is bundled and fully warmed in memory at app start. Reader
  // navigation is now a synchronous Map lookup; there is no query/loading
  // lifecycle between an Ayah tap and the text appearing.
  const textState = useMemo(() => {
    if (surahNum == null) return { data: undefined, error: false };
    try {
      return { data: getBundledSurah(surahNum), error: false };
    } catch {
      return { data: undefined, error: true };
    }
  }, [surahNum]);
  const data = textState.data;
  const isError = textState.error;

  const playAyah = audio.playAyah;
  useEffect(() => {
    if (!pendingAudio || !readerFocused.current || data?.number !== pendingAudio.surah || data.ayahs[ayahIndex]?.numberInSurah !== pendingAudio.ayah) return;
    playAyah(pendingAudio.surah, pendingAudio.ayah);
    setPendingAudio(null);
  }, [pendingAudio, data, ayahIndex, playAyah]);

  const ayah = data?.ayahs[ayahIndex];
  const numberInSurah = ayah?.numberInSurah ?? ayahIndex + 1;
  const prefetchAudio = audio.prefetch;
  // Do not start network work while the user is rapidly jumping through Ayahs.
  // Once the visible verse has been stable for 650 ms, warm only that verse.
  useEffect(() => {
    if (!readerFocused.current || !surahNum || data?.number !== surahNum || !ayah || audio.isPlaying || audio.isLoading) return;
    const timer = setTimeout(() => {
      if (readerFocused.current) prefetchAudio(surahNum, numberInSurah);
    }, 650);
    return () => clearTimeout(timer);
  }, [surahNum, data?.number, ayah, numberInSurah, prefetchAudio, audio.isPlaying, audio.isLoading]);
  const meta = surahMeta(surahNum ?? 1);
  const reward = ayah ? computeReward(ayah.arabic) : 0;
  const juz = juzForAyah(surahNum ?? 1, numberInSurah);
  const versesLeft = Math.max(0, meta.ayahs - numberInSurah);
  const percent = Math.round((numberInSurah / meta.ayahs) * 100);
  const bookmarked = surahNum ? isBookmarked(surahNum, numberInSurah) : false;

  const goNext = useCallback(
    (withReward: boolean) => {
      if (!data || !ayah || surahNum == null || committing.current) return;
      committing.current = true;

      const isLast = ayahIndex >= data.ayahs.length - 1;
      const nextSurah = isLast ? (surahNum < 114 ? surahNum + 1 : 1) : surahNum;
      const nextAyah = isLast ? 1 : numberInSurah + 1;
      const continueAudio = settings.autoplay;
      const earned = withReward ? computeReward(ayah.arabic) : 0;

      setPendingAudio(null);

      // Paint the new verse first. Native audio work, account aggregation and
      // persistence happen after the frame instead of sitting in the tap path.
      if (isLast) {
        setAyahIndex(0);
        setSurahNum(nextSurah);
        if (continueAudio) setPendingAudio({ surah: nextSurah, ayah: nextAyah });
      } else {
        setAyahIndex((index) => index + 1);
      }

      if (withReward) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      runAfterPaint(() => {
        if (!isLast) {
          if (continueAudio) audio.playAyah(nextSurah, nextAyah);
          else audio.stop();
        } else if (!continueAudio) {
          audio.stop();
        }

        if (withReward) commitReward(nextSurah, nextAyah, earned);
        else saveReaderPosition(nextSurah, nextAyah);
      });

      setTimeout(() => {
        committing.current = false;
      }, 180);
    },
    [data, ayah, surahNum, ayahIndex, numberInSurah, settings.autoplay, audio, commitReward, saveReaderPosition],
  );

  const goPrev = useCallback(() => {
    if (!data || surahNum == null) return;
    const continueAudio = settings.autoplay;
    setPendingAudio(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (ayahIndex > 0) {
      const prevAyah = numberInSurah - 1;
      setAyahIndex((index) => index - 1);
      runAfterPaint(() => {
        if (continueAudio) audio.playAyah(surahNum, prevAyah);
        else audio.stop();
        saveReaderPosition(surahNum, prevAyah);
      });
      return;
    }

    if (surahNum > 1) {
      const prevSurah = surahNum - 1;
      const prevAyah = surahMeta(prevSurah).ayahs;
      setAyahIndex(prevAyah - 1);
      setSurahNum(prevSurah);
      if (continueAudio) setPendingAudio({ surah: prevSurah, ayah: prevAyah });
      runAfterPaint(() => {
        if (!continueAudio) audio.stop();
        saveReaderPosition(prevSurah, prevAyah);
      });
      return;
    }

    runAfterPaint(() => audio.stop());
  }, [data, surahNum, ayahIndex, numberInSurah, saveReaderPosition, audio, settings.autoplay]);

  const imDone = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Finalize today's session before Home receives focus. This makes the
    // third-day crown deterministic even when "I'm Done" is the first action
    // that records reading activity for the local calendar day.
    const deltas = stopSession();
    for (const [day, seconds] of Object.entries(deltas)) {
      if (seconds > 0) addReadingSeconds(seconds, day);
    }
    if (surahNum != null) saveReaderPosition(surahNum, numberInSurah);

    // Give React one paint to commit the local streak/crown state, then reveal
    // the already-mounted Home screen. Native cleanup remains off the tap path.
    requestAnimationFrame(() => {
      router.replace("/(tabs)");
      runAfterPaint(() => {
        audio.stop();
        flush().catch(() => {});
      });
    });
  }, [addReadingSeconds, audio, stopSession, surahNum, numberInSurah, saveReaderPosition, flush, router]);

  const openPicker = () => {
    setPickerSurah(surahNum ?? 1);
    setPickerStep("surah");
    setPickerVisible(true);
  };

  const jumpTo = (s: number, a: number) => {
    const continueAudio = settings.autoplay;
    const sameSurah = s === surahNum;

    setPendingAudio(null);
    setAyahIndex(a - 1);
    if (!sameSurah) {
      setSurahNum(s);
      if (continueAudio) setPendingAudio({ surah: s, ayah: a });
    }
    setPickerVisible(false);
    setPickerStep("surah");

    runAfterPaint(() => {
      if (continueAudio && sameSurah) audio.playAyah(s, a);
      else if (!continueAudio) audio.stop();
      saveReaderPosition(s, a);
    });
  };

  const arabicSize = compactReader ? 27 : 34;
  const arabicViewportHeight = Math.max(180, Math.min(420, windowHeight * 0.42));

  return (
    <View style={styles.root}>
      <ReaderBackdrop id={t.id} />
      <LinearGradient pointerEvents="none" colors={[`${t.base}F2`, `${t.base}D8`, `${t.base}F5`]} locations={[0, 0.46, 1]} style={StyleSheet.absoluteFill} />
      <ReaderHeader
        theme={t}
        onOpenSettings={() => setQuickSettingsVisible(true)}
        onBack={() => {
          setPendingAudio(null);
          audio.stop();
          router.replace('/(tabs)/read');
        }}
      />
      <ReaderQuickSettings
        visible={quickSettingsVisible}
        onClose={() => setQuickSettingsVisible(false)}
        onBeforeReciterChange={audio.stop}
        theme={t}
      />

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
        <View style={styles.progressMeta}>
          <Text style={styles.progressText}>Juz {juz}</Text>
          <Text style={styles.progressText}>{versesLeft} verses left</Text>
          <Text style={styles.progressText}>{percent}%</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.readingViewport} nestedScrollEnabled contentContainerStyle={styles.scroll} showsVerticalScrollIndicator>
        {isError ? (
          <View style={styles.loader}>
            <Text style={styles.errorText}>Bundled Quran text is unavailable.</Text>
          </View>
        ) : !ayah ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : (
          <Animated.View style={[
            styles.readingGrid,
            compactReader && styles.readingGridCompact,
            {
              opacity: verseMotion.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [{ translateY: verseMotion.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
            },
          ]}>
          <View style={styles.card} testID="reader-ayah-card">
            <LinearGradient pointerEvents="none" colors={[`${t.accent}20`, `${t.base}18`, `${t.end}24`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardSheen} />
            {/* Surah header */}
            <View style={styles.cardTop}>
              <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={audio.isPlaying ? "Pause recitation" : "Play recitation"} onPress={() => audio.toggle(surahNum!, numberInSurah)} hitSlop={4} testID="reader-speaker">
                {audio.isLoading ? <ActivityIndicator color={colors.gold} size="small" /> : <Icon name={audio.isPlaying ? "pause-circle" : "volume-high"} size={26} color={colors.gold} />}
              </Pressable>
              <Pressable style={styles.surahTitleBtn} onPress={openPicker} testID="reader-surah-picker-open">
                <Text style={styles.surahTitle}>{meta.name}</Text>
                <Icon name="chevron-down" size={20} color={colors.onSurface} />
              </Pressable>
              <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark verse"} onPress={() => surahNum && toggleBookmark(surahNum, numberInSurah)} hitSlop={4} testID="reader-bookmark">
                <Icon name={bookmarked ? "heart" : "heart-outline"} size={24} color={colors.gold} />
              </Pressable>
            </View>
            <Text style={styles.ayahCount}>
              {numberInSurah} / {meta.ayahs}
            </Text>
            {audio.error ? <Text style={styles.audioError}>Audio unavailable for this verse.</Text> : null}

            <ScrollView
              ref={arabicScrollRef}
              style={{ maxHeight: arabicViewportHeight, flexGrow: 0, marginTop: 14 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              persistentScrollbar
              contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 10 }}
              testID="reader-arabic-scroll"
            >
            {/* Arabic */}
            <Text selectable maxFontSizeMultiplier={1} style={[styles.arabic, { fontSize: arabicSize, lineHeight: 44, fontWeight: "400" }]} testID="reader-arabic">
              {ayah.arabic}
            </Text>
            </ScrollView>
            <ReaderTextActions key={`ar-${surahNum}-${numberInSurah}`} text={ayah.arabic} reference={`${meta.name} ${surahNum}:${numberInSurah}`} theme={t} label="Arabic verse" />
          </View>
          <View style={[styles.translation, { overflow: "hidden" }]}>
            <LinearGradient pointerEvents="none" colors={[`${t.accent}20`, `${t.base}18`, `${t.end}24`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={styles.translationLabel}>TRANSLATION</Text>
            <ScrollView ref={translationScrollRef} nestedScrollEnabled persistentScrollbar showsVerticalScrollIndicator style={{ maxHeight: Math.max(100, windowHeight * 0.22), flexGrow: 0 }} testID="reader-translation-scroll">
            <Text selectable maxFontSizeMultiplier={1.15} style={styles.english} testID="reader-english">
              {ayah.english}
            </Text>
            </ScrollView>
            <ReaderTextActions key={`en-${surahNum}-${numberInSurah}`} text={ayah.english} reference={`${meta.name} ${surahNum}:${numberInSurah}`} theme={t} label="translation" />
          </View>
          </Animated.View>
        )}

      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient pointerEvents="none" colors={[`${t.accent}20`, `${t.base}18`, `${t.end}24`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dockSheen} />
        <Pressable style={({ pressed }) => [styles.sideAction, pressed && styles.pressed]} onPress={goPrev} testID="reader-previous">
          <Icon name="arrow-left" size={20} color={colors.gold} />
          <Text style={styles.sideActionLabel}>Previous</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]} onPress={imDone} testID="reader-im-done">
          <LinearGradient pointerEvents="none" colors={[t.accent, t.end]} style={[StyleSheet.absoluteFill, { borderRadius: 30 }]} />
          <Text style={styles.doneText}>I&apos;m Done</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.nextAction, pressed && styles.pressed]} onPress={() => goNext(true)} testID="reader-next-hasanaat">
          <View style={styles.nextInner}>
            <Text style={styles.nextValue}>+{reward}</Text>
            <Icon name="arrow-right" size={18} color={colors.onSurface} />
          </View>
          <Text style={styles.nextLabel}>Hasanaat</Text>
        </Pressable>
      </View>

      {/* Surah / Ayah picker */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} testID="surah-picker-sheet">
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            {pickerStep === "ayah" ? (
              <Pressable onPress={() => setPickerStep("surah")} hitSlop={10} testID="picker-back">
                <Icon name="arrow-left" size={22} color={colors.onSurface} />
              </Pressable>
            ) : (
              <View style={{ width: 22 }} />
            )}
            <Text style={styles.sheetTitle}>
              {pickerStep === "surah" ? "Select Surah" : `${surahMeta(pickerSurah).name} — Select Ayah`}
            </Text>
            <View style={{ width: 22 }} />
          </View>

          {pickerStep === "surah" ? (
            <FlatList
              key="picker-surah-list"
              data={SURAHS}
              keyExtractor={(s) => String(s.number)}
              style={styles.sheetList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.pickerRow}
                  onPress={() => {
                    setPickerSurah(item.number);
                    setPickerStep("ayah");
                  }}
                  testID={`picker-surah-${item.number}`}
                >
                  <Text style={styles.pickerNum}>{item.number}.</Text>
                  <Text style={styles.pickerName}>{item.name}</Text>
                  <Text style={styles.pickerVerses}>{item.ayahs}</Text>
                </Pressable>
              )}
            />
          ) : (
            <FlatList
              key={`picker-ayah-grid-${pickerSurah}`}
              data={Array.from({ length: surahMeta(pickerSurah).ayahs }, (_, i) => i + 1)}
              keyExtractor={(n) => String(n)}
              numColumns={5}
              style={styles.sheetList}
              columnWrapperStyle={{ gap: 8 }}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.ayahChip}
                  onPressIn={() => audio.prefetch(pickerSurah, item)}
                  onPress={() => jumpTo(pickerSurah, item)}
                  testID={`picker-ayah-${item}`}
                >
                  <Text style={styles.ayahChipText}>{item}</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  progressWrap: { width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 28, paddingTop: 14, paddingBottom: 8, gap: 10 },
  progressTrack: { height: 3, borderRadius: 999, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 999, backgroundColor: colors.brandPrimary },
  progressMeta: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { color: colors.muted, fontSize: 12, fontWeight: "600" },

  readingViewport: { flex: 1, minHeight: 0 },
  scroll: { width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 28, paddingTop: 18, paddingBottom: 26 },
  readingGrid: { width: "100%", flexDirection: "row", alignItems: "stretch", gap: 16 },
  readingGridCompact: { flexDirection: "column" },
  loader: { paddingVertical: 60, alignItems: "center", gap: 16 },
  errorText: { color: colors.muted, fontSize: 15 },
  retryBtn: { backgroundColor: colors.brandPrimary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: colors.onBrandPrimary, fontWeight: "700" },

  card: {
    flex: 1.28,
    minHeight: 390,
    backgroundColor: "rgba(5,6,10,0.92)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 18,
    overflow: "hidden",
  },
  cardSheen: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.borderStrong },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  surahTitleBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, paddingHorizontal: 8 },
  surahTitle: { flexShrink: 1, textAlign: "center", color: colors.onSurface, fontSize: 26, fontFamily: serifFont, fontWeight: "800", letterSpacing: -0.45 },
  ayahCount: { color: colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 4, letterSpacing: 0.35 },
  audioError: { color: colors.warning, fontSize: 12, textAlign: "center", marginTop: 6 },

  bismillah: { color: colors.gold, textAlign: "center", marginTop: 18, writingDirection: "rtl" },
  arabic: {
    color: colors.onSurface,
    textAlign: "center",
    writingDirection: "rtl",
    fontFamily: arabicFont,
    includeFontPadding: true,
    paddingHorizontal: 18,
    marginTop: 14,
    marginBottom: 14,
  },
  translation: { flex: 0.72, minHeight: 390, padding: 26, gap: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary },
  translationLabel: { color: colors.gold, fontSize: 10, letterSpacing: 2.1, fontWeight: "900" },
  english: { color: colors.onSurface, fontSize: 17, lineHeight: 29, fontWeight: "500" },


  actions: {
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    marginHorizontal: 0,
    marginBottom: 12,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.surfaceSecondary,
  },
  dockSheen: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  sideAction: {
    flex: 1,
    minHeight: 62,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.goldSoft,
  },
  sideActionLabel: { color: colors.gold, fontSize: 12, fontWeight: "600" },
  doneBtn: {
    flex: 1.35,
    backgroundColor: colors.brandPrimary,
    borderRadius: 18,
    minHeight: 62,
    justifyContent: "center",
    paddingVertical: 12,
    alignItems: "center",
  },
  doneText: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "800" },
  nextAction: {
    flex: 1,
    minHeight: 62,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  nextInner: { flexDirection: "row", alignItems: "center", gap: 3 },
  nextValue: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  nextLabel: { color: colors.onSurface, fontSize: 11, opacity: 0.85 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: "78%",
    borderTopWidth: 1,
    borderColor: colors.goldBorder,
  },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 10 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sheetTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },
  sheetList: { marginTop: 4 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pickerNum: { color: colors.gold, fontSize: 14, fontWeight: "700", width: 34 },
  pickerName: { color: colors.onSurface, fontSize: 16, flex: 1 },
  pickerVerses: { color: colors.muted, fontSize: 13 },
  ayahChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
  },
  ayahChipText: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
});
