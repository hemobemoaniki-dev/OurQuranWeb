import { Text } from "@/src/components/AppText";
import { Icon } from "@/src/components/Icon";
import { BrandMark } from "@/src/components/BrandMark";
import { ProfileMenu } from "@/src/components/ProfileMenu";
import { useReaderAccount } from "@/src/context/AppState";
import { useSession } from "@/src/context/SessionContext";
import { RECITERS, reciterById } from "@/src/data/reciters";
import { READER_THEMES, type ReaderTheme } from "@/src/lib/reader-themes";
import { formatClock } from "@/src/lib/dates";
import { arabicFont, serifFont } from "@/src/typography";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { useEffect, useRef, useState } from "react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

type MenuKey = "reciter" | "speed" | "autoplay" | "theme" | "textSize" | null;

const TEXT_SIZES = [
  { id: "small", label: "Small", arabic: 40, arabicLine: 68, english: 22, englishLine: 33 },
  { id: "standard", label: "Standard", arabic: 46, arabicLine: 78, english: 25, englishLine: 37 },
  { id: "large", label: "Large", arabic: 54, arabicLine: 88, english: 28, englishLine: 41 },
  { id: "xlarge", label: "Extra large", arabic: 62, arabicLine: 98, english: 31, englishLine: 45 },
] as const;

type Props = {
  theme: ReaderTheme;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  totalAyahs: number;
  juz: number;
  versesLeft: number;
  percent: number;
  reward: number;
  arabic?: string;
  english?: string;
  loading?: boolean;
  error?: boolean;
  bookmarked: boolean;
  audioPlaying: boolean;
  audioLoading: boolean;
  audioError: boolean;
  onToggleAudio: () => void;
  onStopAudio: () => void;
  onOpenPicker: () => void;
  onToggleBookmark: () => void;
  onPrevious: () => void;
  onDone: () => void;
  onNext: () => void;
  onBack: () => void;
};

const webGlass = Platform.OS === "web"
  ? ({ backdropFilter: "blur(22px) saturate(1.15)", WebkitBackdropFilter: "blur(22px) saturate(1.15)" } as any)
  : undefined;

