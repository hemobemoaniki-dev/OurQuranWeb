import { Text } from "@/src/components/AppText";
import { Icon } from "@/src/components/Icon";
import { RecitationSpeedControl, type RecitationSpeed } from "@/src/components/RecitationSpeedControl";
import { useReaderAccount } from "@/src/context/AppState";
import { RECITER_PREVIEW_AYAH, RECITER_PREVIEW_SURAH, recitationUrl, RECITERS } from "@/src/data/reciters";
import { getCachedAyahUri } from "@/src/lib/audio-cache";
import { setAyahPlaybackRate } from "@/src/lib/audio";
import { READER_THEMES, type ReaderTheme, type ReaderThemeId } from "@/src/lib/reader-themes";
import { LinearGradient } from "expo-linear-gradient";
import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView as GestureScrollView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


export const ReaderQuickSettings = memo(function ReaderQuickSettings({
  visible,
  onClose,
  onBeforeReciterChange,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onBeforeReciterChange?: () => void;
  theme: ReaderTheme;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 1180;
  const { account, updateSettings } = useReaderAccount();
  const settings = account.settings;
  const [draftReciter, setDraftReciter] = useState(settings.reciter);
  const [draftSpeed, setDraftSpeed] = useState<RecitationSpeed>(settings.speed as RecitationSpeed);
  const [draftAutoplay, setDraftAutoplay] = useState(settings.autoplay);
  const [draftTheme, setDraftTheme] = useState<ReaderThemeId>(settings.readerTheme);
  const speedRef = useRef<RecitationSpeed>(settings.speed as RecitationSpeed);
  const sheetY = useSharedValue(0);

  const playerRef = useRef<AudioPlayer | null>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const previewRequest = useRef(0);
  const selectedPreview = useRef<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const stopPreview = useCallback(() => {
    previewRequest.current += 1;
    const player = playerRef.current;
    const subscription = subscriptionRef.current;
    playerRef.current = null;
    subscriptionRef.current = null;
    selectedPreview.current = null;
    try { player?.pause(); } catch {}
    try { subscription?.remove(); } catch {}
    try { player?.remove(); } catch {}
    setPreviewId(null);
    setPreviewLoading(false);
  }, []);

  const closeSheet = useCallback(() => {
    stopPreview();
    sheetY.value = 0;
    onClose();
  }, [onClose, sheetY, stopPreview]);

  const deferSetting = useCallback((partial: Partial<typeof settings>) => {
    requestAnimationFrame(() => updateSettings(partial));
  }, [updateSettings]);

  useEffect(() => {
    if (!visible) return;
    setDraftReciter(settings.reciter);
    const normalizedSpeed = settings.speed as RecitationSpeed;
    setDraftSpeed(normalizedSpeed);
    speedRef.current = normalizedSpeed;
    setDraftAutoplay(settings.autoplay);
    setDraftTheme(settings.readerTheme);
    sheetY.value = 0;
  }, [settings.autoplay, settings.readerTheme, settings.reciter, settings.speed, sheetY, visible]);

  useEffect(() => {
    if (visible) return;
    const frame = requestAnimationFrame(stopPreview);
    return () => cancelAnimationFrame(frame);
  }, [visible, stopPreview]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") stopPreview();
    });
    return () => {
      sub.remove();
      stopPreview();
    };
  }, [stopPreview]);

  useEffect(() => {
    try { playerRef.current?.setPlaybackRate(draftSpeed, "high"); } catch {}
  }, [draftSpeed]);

  const previewReciter = async (reciterId: string) => {
    const wasSelected = selectedPreview.current === reciterId;
    stopPreview();
    setPreviewError(false);
    if (wasSelected) return;

    onBeforeReciterChange?.();
    const request = previewRequest.current;
    selectedPreview.current = reciterId;
    setPreviewId(reciterId);
    setPreviewLoading(true);

    try {
      const source =
        (await getCachedAyahUri(reciterId, RECITER_PREVIEW_SURAH, RECITER_PREVIEW_AYAH)) ??
        recitationUrl(reciterId, RECITER_PREVIEW_SURAH, RECITER_PREVIEW_AYAH);
      if (request !== previewRequest.current) return;

      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      if (request !== previewRequest.current) return;
      await setIsAudioActiveAsync(true);
      if (request !== previewRequest.current) return;

      const player = createAudioPlayer({ uri: source }, {
        updateInterval: 300,
        preferredForwardBufferDuration: 4,
      });
      playerRef.current = player;
      player.setPlaybackRate(speedRef.current, "high");
      subscriptionRef.current = player.addListener("playbackStatusUpdate", (status) => {
        if (request !== previewRequest.current || playerRef.current !== player) return;
        setPreviewLoading(!status.isLoaded || status.isBuffering);
        if (status.error) {
          stopPreview();
          setPreviewError(true);
        } else if (status.didJustFinish) {
          stopPreview();
        }
      });
      player.play();
    } catch {
      if (request !== previewRequest.current) return;
      stopPreview();
      setPreviewError(true);
    }
  };

  const chooseReciter = (reciter: string) => {
    if (reciter === draftReciter) return;
    setDraftReciter(reciter);
    stopPreview();
    onBeforeReciterChange?.();
    deferSetting({ reciter });
    void Haptics.selectionAsync().catch(() => {});
  };

  const setSpeed = (speed: RecitationSpeed) => {
    if (draftSpeed === speed) return;
    speedRef.current = speed;
    setAyahPlaybackRate(speed);
    try { playerRef.current?.setPlaybackRate(speed, "high"); } catch {}
    deferSetting({ speed });
  };

  const setAutoplay = (autoplay: boolean) => {
    if (draftAutoplay === autoplay) return;
    setDraftAutoplay(autoplay);
    deferSetting({ autoplay });
  };

  const setReaderTheme = (readerTheme: ReaderThemeId) => {
    if (draftTheme === readerTheme) return;
    setDraftTheme(readerTheme);
    updateSettings({ readerTheme });
    void Haptics.selectionAsync().catch(() => {});
  };

  const sheetDrag = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .failOffsetX([-72, 72])
        .hitSlop({ top: 10, bottom: 18, left: 0, right: 0 })
        .onUpdate((event) => {
          // Follow the finger directly on the UI thread. A tiny upward allowance
          // makes reversing direction during the same drag feel natural.
          sheetY.value = Math.max(-10, event.translationY);
        })
        .onEnd((event) => {
          if (sheetY.value > 72 || event.velocityY > 520) {
            sheetY.value = withTiming(1100, { duration: 180 }, (finished) => {
              if (finished) runOnJS(closeSheet)();
            });
          } else {
            sheetY.value = withSpring(0, { damping: 25, stiffness: 360, mass: 0.62 });
          }
        })
        .onFinalize(() => {
          if (sheetY.value < 72) {
            sheetY.value = withSpring(0, { damping: 25, stiffness: 360, mass: 0.62 });
          }
        }),
    [closeSheet, sheetY],
  );

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSheet}
      testID="reader-quick-settings"
    >
      <GestureHandlerRootView style={styles.modalRoot}>
      <View style={[styles.backdrop, desktop && styles.backdropDesktop]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeSheet}
          accessibilityRole="button"
          accessibilityLabel="Close reader settings"
          testID="reader-quick-settings-backdrop"
        />
        <Animated.View
          style={[
            styles.sheet,
            desktop && styles.sheetDesktop,
            {
              backgroundColor: theme.base,
              borderColor: theme.border,
            },
            sheetAnimatedStyle,
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[theme.accent + "26", theme.end + "12", "rgba(0,0,0,0.10)"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <GestureDetector gesture={sheetDrag}>
            <View style={styles.dragZone} testID="reader-quick-settings-drag-zone">
              <View style={[styles.grab, desktop && styles.grabDesktop, { backgroundColor: theme.border + "99" }]} />
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrow}>READER CONTROLS</Text>
                  <Text style={styles.title}>Recitation settings</Text>
                  <Text style={styles.subtitle}>Compare voices and tune playback without leaving your ayah.</Text>
                </View>
              </View>
            </View>
          </GestureDetector>

          <GestureScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            ]}
            showsVerticalScrollIndicator
            persistentScrollbar
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            bounces
            testID="reader-quick-settings-scroll"
          >
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Icon name="microphone-outline" size={21} color={theme.accent} />
                <Text style={[styles.sectionTitle, { color: theme.accent }]}>Reciter</Text>
                <Text style={styles.sectionHint}>Preview Ayat al-Kursi</Text>
              </View>

              {previewError ? (
                <View style={[styles.inlineNotice, { borderColor: theme.border + "77" }]}>
                  <Icon name="alert-circle-outline" size={17} color={theme.accent} />
                  <Text style={styles.inlineNoticeText}>Preview could not load. Tap play to try again.</Text>
                </View>
              ) : null}

              <View style={[styles.group, { borderColor: theme.border + "99", backgroundColor: theme.glass }]}>
                {RECITERS.map((reciter, index) => {
                  const selected = draftReciter === reciter.id;
                  const previewing = previewId === reciter.id;
                  return (
                    <View
                      key={reciter.id}
                      style={[
                        styles.reciterRow,
                        index < RECITERS.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.border + "66",
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => void previewReciter(reciter.id)}
                        accessibilityRole="button"
                        accessibilityLabel={(previewing ? "Stop preview of " : "Preview ") + reciter.name}
                        testID={"reader-quick-preview-" + reciter.id}
                        hitSlop={4}
                        style={({ pressed }) => [
                          styles.previewButton,
                          {
                            borderColor: previewing ? theme.accent : theme.border + "AA",
                            backgroundColor: previewing ? theme.accent + "24" : "rgba(255,255,255,0.035)",
                            opacity: pressed ? 0.55 : 1,
                          },
                        ]}
                      >
                        {previewing && previewLoading ? (
                          <ActivityIndicator size="small" color={theme.accent} />
                        ) : (
                          <Icon
                            name={previewing ? "stop" : "play"}
                            size={20}
                            color={previewing ? theme.accent : "#FFFFFF"}
                          />
                        )}
                      </Pressable>

                      <Pressable
                        onPress={() => chooseReciter(reciter.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={"Use " + reciter.name}
                        testID={"reader-quick-reciter-" + reciter.id}
                        style={({ pressed }) => [styles.reciterSelect, { opacity: pressed ? 0.58 : 1 }]}
                      >
                        <Text style={[styles.reciterName, selected && { color: theme.accent, fontWeight: "900" }]}>
                          {reciter.name}
                        </Text>
                        <View
                          style={[
                            styles.radio,
                            { borderColor: selected ? theme.accent : theme.border + "CC" },
                            selected && { backgroundColor: theme.accent },
                          ]}
                        >
                          {selected ? <Icon name="check" size={14} color={theme.base} /> : null}
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Icon name="palette-outline" size={21} color={theme.accent} />
                <Text style={[styles.sectionTitle, { color: theme.accent }]}>Reader theme</Text>
                <Text style={styles.sectionHint}>Applies instantly</Text>
              </View>
              <View style={styles.themeGrid} testID="reader-quick-theme-grid">
                {READER_THEMES.map((readerTheme) => {
                  const selected = draftTheme === readerTheme.id;
                  return (
                    <Pressable
                      key={readerTheme.id}
                      onPress={() => setReaderTheme(readerTheme.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={readerTheme.name}
                      testID={"reader-quick-theme-" + readerTheme.id}
                      style={({ pressed }) => [
                        styles.themeChip,
                        {
                          borderColor: selected ? readerTheme.accent : theme.border + "88",
                          backgroundColor: selected ? readerTheme.accent + "1F" : theme.glass,
                          opacity: pressed ? 0.62 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.themeSwatch, { backgroundColor: readerTheme.accent, borderColor: readerTheme.border }]} />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.themeName,
                          { color: selected ? readerTheme.accent : "#FFFFFF" },
                        ]}
                      >
                        {readerTheme.name}
                      </Text>
                      {selected ? <Icon name="check-circle" size={17} color={readerTheme.accent} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Icon name="speedometer" size={21} color={theme.accent} />
                <Text style={[styles.sectionTitle, { color: theme.accent }]}>Speed</Text>
              </View>
              <RecitationSpeedControl
                value={draftSpeed}
                onChange={setSpeed}
                colors={{
                  accent: theme.accent,
                  text: "#FFFFFF",
                  muted: "#C9C4CD",
                  surface: theme.glass,
                  border: theme.border + "99",
                  rail: "rgba(255,255,255,0.24)",
                }}
                testID="reader-speed"
              />
            </View>

            <View style={styles.section}>
              <View style={[styles.autoplayRow, { borderColor: theme.border + "99", backgroundColor: theme.glass }]}>
                <View style={styles.autoplayIcon}>
                  <Icon name="play-circle-outline" size={25} color={theme.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.autoplayTitle}>Autoplay</Text>
                  <Text style={styles.autoplayHint}>Start the next ayah automatically as you continue reading.</Text>
                </View>
                <Switch
                  value={draftAutoplay}
                  onValueChange={setAutoplay}
                  trackColor={{ false: "rgba(255,255,255,0.18)", true: theme.accent + "88" }}
                  thumbColor={draftAutoplay ? theme.accent : "#E6E1E8"}
                  testID="reader-quick-autoplay-switch"
                  accessibilityLabel="Autoplay recitation"
                />
              </View>
            </View>
          </GestureScrollView>
        </Animated.View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  backdropDesktop: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingVertical: 18,
    paddingRight: 18,
  },
  sheet: {
    height: "84%",
    minHeight: 420,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  sheetDesktop: {
    width: 430,
    height: "96%",
    maxHeight: 860,
    borderRadius: 28,
    paddingHorizontal: 20,
  },
  dragZone: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
    minHeight: 118,
    justifyContent: "flex-start",
  },
  grab: {
    width: 46,
    height: 4,
    borderRadius: 99,
    alignSelf: "center",
    marginBottom: 14,
  },
  grabDesktop: { opacity: 0 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingBottom: 12,
  },
  eyebrow: {
    color: "#D8D2DC",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: -0.45,
    marginTop: 2,
  },
  subtitle: {
    color: "#D8D2DC",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: 20, paddingTop: 3 },
  section: { gap: 9 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 3 },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  sectionHint: { marginLeft: "auto", color: "#C9C4CD", fontSize: 10, fontWeight: "700" },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themeChip: {
    width: "48.5%",
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  themeSwatch: { width: 19, height: 19, borderRadius: 10, borderWidth: 1 },
  themeName: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 15, fontWeight: "800" },
  inlineNotice: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  inlineNoticeText: { flex: 1, color: "#D8D2DC", fontSize: 11, lineHeight: 15 },
  group: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  reciterRow: {
    minHeight: 62,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reciterSelect: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 2,
  },
  reciterName: { flex: 1, color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "700" },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  autoplayRow: {
    minHeight: 76,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  autoplayIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  autoplayTitle: { color: "#FFFFFF", fontSize: 16, lineHeight: 21, fontWeight: "900" },
  autoplayHint: { color: "#D8D2DC", fontSize: 11, lineHeight: 16, marginTop: 2 },
});
