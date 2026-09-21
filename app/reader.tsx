import { Text } from "@/src/components/AppText";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AccessibilityInfo, Animated, AppState, Easing, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ReaderHeader } from "@/src/components/ReaderHeader";
import { DesktopReaderExperience } from "@/src/components/DesktopReaderExperience";
import { ReaderQuickSettings } from "@/src/components/ReaderQuickSettings";
import { ReaderBackdrop } from "@/src/components/ReaderBackdrop";
import { WebPageBackdrop } from "@/src/components/WebPageBackdrop";
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
import { formatClock } from "@/src/lib/dates";
import { themes, type ThemeColors } from "@/src/theme";
import { arabicFont, serifFont } from "@/src/typography";

function runAfterPaint(work: () => void) {
  requestAnimationFrame(() => setTimeout(work, 0));
}

function impact(style: Haptics.ImpactFeedbackStyle) {
  try {
    void Promise.resolve(Haptics.impactAsync(style)).catch(() => {});
  } catch {
    // Desktop browsers may not expose a haptics implementation.
  }
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
  const exitStartedRef = useRef(false);
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
    };
  }, []);

  // Navigation teardown must never schedule React state updates after the route
  // has blurred. The explicit exit function handles state before navigation;
  // this cleanup only releases external audio resources.
  useFocusEffect(
    useCallback(() => {
      readerFocused.current = true;
      exitingRef.current = false;
      exitStartedRef.current = false;
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
      // Route-exit handlers persist the final deltas before navigation.
      // Blur cleanup must never schedule provider/state writes after unmount.
      stopSession();
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
      // Keep visible text and audible verse locked together.
      audio.stop();

      // Paint the new verse first. Native audio work, account aggregation and
      // persistence happen after the frame instead of sitting in the tap path.
      if (isLast) {
        setAyahIndex(0);
        setSurahNum(nextSurah);
        if (continueAudio) setPendingAudio({ surah: nextSurah, ayah: nextAyah });
      } else {
        setAyahIndex((index) => index + 1);
      }

      if (withReward) impact(Haptics.ImpactFeedbackStyle.Light);

      runAfterPaint(() => {
        if (exitingRef.current) return;
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
      }, 70);
    },
    [data, ayah, surahNum, ayahIndex, numberInSurah, settings.autoplay, audio, commitReward, saveReaderPosition],
  );

  const goPrev = useCallback(() => {
    if (exitingRef.current || !data || surahNum == null) return;
    const continueAudio = settings.autoplay;
    setPendingAudio(null);
    // Silence the old ayah before the visible target changes.
    audio.stop();
    impact(Haptics.ImpactFeedbackStyle.Light);

    if (ayahIndex > 0) {
      const prevAyah = numberInSurah - 1;
      setAyahIndex((index) => index - 1);
      runAfterPaint(() => {
        if (exitingRef.current) return;
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
        if (exitingRef.current) return;
        if (!continueAudio) audio.stop();
        saveReaderPosition(prevSurah, prevAyah);
      });
      return;
    }

    runAfterPaint(() => {
      if (!exitingRef.current) audio.stop();
    });
  }, [data, surahNum, ayahIndex, numberInSurah, saveReaderPosition, audio, settings.autoplay]);

  const finishReaderAndGoHome = useCallback((withHaptic = false) => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;
    exitingRef.current = true;

    if (withHaptic) impact(Haptics.ImpactFeedbackStyle.Medium);

    // Critical tap path: silence immediately and leave the Reader immediately.
    // No storage, session math, Firestore queueing, or state cleanup is allowed
    // to sit in front of navigation.
    exitReaderAudio();
    router.replace("/(tabs)" as any);

    const exitSurah = surahNum;
    const exitAyah = numberInSurah;

    // Let Home paint before any account/session persistence can trigger
    // provider rerenders. This keeps exit latency independent of storage/network.
    runAfterPaint(() => {
      let deltas: Record<string, number> = {};
      try {
        deltas = stopSession();
        if (exitSurah != null) saveReaderPosition(exitSurah, exitAyah);
      } catch {}

      try {
        for (const [day, seconds] of Object.entries(deltas)) {
          if (seconds > 0) addReadingSeconds(seconds, day);
        }
      } catch {}

      void Promise.resolve().then(flush).catch(() => {});
    });

    // Safety only: unlock if a browser/router failure leaves this screen mounted.
    setTimeout(() => {
      if (readerFocused.current) {
        exitStartedRef.current = false;
        exitingRef.current = false;
      }
    }, 450);
  }, [addReadingSeconds, flush, numberInSurah, router, saveReaderPosition, stopSession, surahNum]);

  const imDone = useCallback(() => {
    finishReaderAndGoHome(true);
  }, [finishReaderAndGoHome]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBrowserBack = () => {
      if (!readerFocused.current || exitStartedRef.current) return;
      exitStartedRef.current = true;
      exitingRef.current = true;
      exitReaderAudio();

      const exitSurah = surahNum;
      const exitAyah = numberInSurah;

      runAfterPaint(() => {
        let deltas: Record<string, number> = {};
        try {
          deltas = stopSession();
          if (exitSurah != null) saveReaderPosition(exitSurah, exitAyah);
        } catch {}

        try {
          for (const [day, seconds] of Object.entries(deltas)) {
            if (seconds > 0) addReadingSeconds(seconds, day);
          }
        } catch {}

        void Promise.resolve().then(flush).catch(() => {});
      });

      setTimeout(() => {
        if (readerFocused.current) {
          exitStartedRef.current = false;
          exitingRef.current = false;
        }
      }, 450);
    };
    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, [addReadingSeconds, flush, numberInSurah, saveReaderPosition, stopSession, surahNum]);

  const openPicker = () => {
    setPickerSurah(surahNum ?? 1);
    setPickerStep("surah");
    setPickerVisible(true);
  };

  const jumpTo = (s: number, a: number) => {
    const continueAudio = settings.autoplay;
    const sameSurah = s === surahNum;

    setPendingAudio(null);
    // Picker jumps must never leave the previous ayah speaking.
    audio.stop();
    setAyahIndex(a - 1);
    if (!sameSurah) {
      setSurahNum(s);
      if (continueAudio) setPendingAudio({ surah: s, ayah: a });
    }
    setPickerVisible(false);
    setPickerStep("surah");

    runAfterPaint(() => {
      if (exitingRef.current) return;
      if (continueAudio && sameSurah) audio.playAyah(s, a);
      else if (!continueAudio) audio.stop();
      saveReaderPosition(s, a);
    });
  };

  const arabicSize = compactReader ? 31 : 54;
  const arabicViewportHeight = Math.max(180, Math.min(420, windowHeight * 0.42));

  return (
    <>
      <Head><title>Quran Reader — OurQuran</title><meta name="robots" content="noindex,follow" /></Head>
      <View style={styles.root}>
      {Platform.OS === "web" ? <WebPageBackdrop intensity="strong" /> : <ReaderBackdrop id={t.id} />}
      <LinearGradient
        pointerEvents="none"
        colors={Platform.OS === "web"
          ? [`${t.base}B0`, `${t.base}80`, `${t.base}B8`]
          : [`${t.base}F2`, `${t.base}D8`, `${t.base}F5`]}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />
      {desktopReader ? (
        <DesktopReaderExperience
          theme={t}
          surahName={meta.name}
          surahNumber={surahNum ?? 1}
          ayahNumber={numberInSurah}
          totalAyahs={meta.ayahs}
          juz={juz}
          versesLeft={versesLeft}
          percent={percent}
          reward={reward}
          arabic={ayah?.arabic}
          english={ayah?.english}
          loading={!isError && !ayah}
          error={isError}
          bookmarked={bookmarked}
          audioPlaying={audio.isPlaying}
          audioLoading={audio.isLoading}
          audioError={audio.error}
          onToggleAudio={() => {
            if (surahNum != null) audio.toggle(surahNum, numberInSurah);
          }}
          onStopAudio={audio.stop}
          onOpenPicker={openPicker}
          onToggleBookmark={() => {
            if (surahNum != null) toggleBookmark(surahNum, numberInSurah);
          }}
          onPrevious={goPrev}
          onDone={imDone}
          onNext={() => goNext(true)}
          onBack={() => finishReaderAndGoHome(true)}
        />
      ) : (
        <>
        <ReaderHeader
          theme={t}
          surahName={meta.name}
          ayah={numberInSurah}
          totalAyahs={meta.ayahs}
          onOpenSettings={() => setQuickSettingsVisible(true)}
          onBack={() => finishReaderAndGoHome(true)}
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
          {desktopReader ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Leave reader" onPress={() => finishReaderAndGoHome(true)} style={({ pressed }) => [styles.progressBack, pressed && styles.pressed]} testID="reader-desktop-back">
              <Icon name="arrow-left" size={17} color={colors.gold} />
              <Text style={styles.progressBackText}>Back</Text>
            </Pressable>
          ) : null}
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
            <Animated.View style={[
              styles.readingStack,
              desktopReader && styles.readingStackDesktop,
              {
                opacity: verseMotion.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                transform: [{ translateY: verseMotion.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
              },
            ]}>
              <View style={styles.card} testID="reader-ayah-card">
                <LinearGradient pointerEvents="none" colors={[`${t.accent}34`, `${t.accent}12`, `${t.end}28`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardSheen} />
                {desktopReader ? (
                  <View style={styles.desktopCardTop}>
                    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.desktopListen, pressed && styles.pressed]} onPress={() => audio.toggle(surahNum!, numberInSurah)} accessibilityLabel={audio.isPlaying ? "Pause recitation" : "Play recitation"} testID="reader-desktop-listen">
                      {audio.isLoading ? <ActivityIndicator color={colors.gold} size="small" /> : <Icon name={audio.isPlaying ? "pause" : "volume-high"} size={24} color={colors.gold} />}
                      <Text style={styles.desktopListenText}>{audio.isPlaying ? "Pause" : "Listen"}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" style={styles.desktopSurahHeader} onPress={openPicker} testID="reader-surah-picker-open">
                      <View style={styles.desktopSurahTitleRow}>
                        <Text style={styles.surahTitle}>{meta.name}</Text>
                        <Icon name="chevron-down" size={21} color={colors.muted} />
                      </View>
                      <Text style={styles.ayahCount}>Ayah {numberInSurah} of {meta.ayahs}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.desktopBookmark, pressed && styles.pressed]} onPress={() => surahNum && toggleBookmark(surahNum, numberInSurah)} accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark ayah"} testID="reader-desktop-bookmark">
                      <Icon name={bookmarked ? "heart" : "heart-outline"} size={27} color={colors.gold} />
                    </Pressable>
                  </View>
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
                  <Text selectable maxFontSizeMultiplier={1} style={[styles.arabic, { fontSize: arabicSize, lineHeight: compactReader ? 52 : 84, fontWeight: "400" }]} testID="reader-arabic">
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
                  <Text style={styles.infoEyebrow}>YOUR READING SESSION</Text>
                  <Text style={styles.infoTitle}>{percent}% complete</Text>
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
                    <Text style={styles.infoStatValue}>{numberInSurah}</Text>
                    <Text style={styles.infoStatLabel}>Ayah</Text>
                  </View>
                  <View style={styles.infoStat}>
                    <Icon name="heart" size={18} color={colors.gold} />
                    <Text style={styles.infoStatValue}>+{reward}</Text>
                    <Text style={styles.infoStatLabel}>Next reward</Text>
                  </View>
                </View>

                {[
                  { icon: "microphone-outline" as const, label: "Reciter", value: activeReciter.name },
                  { icon: "speedometer" as const, label: "Playback speed", value: `${settings.speed.toFixed(2).replace(/0$/, "")}×` },
                  { icon: "play-circle-outline" as const, label: "Autoplay", value: settings.autoplay ? "On" : "Off" },
                ].map((item) => (
                  <Pressable key={item.label} accessibilityRole="button" onPress={() => setQuickSettingsVisible(true)} style={({ pressed }) => [styles.infoSettings, pressed && styles.pressed]}>
                    <Icon name={item.icon} size={20} color={colors.gold} />
                    <View style={styles.infoSettingsCopy}>
                      <Text style={styles.infoSettingsText}>{item.label}</Text>
                      <Text style={styles.infoSettingsValue} numberOfLines={1}>{item.value}</Text>
                    </View>
                    <Icon name="chevron-right" size={18} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}

      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient pointerEvents="none" colors={[`${t.accent}20`, `${t.base}18`, `${t.end}24`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dockSheen} />
        <Pressable accessibilityRole="button" accessibilityLabel="Previous ayah" style={({ pressed }) => [styles.sideAction, pressed && styles.pressed]} onPress={goPrev} testID="reader-previous">
          <Icon name="arrow-left" size={20} color={colors.gold} />
          <Text style={styles.sideActionLabel}>Previous</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Finish reading" style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]} onPress={imDone} testID="reader-im-done">
          <LinearGradient pointerEvents="none" colors={[`${t.accent}F2`, `${t.end}DC`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 30 }]} />
          <Text style={styles.doneText}>I&apos;m Done</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Next ayah" style={({ pressed }) => [styles.nextAction, pressed && styles.pressed]} onPress={() => goNext(true)} testID="reader-next-hasanaat">
          <View style={styles.nextInner}>
            <Text style={styles.nextValue}>Next ayah</Text>
            <Icon name="arrow-right" size={18} color={colors.onSurface} />
          </View>
          <Text style={styles.nextLabel}>+{reward} Hasanaat</Text>
        </Pressable>
      </View>

        </>
      )}

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
  progressWrap: { width: "100%", maxWidth: 1500, alignSelf: "center", paddingHorizontal: 28, paddingTop: 8, paddingBottom: 6, gap: 8 },
  progressTrack: { height: 3, borderRadius: 999, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 999, backgroundColor: colors.brandPrimary },
  progressMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  progressText: { color: colors.onSurface, fontSize: 14, lineHeight: 18, fontWeight: "800" },
  progressBack: { minHeight: 34, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.goldSoft, flexDirection: "row", alignItems: "center", gap: 6, cursor: "pointer" },
  progressBackText: { color: colors.gold, fontSize: 13, lineHeight: 17, fontWeight: "900" },

  readingViewport: { flex: 1, minHeight: 0 },
  scroll: { width: "100%", maxWidth: 1500, alignSelf: "center", paddingHorizontal: 28, paddingTop: 14, paddingBottom: 28 },
  workspace: { width: "100%", flexDirection: "row", alignItems: "stretch", justifyContent: "center", gap: 16 },
  workspaceCompact: { flexDirection: "column", alignItems: "center" },
  toolRail: {
    width: 92,
    minWidth: 92,
    padding: 10,
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
    shadowColor: colors.gold,
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    alignSelf: "flex-start",
  },
  toolRailEyebrow: {
    color: colors.gold,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
    textAlign: "center",
    marginBottom: 1,
  },
  toolButton: {
    minHeight: 74,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 4,
    cursor: "pointer",
  },
  toolButtonPrimary: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.goldSoft,
  },
  toolLabel: { color: colors.onSurface, fontSize: 11.5, lineHeight: 15, fontWeight: "900", textAlign: "center" },
  readingStack: { width: "100%", maxWidth: 1060, alignSelf: "center" },
  readingStackDesktop: { flex: 1, minWidth: 0, maxWidth: 1110 },
  infoPanel: {
    width: 318,
    minWidth: 318,
    padding: 21,
    gap: 15,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(5,6,10,0.82)",
    alignSelf: "flex-start",
  },
  infoEyebrow: { color: colors.gold, fontSize: 11.5, lineHeight: 15, fontWeight: "900", letterSpacing: 1.55 },
  infoTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 7 },
  infoMeta: { color: colors.muted, fontSize: 14, lineHeight: 19, fontWeight: "700", marginTop: 4 },
  infoDivider: { height: 1, backgroundColor: colors.border, opacity: 0.8 },
  infoBlock: { gap: 7 },
  infoLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  infoLabel: { color: colors.onSurface, fontSize: 13, lineHeight: 17, fontWeight: "900" },
  infoValue: { color: colors.gold, fontSize: 15, lineHeight: 19, fontWeight: "900" },
  infoStrong: { color: colors.onSurface, fontSize: 16, lineHeight: 21, fontWeight: "900" },
  infoFoot: { color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  infoTrack: { height: 4, borderRadius: 3, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  infoTrackFill: { height: 4, borderRadius: 3, backgroundColor: colors.gold },
  infoStats: { flexDirection: "row", gap: 6 },
  infoStat: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  infoStatValue: { color: colors.onSurface, fontSize: 13, lineHeight: 17, fontWeight: "900" },
  infoStatLabel: { color: colors.muted, fontSize: 9, lineHeight: 12, fontWeight: "800" },
  infoSettings: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  infoSettingsCopy: { flex: 1, minWidth: 0 },
  infoSettingsText: { color: colors.onSurface, fontSize: 13.5, lineHeight: 18, fontWeight: "900" },
  infoSettingsValue: { color: colors.muted, fontSize: 11.5, lineHeight: 15, fontWeight: "600", marginTop: 1 },
  loader: { paddingVertical: 60, alignItems: "center", gap: 16 },
  errorText: { color: colors.muted, fontSize: 15 },
  retryBtn: { backgroundColor: colors.brandPrimary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: colors.onBrandPrimary, fontWeight: "700" },

  card: {
    width: "100%",
    minHeight: 560,
    backgroundColor: "rgba(3,5,8,0.84)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 46,
    paddingTop: 24,
    paddingBottom: 30,
    overflow: "hidden",
    shadowColor: colors.gold,
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  cardSheen: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.borderStrong },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  desktopCardTop: { width: "100%", minHeight: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 18 },
  desktopListen: { minWidth: 132, minHeight: 50, paddingHorizontal: 17, borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.goldSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, cursor: "pointer" },
  desktopListenText: { color: colors.onSurface, fontFamily: serifFont, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  desktopBookmark: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center", cursor: "pointer" },
  desktopSurahHeader: { flex: 1, maxWidth: 420, alignSelf: "center", alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16, cursor: "pointer" },
  desktopSurahTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  surahTitleBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, paddingHorizontal: 8 },
  surahTitle: { flexShrink: 1, textAlign: "center", color: colors.onSurface, fontSize: 31, lineHeight: 37, fontFamily: serifFont, fontWeight: "900", letterSpacing: -0.7 },
  ayahCount: { color: colors.muted, fontSize: 13, lineHeight: 17, fontWeight: "800", textAlign: "center", marginTop: 2, letterSpacing: 0.3 },
  audioError: { color: colors.warning, fontSize: 12, textAlign: "center", marginTop: 6 },

  bismillah: { color: colors.gold, textAlign: "center", marginTop: 18, writingDirection: "rtl" },
  arabic: {
    width: "100%",
    maxWidth: 920,
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
  translationLabel: { color: colors.gold, fontSize: 12.5, lineHeight: 16, letterSpacing: 2.25, fontWeight: "900", textAlign: "center", marginBottom: 12 },
  translationScroll: { maxHeight: 230, flexGrow: 0, width: "100%", maxWidth: 860, alignSelf: "center" },
  translationScrollContent: { paddingHorizontal: 20, paddingVertical: 4 },
  english: { width: "100%", maxWidth: 860, alignSelf: "center", color: colors.onSurface, fontFamily: serifFont, fontSize: 28, lineHeight: 42, fontWeight: "600", textAlign: "center" },


  actions: {
    width: "100%",
    maxWidth: 1500,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(5,6,10,0.86)",
    shadowColor: colors.gold,
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
  },
  dockSheen: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  sideAction: {
    flex: 1,
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.goldSoft,
  },
  sideActionLabel: { color: colors.gold, fontSize: 12.5, lineHeight: 16, fontWeight: "900" },
  doneBtn: {
    flex: 1.35,
    backgroundColor: colors.brandPrimary,
    borderRadius: 18,
    minHeight: 60,
    justifyContent: "center",
    paddingVertical: 12,
    alignItems: "center",
  },
  doneText: { color: colors.onBrandPrimary, fontSize: 16.5, lineHeight: 20, fontWeight: "900" },
  nextAction: {
    flex: 1,
    minHeight: 60,
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
  nextValue: { color: colors.onSurface, fontSize: 17, lineHeight: 20, fontWeight: "900" },
  nextLabel: { color: colors.onSurface, fontSize: 12.5, lineHeight: 16, fontWeight: "800", opacity: 0.9 },

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