export function DesktopReaderExperience({
  theme,
  surahName,
  surahNumber,
  ayahNumber,
  totalAyahs,
  juz,
  versesLeft,
  percent,
  reward,
  arabic,
  english,
  loading,
  error,
  bookmarked,
  audioPlaying,
  audioLoading,
  audioError,
  onToggleAudio,
  onStopAudio,
  onOpenPicker,
  onToggleBookmark,
  onPrevious,
  onDone,
  onNext,
  onBack,
}: Props) {
  const router = useRouter();
  const { account: readerAccount, updateSettings } = useReaderAccount();
  const { seconds } = useSession();
  const [menu, setMenu] = useState<MenuKey>(null);
  const settings = readerAccount.settings;
  const reciter = reciterById(settings.reciter);
  const activeReaderTheme = READER_THEMES.find((item) => item.id === settings.readerTheme) ?? READER_THEMES[0];
  const activeTextSize = TEXT_SIZES.find((item) => item.id === settings.readingSize) ?? TEXT_SIZES[1];

  const toggleMenu = (key: Exclude<MenuKey, null>) => setMenu((current) => current === key ? null : key);
  const navigate = (href: string) => {
    onStopAudio();
    router.replace(href as any);
  };

  return (
    <View style={styles.screen} testID="desktop-cinematic-reader">
      <View style={[styles.topNav, webGlass, { borderColor: theme.border + "88" }]}>
        <View style={styles.brandWrap}>
          <BrandMark size={54} tint={theme.accent} glow={theme.accent} intensity="medium" variant="mark" />
          <View>
            <Text style={styles.brandName}>OurQuran</Text>
            <Text style={[styles.brandTagline, { color: theme.accent }]}>READ AND ASCEND</Text>
          </View>
        </View>

        <View style={styles.navLinks}>
          <NavButton label="Home" onPress={() => navigate("/")} />
          <NavButton label="Quran" active accent={theme.accent} onPress={() => navigate("/read")} />
          <NavButton label="Adhkar" onPress={() => navigate("/adhkar")} />
          <NavButton label="Names" onPress={() => navigate("/names")} />
          <NavButton label="Settings" onPress={() => navigate("/preferences")} />
        </View>

        <View style={styles.navRight}>
          <ProfileMenu accent={theme.accent} onBeforeAction={onStopAudio} />
        </View>
      </View>

      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator
      >
        <View style={[styles.progressRibbon, webGlass, { borderColor: theme.border + "AA" }]}>
          <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} testID="reader-desktop-back">
            <Icon name="arrow-left" size={22} color={theme.accent} />
          </Pressable>

          <Pressable onPress={onOpenPicker} style={({ pressed }) => [styles.surahBlock, pressed && styles.pressed]} testID="reader-desktop-surah-picker">
            <View style={[styles.surahIcon, { borderColor: theme.accent + "99" }]}>
              <Icon name="book-open-page-variant-outline" size={31} color="#FFFFFF" />
            </View>
            <View>
              <View style={styles.surahNameRow}>
                <Text style={styles.ribbonSurah}>{surahName}</Text>
                <Icon name="chevron-down" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.ribbonSub}>Surah {surahNumber}</Text>
            </View>
          </Pressable>

          <View style={styles.ribbonDivider} />

          <View style={styles.juzBlock}>
            <Text style={styles.ribbonJuz}>Juz {juz}</Text>
            <View style={styles.progressCenter}>
              <View style={styles.ribbonTrack}>
                <LinearGradient colors={[theme.accent, theme.end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.ribbonFill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.ribbonProgressText}>{percent}% complete · {versesLeft} {versesLeft === 1 ? "verse" : "verses"} remaining</Text>
            </View>
          </View>

          <View style={styles.ribbonDivider} />

          <View style={styles.ribbonStat}>
            <Text style={styles.ribbonStatValue}>Ayah {ayahNumber} of {totalAyahs}</Text>
          </View>

          <View style={styles.ribbonDivider} />

          <View style={styles.sessionStat}>
            <Icon name="clock-outline" size={26} color={theme.accent} />
            <View>
              <Text style={styles.sessionLabel}>Session time</Text>
              <Text style={styles.sessionValue}>{formatClock(seconds)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.mainRow}>
          <View style={[styles.ayahPanel, webGlass, { borderColor: theme.border + "CC" }]}>
            <LinearGradient
              pointerEvents="none"
              colors={[theme.accent + "22", "rgba(12,9,5,0.18)", theme.end + "12"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.panelTop}>
              <Pressable
                onPress={onToggleAudio}
                style={({ pressed }) => [styles.listenButton, { borderColor: theme.accent + "AA" }, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={audioPlaying ? "Pause recitation" : "Listen to recitation"}
                testID="reader-desktop-listen"
              >
                {audioLoading ? <ActivityIndicator size="small" color={theme.accent} /> : <Icon name={audioPlaying ? "pause-circle" : "volume-high"} size={28} color={theme.accent} />}
                <Text style={styles.listenText}>{audioPlaying ? "Pause" : "Listen"}</Text>
              </Pressable>

              <View style={styles.titleCenter}>
                <Pressable onPress={onOpenPicker} style={({ pressed }) => [styles.titlePress, pressed && styles.pressed]}>
                  <Text style={styles.surahTitle}>{surahName}</Text>
                  <Icon name="chevron-down" size={21} color="#FFFFFF" />
                </Pressable>
                <Text style={styles.ayahSub}>Ayah {ayahNumber} of {totalAyahs}</Text>
                <View style={styles.titleOrnament}>
                  <View style={[styles.ornamentLine, { backgroundColor: theme.border }]} />
                  <View style={[styles.ornamentDiamond, { borderColor: theme.accent }]} />
                  <View style={[styles.ornamentLine, { backgroundColor: theme.border }]} />
                </View>
              </View>

              <Pressable
                onPress={onToggleBookmark}
                style={({ pressed }) => [styles.bookmarkButton, { borderColor: theme.accent + "AA" }, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark verse"}
                testID="reader-desktop-bookmark"
              >
                <Icon name={bookmarked ? "heart" : "heart-outline"} size={27} color={theme.accent} />
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.loader}><ActivityIndicator size="large" color={theme.accent} /></View>
            ) : error ? (
              <View style={styles.loader}><Text style={styles.errorText}>Bundled Quran text is unavailable.</Text></View>
            ) : (
              <>
                <ScrollView style={styles.arabicViewport} contentContainerStyle={styles.arabicContent} nestedScrollEnabled>
                  <Text selectable maxFontSizeMultiplier={1} style={[styles.arabic, { fontSize: activeTextSize.arabic, lineHeight: activeTextSize.arabicLine }]}>{arabic}</Text>
                </ScrollView>

                <View style={styles.translationSeparator}>
                  <View style={[styles.separatorLine, { backgroundColor: theme.border + "88" }]} />
                  <View style={[styles.separatorMedallion, { borderColor: theme.accent }]}>
                    <Icon name="star-four-points-outline" size={24} color={theme.accent} />
                  </View>
                  <View style={[styles.separatorLine, { backgroundColor: theme.border + "88" }]} />
                </View>

                <Text style={[styles.translationLabel, { color: theme.accent }]}>TRANSLATION</Text>
                <ScrollView style={styles.translationViewport} nestedScrollEnabled>
                  <Text selectable maxFontSizeMultiplier={1.12} style={[styles.english, { fontSize: activeTextSize.english, lineHeight: activeTextSize.englishLine }]}>{english}</Text>
                </ScrollView>

                <View style={styles.textActions}>
                  <Pressable
                    onPress={() => {
                      const message = `${arabic ?? ""}\n\n${english ?? ""}\n\n${surahName} ${surahNumber}:${ayahNumber} · OurQuran`;
                      void Share.share({ message }).catch(() => {});
                    }}
                    style={({ pressed }) => [styles.shareButton, { borderColor: theme.accent + "AA" }, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Share ayah"
                    testID="reader-desktop-share"
                  >
                    <Icon name="share-variant-outline" size={23} color="#FFFFFF" />
                    <Text style={styles.shareText}>Share</Text>
                  </Pressable>
                </View>
              </>
            )}

            {audioError ? (
              <Pressable onPress={onToggleAudio} style={({ pressed }) => [styles.audioNotice, { borderColor: theme.accent + "88" }, pressed && styles.pressed]}>
                <Icon name="alert-circle-outline" size={18} color={theme.accent} />
                <Text style={styles.audioNoticeText}>Audio source failed. Tap to retry with a fallback source.</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.sessionPanel, webGlass, { borderColor: theme.border + "CC" }]}>
            <LinearGradient pointerEvents="none" colors={[theme.accent + "19", "rgba(0,0,0,0.10)"]} style={StyleSheet.absoluteFill} />

            <View style={styles.sessionHeadingRow}>
              <Text style={styles.sessionHeading}>Your reading session</Text>
              <Icon name="chart-bar" size={27} color={theme.accent} />
            </View>

            <View style={styles.completionRow}>
              <AnimatedProgressRing percent={percent} accent={theme.accent} end={theme.end} />
              <View style={styles.remainingWrap}>
                <Text style={styles.remainingNumber}>{versesLeft}</Text>
                <Text style={styles.remainingText}>{versesLeft === 1 ? "verse remaining" : "verses remaining"}</Text>
                <Text style={styles.remainingAyah}>Ayah {ayahNumber} of {totalAyahs}</Text>
              </View>
            </View>

            <ControlRow
              icon="microphone-outline"
              title="Reciter"
              value={reciter.name}
              open={menu === "reciter"}
              accent={theme.accent}
              onPress={() => toggleMenu("reciter")}
              testID="reader-desktop-reciter-control"
            />
            {menu === "reciter" ? (
              <View style={[styles.dropdown, { borderColor: theme.border + "99" }]} testID="reader-desktop-reciter-menu">
                {RECITERS.map((item) => {
                  const selected = item.id === settings.reciter;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        onStopAudio();
                        updateSettings({ reciter: item.id });
                        setMenu(null);
                      }}
                      style={({ pressed }) => [styles.dropdownRow, pressed && styles.pressed]}
                    >
                      <Text style={[styles.dropdownText, selected && { color: theme.accent }]}>{item.name}</Text>
                      {selected ? <Icon name="check" size={18} color={theme.accent} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <ControlRow
              icon="speedometer"
              title="Playback speed"
              value={`${settings.speed}×`}
              open={menu === "speed"}
              accent={theme.accent}
              onPress={() => toggleMenu("speed")}
              testID="reader-desktop-speed-control"
            />
            {menu === "speed" ? (
              <View style={[styles.dropdown, styles.speedGrid, { borderColor: theme.border + "99" }]} testID="reader-desktop-speed-menu">
                {SPEEDS.map((speed) => {
                  const selected = speed === settings.speed;
                  return (
                    <Pressable
                      key={speed}
                      onPress={() => {
                        updateSettings({ speed });
                        setMenu(null);
                      }}
                      style={({ pressed }) => [
                        styles.speedOption,
                        { borderColor: selected ? theme.accent : theme.border + "77", backgroundColor: selected ? theme.accent + "1F" : "rgba(255,255,255,0.035)" },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.speedText, selected && { color: theme.accent }]}>{speed}×</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <ControlRow
              icon="play-circle-outline"
              title="Autoplay"
              value={settings.autoplay ? "On" : "Off"}
              open={menu === "autoplay"}
              accent={theme.accent}
              onPress={() => toggleMenu("autoplay")}
              testID="reader-desktop-autoplay-control"
            />
            {menu === "autoplay" ? (
              <View style={[styles.dropdown, { borderColor: theme.border + "99" }]} testID="reader-desktop-autoplay-menu">
                <ChoiceRow
                  title="On"
                  detail="Start recitation when you manually move to the next ayah."
                  selected={settings.autoplay}
                  accent={theme.accent}
                  onPress={() => { updateSettings({ autoplay: true }); setMenu(null); }}
                />
                <ChoiceRow
                  title="Off"
                  detail="Changing ayahs stops audio until you press Listen."
                  selected={!settings.autoplay}
                  accent={theme.accent}
                  onPress={() => { onStopAudio(); updateSettings({ autoplay: false }); setMenu(null); }}
                />
              </View>
            ) : null}

            <ControlRow
              icon="palette-outline"
              title="Reader theme"
              value={activeReaderTheme.name}
              open={menu === "theme"}
              accent={theme.accent}
              onPress={() => toggleMenu("theme")}
              testID="reader-desktop-theme-control"
            />
            {menu === "theme" ? (
              <View style={[styles.dropdown, { borderColor: theme.border + "99" }]} testID="reader-desktop-theme-menu">
                {READER_THEMES.map((item) => {
                  const selected = item.id === settings.readerTheme;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => { updateSettings({ readerTheme: item.id }); setMenu(null); }}
                      style={({ pressed }) => [styles.dropdownRow, pressed && styles.pressed]}
                    >
                      <View style={styles.themeOptionCopy}>
                        <View style={[styles.themeSwatch, { backgroundColor: item.accent, borderColor: item.border }]} />
                        <Text style={[styles.dropdownText, selected && { color: theme.accent }]}>{item.name}</Text>
                      </View>
                      {selected ? <Icon name="check" size={18} color={theme.accent} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <ControlRow
              icon="format-size"
              title="Text size"
              value={activeTextSize.label}
              open={menu === "textSize"}
              accent={theme.accent}
              onPress={() => toggleMenu("textSize")}
              testID="reader-desktop-text-size-control"
            />
            {menu === "textSize" ? (
              <View style={[styles.dropdown, { borderColor: theme.border + "99" }]} testID="reader-desktop-text-size-menu">
                {TEXT_SIZES.map((item) => {
                  const selected = item.id === settings.readingSize;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => { updateSettings({ readingSize: item.id }); setMenu(null); }}
                      style={({ pressed }) => [styles.dropdownRow, pressed && styles.pressed]}
                    >
                      <Text style={[styles.dropdownText, selected && { color: theme.accent }]}>{item.label}</Text>
                      {selected ? <Icon name="check" size={18} color={theme.accent} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.sessionFooter}>
              <View style={styles.footerMetric}>
                <Icon name="clock-outline" size={22} color={theme.accent} />
                <Text style={styles.footerLabel}>Session time</Text>
                <Text style={styles.footerValue}>{formatClock(seconds)}</Text>
              </View>
              <View style={styles.footerMetric}>
                <Icon name="book-open-page-variant-outline" size={22} color={theme.accent} />
                <Text style={styles.footerLabel}>Ayah</Text>
                <Text style={styles.footerValue}>{ayahNumber} / {totalAyahs}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.actionDock, webGlass, { borderColor: theme.border + "88" }]}>
          <Pressable
            onPress={onPrevious}
            style={({ pressed, hovered }: any) => [
              styles.glassAction,
              styles.previousAction,
              { borderColor: theme.border + "75" },
              hovered && { borderColor: theme.accent + "66", backgroundColor: theme.accent + "0D" },
              pressed && styles.pressed,
            ]}
            testID="reader-desktop-previous"
          >
            <LinearGradient
              pointerEvents="none"
              colors={[theme.accent + "10", "rgba(255,255,255,0.025)", "rgba(0,0,0,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.actionIconBubble, { borderColor: theme.accent + "38" }]}>
              <Icon name="arrow-left" size={25} color={theme.accent} />
            </View>
            <Text style={styles.previousText}>Previous ayah</Text>
          </Pressable>

          <Pressable
            onPress={onDone}
            style={({ pressed, hovered }: any) => [
              styles.glassAction,
              styles.doneAction,
              { borderColor: theme.accent + "70", shadowColor: theme.accent },
              hovered && { borderColor: theme.accent + "B5", backgroundColor: theme.accent + "11" },
              pressed && styles.pressed,
            ]}
            testID="reader-desktop-im-done"
          >
            <LinearGradient
              pointerEvents="none"
              colors={[theme.accent + "24", theme.end + "12", "rgba(255,255,255,0.035)"]}
              locations={[0, 0.62, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.doneIcon, { borderColor: theme.accent + "6E", backgroundColor: theme.accent + "16" }]}>
              <Icon name="check" size={22} color={theme.accent} />
            </View>
            <Text style={styles.doneText}>I&apos;m Done</Text>
          </Pressable>

          <Pressable
            onPress={onNext}
            style={({ pressed, hovered }: any) => [
              styles.glassAction,
              styles.nextAction,
              { borderColor: theme.border + "75" },
              hovered && { borderColor: theme.accent + "66", backgroundColor: theme.accent + "0D" },
              pressed && styles.pressed,
            ]}
            testID="reader-desktop-next"
          >
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0.025)", theme.accent + "10", "rgba(0,0,0,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View>
              <Text style={styles.nextTitle}>Next ayah</Text>
              <Text style={[styles.nextReward, { color: theme.accent }]}>+{reward} Hasanaat</Text>
            </View>
            <View style={[styles.actionIconBubble, { borderColor: theme.accent + "38" }]}>
              <Icon name="arrow-right" size={25} color={theme.accent} />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function AnimatedProgressRing({ percent, accent, end }: { percent: number; accent: string; end: string }) {
  const target = Math.max(0, Math.min(100, percent));
  const valueRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (frameRef.current != null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(frameRef.current);
    }

    const from = valueRef.current;
    const delta = target - from;
    const started = Date.now();
    const duration = Math.min(720, Math.max(360, Math.abs(delta) * 9));

    const tick = () => {
      const raw = Math.min(1, (Date.now() - started) / duration);
      const eased = 1 - Math.pow(1 - raw, 4);
      const next = from + delta * eased;
      valueRef.current = next;
      setDisplay(next);

      if (raw < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        valueRef.current = target;
        setDisplay(target);
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [target]);

  const angle = Math.max(0, Math.min(360, display * 3.6));
  const ringBackground = Platform.OS === "web"
    ? ({
        backgroundImage: `conic-gradient(from -90deg, ${accent} 0deg, ${end} ${angle}deg, rgba(255,255,255,0.11) ${angle}deg, rgba(255,255,255,0.11) 360deg)`,
      } as any)
    : { borderColor: accent };

  return (
    <View style={[styles.percentRingShell, { shadowColor: accent }]}>
      <View style={[styles.percentRingTrack, ringBackground]}>
        <View style={styles.percentRingInner}>
          <Text style={styles.percentNumber}>{Math.round(display)}%</Text>
        </View>
      </View>
      <View pointerEvents="none" style={[styles.percentRingGlow, { borderColor: accent + "55", shadowColor: accent }]} />
    </View>
  );
}

function NavButton({ label, active, accent = "#F6D85C", onPress }: { label: string; active?: boolean; accent?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}>
      <Text style={[styles.navText, active && { color: accent }]}>{label}</Text>
      {active ? <View style={[styles.navUnderline, { backgroundColor: accent }]} /> : null}
    </Pressable>
  );
}

function ControlRow({ icon, title, value, open, accent, onPress, testID }: {
  icon: any;
  title: string;
  value: string;
  open: boolean;
  accent: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.controlRow, pressed && styles.pressed]} testID={testID}>
      <View style={styles.controlIcon}><Icon name={icon} size={25} color={accent} /></View>
      <View style={styles.controlCopy}>
        <Text style={styles.controlTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.controlValue}>{value}</Text>
      </View>
      <Icon name={open ? "chevron-up" : "chevron-right"} size={23} color="#FFFFFF" />
    </Pressable>
  );
}

function ChoiceRow({ title, detail, selected, accent, onPress }: { title: string; detail: string; selected: boolean; accent: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choiceRow, pressed && styles.pressed]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.choiceTitle, selected && { color: accent }]}>{title}</Text>
        <Text style={styles.choiceDetail}>{detail}</Text>
      </View>
      <View style={[styles.choiceDot, { borderColor: selected ? accent : "rgba(255,255,255,0.35)" }, selected && { backgroundColor: accent }]}>
        {selected ? <Icon name="check" size={14} color="#0C0A07" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.985 }] },
  topNav: {
    minHeight: 72,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(5,6,7,0.58)",
    shadowColor: "#000000",
    shadowOpacity: 0.36,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 9 },
    overflow: "visible",
  },
  topNavWebGlass: {
    backdropFilter: "blur(22px) saturate(1.22)",
    WebkitBackdropFilter: "blur(22px) saturate(1.22)",
  } as any,
  topNavGloss: {
    position: "absolute",
    left: 22,
    right: 22,
    top: 1,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.26)",
    opacity: 0.72,
  },
  brandWrap: { width: 286, flexDirection: "row", alignItems: "center", gap: 12 },
  brandName: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 26, lineHeight: 29, fontWeight: "700" },
  brandTagline: { fontSize: 8, lineHeight: 11, letterSpacing: 2.2, fontWeight: "900" },
  navLinks: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  navButton: { minWidth: 76, height: 44, paddingHorizontal: 12, borderRadius: 14, alignItems: "center", justifyContent: "center", position: "relative" },
  navText: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 17, lineHeight: 22, fontWeight: "600" },
  navUnderline: { position: "absolute", height: 2, borderRadius: 3, left: 16, right: 16, bottom: 3, shadowColor: "#FFD760", shadowOpacity: 0.85, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  navRight: { width: 250, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", zIndex: 20 },
  searchButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  navRightDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.24)", marginHorizontal: 8 },
  profilePill: {
    flex: 1,
    justifyContent: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pageScroll: { flex: 1, minHeight: 0 },
  pageContent: { width: "100%", maxWidth: 1520, alignSelf: "center", paddingHorizontal: 40, paddingTop: 18, paddingBottom: 28, gap: 16 },
  progressRibbon: {
    minHeight: 96,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: "rgba(18,15,9,0.60)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    overflow: "hidden",
  },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 10 },
  surahBlock: { width: 330, flexDirection: "row", alignItems: "center", gap: 16 },
  surahIcon: { width: 56, height: 56, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.035)" },
  surahNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ribbonSurah: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 27, lineHeight: 31, fontWeight: "700" },
  ribbonSub: { color: "#D6CEBE", fontFamily: serifFont, fontSize: 15, marginTop: 1 },
  ribbonDivider: { width: 1, height: 58, backgroundColor: "rgba(255,255,255,0.18)", marginHorizontal: 20 },
  juzBlock: { flex: 1, flexDirection: "row", alignItems: "center", gap: 24, minWidth: 360 },
  ribbonJuz: { width: 72, color: "#FFFFFF", fontFamily: serifFont, fontSize: 20, textAlign: "center" },
  progressCenter: { flex: 1, gap: 9 },
  ribbonTrack: { height: 11, borderRadius: 8, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.18)" },
  ribbonFill: { height: 11, borderRadius: 8 },
  ribbonProgressText: { color: "#F2EADC", fontFamily: serifFont, fontSize: 14, textAlign: "center" },
  ribbonStat: { minWidth: 145, alignItems: "center" },
  ribbonStatValue: { color: "#F7F0E5", fontFamily: serifFont, fontSize: 18, textAlign: "center" },
  sessionStat: { minWidth: 170, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 13 },
  sessionLabel: { color: "#CFC6B6", fontFamily: serifFont, fontSize: 13 },
  sessionValue: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 19, fontWeight: "700" },

  mainRow: { flexDirection: "row", gap: 18, alignItems: "stretch" },
  ayahPanel: {
    flex: 1,
    minWidth: 0,
    minHeight: 535,
    borderRadius: 26,
    borderWidth: 1,
    backgroundColor: "rgba(18,15,9,0.54)",
    overflow: "hidden",
    paddingHorizontal: 30,
    paddingVertical: 22,
  },
  panelTop: { minHeight: 74, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  listenButton: {
    width: 155,
    height: 58,
    borderRadius: 30,
    borderWidth: 1,
    backgroundColor: "rgba(14,13,10,0.55)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  listenText: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 17, fontWeight: "600" },
  titleCenter: { flex: 1, alignItems: "center", paddingHorizontal: 20 },
  titlePress: { flexDirection: "row", alignItems: "center", gap: 6 },
  surahTitle: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 30, lineHeight: 36, fontWeight: "700" },
  ayahSub: { color: "#DED4C3", fontFamily: serifFont, fontSize: 15, marginTop: 2 },
  titleOrnament: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 13 },
  ornamentLine: { width: 45, height: 1 },
  ornamentDiamond: { width: 13, height: 13, borderWidth: 2, transform: [{ rotate: "45deg" }] },
  bookmarkButton: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, backgroundColor: "rgba(14,13,10,0.55)", alignItems: "center", justifyContent: "center" },
  loader: { flex: 1, minHeight: 340, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { color: "#FFFFFF", fontSize: 16 },
  arabicViewport: { maxHeight: 235, marginTop: 24 },
  arabicContent: { minHeight: 190, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 12 },
  arabic: {
    color: "#FFFFFF",
    fontFamily: arabicFont,
    fontSize: 46,
    lineHeight: 78,
    textAlign: "center",
    writingDirection: "rtl",
    textShadowColor: "rgba(255,216,104,0.18)",
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  translationSeparator: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12, marginBottom: 16 },
  separatorLine: { flex: 1, height: 1 },
  separatorMedallion: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.22)" },
  translationLabel: { textAlign: "center", fontSize: 10, letterSpacing: 2.4, fontWeight: "900", marginBottom: 8 },
  translationViewport: { maxHeight: 122 },
  english: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 25, lineHeight: 37, textAlign: "center", fontWeight: "600", paddingHorizontal: 30 },
  textActions: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 10 },
  shareButton: { minWidth: 126, height: 52, borderRadius: 27, borderWidth: 1, backgroundColor: "rgba(8,8,7,0.50)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 18 },
  shareText: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 16, fontWeight: "700" },
  audioNotice: { marginTop: 12, minHeight: 42, borderRadius: 14, borderWidth: 1, backgroundColor: "rgba(0,0,0,0.24)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  audioNoticeText: { color: "#F7F0E5", fontSize: 12, fontWeight: "700" },

  sessionPanel: {
    width: 350,
    borderRadius: 26,
    borderWidth: 1,
    backgroundColor: "rgba(12,11,8,0.66)",
    overflow: "hidden",
    padding: 20,
    gap: 10,
  },
  sessionHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  sessionHeading: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 24, lineHeight: 29, fontWeight: "700" },
  completionRow: { flexDirection: "row", alignItems: "center", gap: 18, paddingVertical: 6 },
  percentRingShell: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowOpacity: 0.34,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  percentRingTrack: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  percentRingInner: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(9,9,8,0.93)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  percentRingGlow: {
    position: "absolute",
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    opacity: 0.72,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  percentNumber: {
    color: "#FFFFFF",
    fontFamily: serifFont,
    fontSize: 24,
    fontWeight: "900",
    textShadowColor: "rgba(255,255,255,0.16)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  remainingWrap: { flex: 1, minWidth: 0 },
  remainingNumber: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 30, lineHeight: 32 },
  remainingText: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 16 },
  remainingAyah: { color: "#D8CEBC", fontFamily: serifFont, fontSize: 14, marginTop: 2 },
  controlRow: {
    minHeight: 68,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,218,93,0.30)",
    backgroundColor: "rgba(255,255,255,0.045)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },
  controlIcon: { width: 32, alignItems: "center" },
  controlCopy: { flex: 1, minWidth: 0 },
  controlTitle: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 16, fontWeight: "700" },
  controlValue: { color: "#D5CCBD", fontSize: 12, marginTop: 2 },
  dropdown: { borderRadius: 15, borderWidth: 1, backgroundColor: "rgba(5,5,4,0.88)", overflow: "hidden", padding: 6, gap: 2 },
  dropdownRow: { minHeight: 44, borderRadius: 10, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  dropdownText: { color: "#FFFFFF", flex: 1, fontSize: 12.5, lineHeight: 17, fontWeight: "700" },
  themeOptionCopy: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 9 },
  themeSwatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1 },
  speedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  speedOption: { width: "31.5%", minHeight: 40, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  speedText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  choiceRow: { minHeight: 64, borderRadius: 11, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 8 },
  choiceTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  choiceDetail: { color: "#CFC6B7", fontSize: 10.5, lineHeight: 14, marginTop: 2 },
  choiceDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sessionFooter: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", paddingTop: 12, gap: 10 },
  footerMetric: { flexDirection: "row", alignItems: "center", gap: 9 },
  footerLabel: { flex: 1, color: "#E9E2D6", fontFamily: serifFont, fontSize: 14 },
  footerValue: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 15, fontWeight: "700" },

  actionDock: {
    minHeight: 96,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: "rgba(7,8,8,0.46)",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 11,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 9 },
  },
  glassAction: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(9,10,10,0.46)",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    cursor: "pointer",
  },
  previousAction: { flex: 1, gap: 13 },
  previousText: { color: "#F8F4EC", fontFamily: serifFont, fontSize: 17, fontWeight: "700" },
  doneAction: {
    flex: 1.24,
    gap: 13,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  actionIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.028)",
  },
  doneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    color: "#FFFDF7",
    fontFamily: serifFont,
    fontSize: 24,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  nextAction: { flex: 1, gap: 16 },
  nextTitle: { color: "#F8F4EC", fontFamily: serifFont, fontSize: 17, lineHeight: 20, fontWeight: "800", textAlign: "center" },
  nextReward: { fontFamily: serifFont, fontSize: 13, fontWeight: "900", textAlign: "center", marginTop: 2 },
});
