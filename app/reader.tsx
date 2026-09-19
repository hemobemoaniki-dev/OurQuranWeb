import { Text } from "@/src/components/AppText";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
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
import { useSession, useSessionControls } from "@/src/context/SessionContext";
import { juzForAyah } from "@/src/data/juz";
import { reciterById } from "@/src/data/reciters";
import { SURAHS, surahMeta } from "@/src/data/surahs";
import { computeReward } from "@/src/lib/hasanaat";
import { getBundledSurah } from "@/src/lib/quran";
import { exitReaderAudio, useAyahAudio } from "@/src/lib/audio";
import { formatClock, formatK, todayValue } from "@/src/lib/dates";
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
  const desktopReader = windowWidth >= 1180;
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
  const sessionView = useSession();

  const [surahNum, setSurahNum] = useState<number | null>(null);
  const [ayahIndex, setAyahIndex] = useState(0);
  const [pendingAudio, setPendingAudio] = useState<{ surah: number; ayah: number } | null>(null);
  const readerFocused = useRef(false);
  const mountedRef = useRef(true);
  const exitingRef = useRef(false);
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
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      exitingRef.current = true;
    };
  }, []);

  // Navigation teardown must never schedule React state updates after the route
  // has blurred. The explicit exit function handles state before navigation;
  // this cleanup only releases external audio resources.
  useFocusEffect(
    useCallback(() => {
      readerFocused.current = true;
      exitingRef.current = false;
      return () => {
        readerFocused.current = false;
        exitReaderAudio();
      };
    }, []),
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
    if (exitingRef.current || !pendingAudio || !readerFocused.current || data?.number !== pendingAudio.surah || data.ayahs[ayahIndex]?.numberInSurah !== pendingAudio.ayah) return;
    playAyah(pendingAudio.surah, pendingAudio.ayah);
    if (mountedRef.current && !exitingRef.current) setPendingAudio(null);
  }, [pendingAudio, data, ayahIndex, playAyah]);

  const ayah = data?.ayahs[ayahIndex];
  const numberInSurah = ayah?.numberInSurah ?? ayahIndex + 1;
  const prefetchAudio = audio.prefetch;
  // Do not start network work while the user is rapidly jumping through Ayahs.
  // Once the visible verse has been stable for 650 ms, warm only that verse.
  useEffect(() => {
    if (exitingRef.current || !readerFocused.current || !surahNum || data?.number !== surahNum || !ayah || audio.isPlaying || audio.isLoading) return;
    const timer = setTimeout(() => {
      if (!exitingRef.current && readerFocused.current) prefetchAudio(surahNum, numberInSurah);
    }, 650);
    return () => clearTimeout(timer);
  }, [surahNum, data?.number, ayah, numberInSurah, prefetchAudio, audio.isPlaying, audio.isLoading]);
  const meta = surahMeta(surahNum ?? 1);
  const activeReciter = reciterById(settings.reciter);
  const todayHasanaat = todayValue(account.history, "hasanaat");
  const todayAyat = todayValue(account.history, "ayat");
  const reward = ayah ? computeReward(ayah.arabic) : 0;
  const juz = juzForAyah(surahNum ?? 1, numberInSurah);
  const versesLeft = Math.max(0, meta.ayahs - numberInSurah);
  const percent = Math.round((numberInSurah / meta.ayahs) * 100);
  const bookmarked = surahNum ? isBookmarked(surahNum, numberInSurah) : false;

  const goNext = useCallback(
    (withReward: boolean) => {
      if (exitingRef.current || !data || !ayah || surahNum == null || committing.current) return;
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
    if (exitingRef.current || !data || surahNum == null) return;
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

  const exitReader = useCallback((destination: "/" | "/read", withHaptic = false) => {
    if (exitingRef.current) return;
    exitingRef.current = true;

    if (withHaptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // All React state changes happen before navigation. Blur/unmount cleanup is
    // resource-only, which prevents the web ErrorBoundary crash seen on Back.
    setPendingAudio(null);
    setQuickSettingsVisible(false);
    setPickerVisible(false);

    const deltas = stopSession();
    for (const [day, seconds] of Object.entries(deltas)) {
      if (seconds > 0) addReadingSeconds(seconds, day);
    }
    if (surahNum != null) saveReaderPosition(surahNum, numberInSurah);

    exitReaderAudio();
    router.replace(destination);
    void flush().catch(() => {});
  }, [addReadingSeconds, flush, numberInSurah, router, saveReaderPosition, stopSession, surahNum]);

  const imDone = useCallback(() => {
    exitReader("/", true);
  }, [exitReader]);

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
    <>
      <Head><title>Quran Reader — OurQuran</title><meta name="robots" content="noindex,follow" /></Head>
      <View style={styles.root}>
      <ReaderBackdrop id={t.id} />
      <LinearGradient pointerEvents="none" colors={[`${t.base}F2`, `${t.base}D8`, `${t.base}F5`]} locations={[0, 0.46, 1]} style={StyleSheet.absoluteFill} />
      <ReaderHeader
        theme={t}
        surahName={meta.name}
        ayah={numberInSurah}
        totalAyahs={meta.ayahs}
        onOpenSettings={() => setQuickSettingsVisible(true)}
        onBack={() => exitReader("/read")}
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
          <View style={[styles.workspace, !desktopReader && styles.workspaceCompact]}>
            {desktopReader ? (
              <View style={styles.toolRail}>
                <Pressable style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]} onPress={goPrev} accessibilityLabel="Previous ayah">
                  <Icon name="arrow-up" size={21} color={colors.gold} />
                  <Text style={styles.toolLabel}>Previous</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.toolButton, styles.toolButtonPrimary, pressed && styles.pressed]}
                  onPress={() => audio.toggle(surahNum!, numberInSurah)}
                  accessibilityLabel={audio.isPlaying ? "Pause recitation" : "Play recitation"}
                >
                  {audio.isLoading
                    ? <ActivityIndicator color={colors.gold} size="small" />
                    : <Icon name={audio.isPlaying ? "pause" : "play"} size={25} color={colors.gold} />}
                  <Text style={styles.toolLabel}>{audio.isPlaying ? "Pause" : "Listen"}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}
                  onPress={() => surahNum && toggleBookmark(surahNum, numberInSurah)}
                  accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark ayah"}
                >
                  <Icon name={bookmarked ? "bookmark" : "bookmark-outline"} size={22} color={colors.gold} />
                  <Text style={styles.toolLabel}>Save</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]} onPress={() => goNext(true)} accessibilityLabel="Next ayah">
                  <Icon name="arrow-down" size={21} color={colors.gold} />
                  <Text style={styles.toolLabel}>Next</Text>
                </Pressable>
              </View>
            ) : null}

            <Animated.View style={[
              styles.readingStack,
              desktopReader && styles.readingStackDesktop,
              {
                opacity: verseMotion.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                transform: [{ translateY: verseMotion.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
              },
            ]}>
              <View style={styles.card} testID="reader-ayah-card">
                <LinearGradient pointerEvents="none" colors={[`${t.accent}20`, `${t.base}18`, `${t.end}24`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardSheen} />
                {desktopReader ? (
                  <Pressable style={styles.desktopSurahHeader} onPress={openPicker} testID="reader-surah-picker-open">
                    <Text style={styles.surahTitle}>{meta.name}</Text>
                    <Icon name="chevron-down" size={19} color={colors.muted} />
                    <Text style={styles.ayahCount}>{numberInSurah} / {meta.ayahs}</Text>
                  </Pressable>
                ) : (
                  <>
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
                    <Text style={styles.ayahCount}>{numberInSurah} / {meta.ayahs}</Text>
                  </>
                )}
                {audio.error ? <Text style={styles.audioError}>Audio unavailable for this verse.</Text> : null}

                <ScrollView
                  ref={arabicScrollRef}
                  style={{ maxHeight: arabicViewportHeight, flexGrow: 0, marginTop: desktopReader ? 28 : 22 }}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  persistentScrollbar
                  contentContainerStyle={styles.arabicScrollContent}
                  testID="reader-arabic-scroll"
                >
                  <Text selectable maxFontSizeMultiplier={1} style={[styles.arabic, { fontSize: arabicSize, lineHeight: compactReader ? 46 : 58, fontWeight: "400" }]} testID="reader-arabic">
                    {ayah.arabic}
                  </Text>
                </ScrollView>
                <ReaderTextActions key={`ar-${surahNum}-${numberInSurah}`} text={ayah.arabic} reference={`${meta.name} ${surahNum}:${numberInSurah}`} theme={t} label="Arabic verse" />

                <View style={styles.translationDivider} />
                <Text style={styles.translationLabel}>TRANSLATION</Text>
                <ScrollView
                  ref={translationScrollRef}
                  nestedScrollEnabled
                  persistentScrollbar
                  showsVerticalScrollIndicator
                  style={styles.translationScroll}
                  contentContainerStyle={styles.translationScrollContent}
                  testID="reader-translation-scroll"
                >
                  <Text selectable maxFontSizeMultiplier={1.15} style={styles.english} testID="reader-english">
                    {ayah.english}
                  </Text>
                </ScrollView>
                <ReaderTextActions key={`en-${surahNum}-${numberInSurah}`} text={ayah.english} reference={`${meta.name} ${surahNum}:${numberInSurah}`} theme={t} label="translation" />
              </View>
            </Animated.View>

            {desktopReader ? (
              <View style={styles.infoPanel}>
                <View>
                  <Text style={styles.infoEyebrow}>READING SESSION</Text>
                  <Text style={styles.infoTitle}>{meta.name}</Text>
                  <Text style={styles.infoMeta}>Ayah {numberInSurah} of {meta.ayahs}</Text>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoBlock}>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoLabel}>Progress</Text>
                    <Text style={styles.infoValue}>{percent}%</Text>
                  </View>
                  <View style={styles.infoTrack}><View style={[styles.infoTrackFill, { width: `${percent}%` }]} /></View>
                  <Text style={styles.infoFoot}>Juz {juz} · {versesLeft} verses left</Text>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Recitation</Text>
                  <Text style={styles.infoStrong}>{activeReciter.name}</Text>
                  <Text style={styles.infoFoot}>{settings.speed.toFixed(2).replace(/0$/, "")}× speed · {settings.autoplay ? "Autoplay on" : "Autoplay off"}</Text>
                </View>

                <View style={styles.infoStats}>
                  <View style={styles.infoStat}>
                    <Icon name="clock-outline" size={18} color={colors.gold} />
                    <Text style={styles.infoStatValue}>{formatClock(sessionView.seconds)}</Text>
                    <Text style={styles.infoStatLabel}>Session</Text>
                  </View>
                  <View style={styles.infoStat}>
                    <Icon name="book-open-page-variant" size={18} color={colors.gold} />
                    <Text style={styles.infoStatValue}>{formatK(todayAyat)}</Text>
                    <Text style={styles.infoStatLabel}>Today</Text>
                  </View>
                  <View style={styles.infoStat}>
                    <Icon name="heart" size={18} color={colors.gold} />
                    <Text style={styles.infoStatValue}>{formatK(todayHasanaat)}</Text>
                    <Text style={styles.infoStatLabel}>Hasanaat</Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setQuickSettingsVisible(true)}
                  style={({ pressed }) => [styles.infoSettings, pressed && styles.pressed]}
                >
                  <Icon name="tune-variant" size={19} color={colors.gold} />
                  <Text style={styles.infoSettingsText}>Reader settings</Text>
                  <Icon name="chevron-right" size={17} color={colors.muted} />
                </Pressable>
              </View>
            ) : null}
          </View>
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
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  progressWrap: { width: "100%", maxWidth: 1320, alignSelf: "center", paddingHorizontal: 34, paddingTop: 14, paddingBottom: 8, gap: 10 },
  progressTrack: { height: 3, borderRadius: 999, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 999, backgroundColor: colors.brandPrimary },
  progressMeta: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { color: colors.muted, fontSize: 12, fontWeight: "600" },

  readingViewport: { flex: 1, minHeight: 0 },
  scroll: { width: "100%", maxWidth: 1320, alignSelf: "center", paddingHorizontal: 34, paddingTop: 20, paddingBottom: 38 },
  readingStack: { width: "100%", maxWidth: 1180, alignSelf: "center" },
  loader: { paddingVertical: 60, alignItems: "center", gap: 16 },
  errorText: { color: colors.muted, fontSize: 15 },
  retryBtn: { backgroundColor: colors.brandPrimary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: colors.onBrandPrimary, fontWeight: "700" },

  card: {
    width: "100%",
    minHeight: 500,
    backgroundColor: "rgba(5,6,10,0.92)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 46,
    paddingTop: 24,
    paddingBottom: 28,
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
    width: "100%",
    maxWidth: 1060,
    alignSelf: "center",
    color: colors.onSurface,
    textAlign: "center",
    writingDirection: "rtl",
    fontFamily: arabicFont,
    includeFontPadding: true,
    paddingHorizontal: 18,
    marginTop: 14,
    marginBottom: 14,
  },
  arabicScrollContent: { paddingHorizontal: 12, paddingBottom: 10 },
  translationDivider: { height: 1, backgroundColor: colors.borderStrong, marginTop: 20, marginBottom: 22, opacity: 0.72 },
  translationLabel: { color: colors.gold, fontSize: 10, letterSpacing: 2.1, fontWeight: "900", textAlign: "center", marginBottom: 10 },
  translationScroll: { maxHeight: 230, flexGrow: 0, width: "100%", maxWidth: 960, alignSelf: "center" },
  translationScrollContent: { paddingHorizontal: 20, paddingVertical: 4 },
  english: { width: "100%", maxWidth: 900, alignSelf: "center", color: colors.onSurface, fontSize: 18, lineHeight: 30, fontWeight: "500", textAlign: "center" },


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
