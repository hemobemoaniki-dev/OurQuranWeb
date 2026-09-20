import Head from "expo-router/head";
import { Text, TextInput } from "@/src/components/AppText";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { SubHeader } from "@/src/components/SubHeader";
import { Icon } from "@/src/components/Icon";
import { WebPageBackdrop } from "@/src/components/WebPageBackdrop";
import { useAccount } from "@/src/context/AppState";
import { computeStreak, todayKey } from "@/src/lib/dates";
import { formatCountdown, nextAdhkarWindow } from "@/src/lib/adhkar-schedule";
import { ADHKAR, adhkarFor, dhikrArabic, dhikrEnglish, TASBEEH_PHRASES, type Dhikr } from "@/src/data/adhkar";
import { makeStyles, useTheme } from "@/src/theme";
import { arabicFont, serifFont } from "@/src/typography";

type Mode = "morning" | "evening" | "tasbeeh";

function safeHaptic(action: () => unknown) {
  try {
    void Promise.resolve(action()).catch(() => {});
  } catch {}
}

export default function Adhkar() {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>("morning");
  const { resetAdhkarIfNewDay } = useAccount();

  useEffect(() => {
    resetAdhkarIfNewDay();
  }, [resetAdhkarIfNewDay]);

  if (Platform.OS === "web" && width >= 1080) return <DesktopAdhkar />;

  return (
    <>
      <Head><title>Adhkar & Digital Tasbeeh — OurQuran</title><meta name="description" content="Read morning and evening Adhkar and use a clean digital Tasbeeh counter with OurQuran." /></Head>
      <View style={styles.root}>
      <SubHeader title="Adhkar" showBack={false} />
      <View style={styles.segmentWrap}>
        <Segment label="Morning" icon="white-balance-sunny" active={mode === "morning"} onPress={() => setMode("morning")} testID="adhkar-tab-morning" />
        <Segment label="Evening" icon="weather-night" active={mode === "evening"} onPress={() => setMode("evening")} testID="adhkar-tab-evening" />
        <Segment label="Tasbeeh" icon="counter" active={mode === "tasbeeh"} onPress={() => setMode("tasbeeh")} testID="adhkar-tab-tasbeeh" />
      </View>
      {mode === "tasbeeh" ? <Tasbeeh /> : <DhikrList time={mode} />}
    </View>
    </>
  );
}

const DESKTOP_CATEGORIES = [
  { key: "all", label: "All", icon: "view-grid-outline" },
  { key: "morning", label: "Morning", icon: "white-balance-sunny" },
  { key: "evening", label: "Evening", icon: "weather-night" },
  { key: "prayer", label: "Prayer", icon: "mosque" },
  { key: "sleep", label: "Sleep", icon: "bed-outline" },
  { key: "gratitude", label: "Gratitude", icon: "heart" },
  { key: "protection", label: "Protection", icon: "shield-star-outline" },
  { key: "forgiveness", label: "Forgiveness", icon: "hand-back-right-outline" },
  { key: "guidance", label: "Guidance", icon: "compass-outline" },
  { key: "health", label: "Health", icon: "heart-pulse" },
  { key: "family", label: "Family", icon: "account-group" },
  { key: "anxiety", label: "Anxiety", icon: "heart-outline" },
  { key: "travel", label: "Travel", icon: "airplane" },
  { key: "home", label: "Home", icon: "home-outline" },
  { key: "food", label: "Food", icon: "food-apple-outline" },
  { key: "knowledge", label: "Knowledge", icon: "book-education-outline" },
] as const;
type DesktopCategory = typeof DESKTOP_CATEGORIES[number]["key"];

const CATEGORY_WORDS: Record<Exclude<DesktopCategory, "all" | "morning" | "evening">, string[]> = {
  prayer: ["prayer", "worship", "allah", "lord"],
  sleep: ["sleep", "night", "drowsiness", "bed"],
  gratitude: ["praise", "thanks", "blessing", "favour", "grateful"],
  protection: ["protect", "refuge", "harm", "evil", "guard", "sufficient"],
  forgiveness: ["forgiv", "pardon", "sin", "istighfar"],
  guidance: ["guidance", "good of the day", "set right", "light"],
  health: ["well-being", "body", "hearing", "sight", "health"],
  family: ["family", "wealth", "children", "household"],
  anxiety: ["worry", "grief", "fear", "anxiety", "distress"],
  travel: ["journey", "travel", "ride"],
  home: ["home", "house"],
  food: ["food", "eat", "provision"],
  knowledge: ["knowledge", "guidance", "learn"],
};

function DesktopAdhkar() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { account, setAdhkarCount, setTasbeeh } = useAccount();
  const [category, setCategory] = useState<DesktopCategory>("all");
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, maximumAge: 6 * 60 * 60 * 1000, timeout: 5000 },
      );
    }
    return () => clearInterval(timer);
  }, []);

  const items = useMemo(() => {
    const base = category === "morning"
      ? adhkarFor("morning")
      : category === "evening"
        ? adhkarFor("evening")
        : ADHKAR;
    const words = category === "all" || category === "morning" || category === "evening" ? null : CATEGORY_WORDS[category];
    const needle = query.trim().toLowerCase();
    return base.filter((item) => {
      const haystack = `${item.title} ${item.reference} ${item.english} ${item.englishEvening ?? ""} ${item.source}`.toLowerCase();
      const tagged = item.categories?.includes(category) ?? false;
      return (!words || tagged || words.some((word) => haystack.includes(word))) && (!needle || haystack.includes(needle) || item.arabic.includes(query.trim()));
    });
  }, [category, query]);

  const current = items[index] ?? null;
  const time: "morning" | "evening" = category === "evening" ? "evening" : "morning";
  const countKey = current ? `${time}:${current.id}` : "";
  const counts = account.adhkarProgress.date === todayKey() ? account.adhkarProgress.counts : {};
  const done = current ? counts[countKey] ?? 0 : 0;
  const complete = !!current && done >= current.count;
  const streak = computeStreak(account.history, new Date());
  const selectedPhrase = TASBEEH_PHRASES.find((item) => item.id === account.tasbeeh.phrase) ?? TASBEEH_PHRASES[0];

  const now = new Date(nowMs);
  const schedule = nextAdhkarWindow(now, coords ?? undefined);
  const untilLabel = formatCountdown(now, schedule.next);

  const move = (delta: number) => {
    if (!items.length) return;
    setIndex((value) => (value + delta + items.length) % items.length);
  };

  const markComplete = () => {
    if (!current) return;
    setAdhkarCount(countKey, current.count);
    safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  };

  return (
    <>
      <Head><title>Adhkar & Tasbeeh — OurQuran</title><meta name="description" content="Read authentic daily Adhkar, search by purpose, track completion and use a digital Tasbeeh counter." /></Head>
      <View style={styles.desktopRoot}>
        <WebPageBackdrop intensity="strong" />
        <ScrollView contentContainerStyle={styles.desktopPage} showsVerticalScrollIndicator={false}>
          <View style={styles.desktopHero}>
            <View>
              <Text style={styles.desktopEyebrow}>DHIKR BRINGS TRANQUILITY</Text>
              <Text style={styles.desktopTitle}>Adhkar</Text>
              <Text style={styles.desktopSubtitle}>Fill your day with the remembrance of Allah.</Text>
            </View>
            <Text style={styles.desktopQuote}>“Remember Allah often that you may be successful.”{`\n`}— Qur’an 62:10</Text>
          </View>

          <View style={styles.categoryShell}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.desktopCategories}>
              {DESKTOP_CATEGORIES.map((item) => {
                const active = category === item.key;
                return (
                  <Pressable key={item.key} onPress={() => { setCategory(item.key); setIndex(0); }} style={[styles.categoryButton, active && styles.categoryButtonActive]} testID={`adhkar-category-${item.key}`}>
                    <Icon name={item.icon as any} size={21} color={active ? colors.gold : colors.onSurface} />
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.desktopSearch}>
              <Icon name="magnify" size={22} color={colors.gold} />
              <TextInput value={query} onChangeText={(value) => { setQuery(value); setIndex(0); }} placeholder="Search adhkar…" placeholderTextColor={colors.muted} style={styles.desktopSearchInput} testID="adhkar-search" />
            </View>
          </View>

          <View style={styles.desktopContentRow}>
            {current ? (
              <View style={styles.featuredDhikr} testID={`dhikr-card-${current.id}`}>
                <View style={styles.featuredHead}>
                  <View style={styles.featuredIcon}><Icon name={time === "morning" ? "white-balance-sunny" : "weather-night"} size={29} color={colors.gold} /></View>
                  <View style={styles.featuredHeadCopy}>
                    <Text style={styles.featuredEyebrow}>{category === "all" ? "DAILY ADHKAR" : `${category.toUpperCase()} ADHKAR`}</Text>
                    <Text style={styles.featuredCount}>{index + 1} of {items.length} · {current.reference}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={complete ? "Completed" : "Mark this dhikr completed"} onPress={markComplete} style={({ pressed }) => [styles.completionChip, complete && styles.completionChipDone, pressed && styles.desktopPressed]}>
                    <Icon name={complete ? "check-circle" : "progress-check"} size={18} color={complete ? colors.success : colors.gold} />
                    <Text style={styles.completionText}>{complete ? "Completed" : `${done}/${current.count}`}</Text>
                  </Pressable>
                </View>

                <View style={styles.dhikrBody}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Previous dhikr" onPress={() => move(-1)} style={styles.roundArrow}><Icon name="chevron-left" size={30} color={colors.gold} /></Pressable>
                  <View style={styles.dhikrTextColumn}>
                    <Text style={styles.featuredArabic}>{dhikrArabic(current, time)}</Text>
                    <View style={styles.ornamentRow}><View style={styles.ornamentLine} /><Icon name="star-four-points" size={22} color={colors.gold} /><View style={styles.ornamentLine} /></View>
                    <Text style={styles.featuredEnglish}>{dhikrEnglish(current, time)}</Text>
                    <Text style={styles.featuredSource}>{current.source} · {current.authenticity}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Next dhikr" onPress={() => move(1)} style={styles.roundArrow}><Icon name="chevron-right" size={30} color={colors.gold} /></Pressable>
                </View>

              </View>
            ) : (
              <View style={styles.desktopEmpty}><Icon name="magnify-close" size={30} color={colors.gold} /><Text style={styles.desktopEmptyText}>No adhkar match this category and search.</Text></View>
            )}

            <View style={styles.desktopSide}>
              <View style={styles.streakCard}>
                <View style={styles.sideTitleRow}><Icon name="fire" size={25} color={colors.gold} /><Text style={styles.sideTitle}>Daily streak</Text></View>
                <Text style={styles.streakNumber}>{streak}</Text>
                <Text style={styles.streakDays}>days</Text>
                <Text style={styles.sideNote}>Keep remembering. Every dhikr counts.</Text>
              </View>
              <View style={styles.sideBottomRow}>
                <View style={styles.nextAdhkarCard}>
                  <View style={styles.sideTitleRow}><Icon name="clock-outline" size={23} color={colors.gold} /><Text style={styles.sideTitle}>Next adhkar</Text></View>
                  <Text style={styles.nextTime}>{untilLabel}</Text>
                  <Text style={styles.sideNote}>{schedule.kind === "evening" ? "Until evening Adhkar" : "Until morning Adhkar"}</Text>
                  <Text style={styles.reminderHint}>{schedule.precise ? "Local sunrise/sunset timing" : "Allow location for local solar timing"}</Text>
                </View>
                <View style={styles.tasbeehCard}>
                  <View style={styles.sideTitleRow}><Icon name="counter" size={23} color={colors.gold} /><Text style={styles.sideTitle}>Tasbeeh</Text></View>
                  <View style={styles.tasbeehPhrasePill}><Text style={styles.tasbeehPhrase}>{selectedPhrase.label}</Text></View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Increase Tasbeeh count" onPress={() => setTasbeeh((value) => ({ count: value.count + 1 }))} style={({ pressed }) => [styles.tasbeehRing, pressed && styles.desktopPressed]}>
                    <Text style={styles.tasbeehCount}>{account.tasbeeh.count}</Text><Text style={styles.tasbeehTarget}>of {account.tasbeeh.target}</Text>
                  </Pressable>
                  <View style={styles.tasbeehActions}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Decrease counter" onPress={() => setTasbeeh({ count: Math.max(0, account.tasbeeh.count - 1) })} style={styles.counterMini}><Icon name="minus" size={20} color={colors.gold} /></Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Reset counter" onPress={() => setTasbeeh({ count: 0 })} style={styles.counterMini}><Icon name="restore" size={20} color={colors.gold} /></Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Increase counter" onPress={() => setTasbeeh((value) => ({ count: value.count + 1 }))} style={[styles.counterMini, styles.counterMiniPrimary]}><Icon name="plus" size={20} color={colors.onBrandPrimary} /></Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function Segment({ label, icon, active, onPress, testID }: { label: string; icon: any; active: boolean; onPress: () => void; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={[styles.segment, active && styles.segmentActive]} onPress={onPress} testID={testID}>
      <Icon name={icon} size={16} color={active ? colors.onBrandPrimary : colors.muted} />
      <Text style={[styles.segmentText, { color: active ? colors.onBrandPrimary : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

function DhikrList({ time }: { time: "morning" | "evening" }) {
  const styles = useStyles();
  const { account } = useAccount();
  const items = adhkarFor(time);
  const counts = account.adhkarProgress.date === todayKey() ? account.adhkarProgress.counts : {};
  const completed = items.filter((d) => (counts[`${time}:${d.id}`] ?? 0) >= d.count).length;
  const total = items.length;
  const pct = total > 0 ? completed / total : 0;

  return (
    <FlatList
      data={items}
      keyExtractor={(d) => d.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.progressHeader} testID="adhkar-progress-header">
          <View style={styles.progressTop}>
            <Text style={styles.progressTitle}>{time === "morning" ? "Morning Adhkar" : "Evening Adhkar"}</Text>
            <Text style={styles.progressCount} testID="adhkar-progress-count">
              {completed}/{total} done
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            {completed === total ? "All done — may Allah accept it 🤲" : "Tap the gold count on each dhikr as you recite."}
          </Text>
        </View>
      }
      renderItem={({ item }) => <DhikrCard dhikr={item} time={time} />}
    />
  );
}

function DhikrCard({ dhikr, time }: { dhikr: Dhikr; time: "morning" | "evening" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { account, setAdhkarCount } = useAccount();
  const countKey = `${time}:${dhikr.id}`;
  const done = account.adhkarProgress.date === todayKey() ? account.adhkarProgress.counts[countKey] ?? 0 : 0;
  const complete = done >= dhikr.count;

  const tap = () => {
    safeHaptic(() => Haptics.selectionAsync());
    setAdhkarCount(countKey, (current) => Math.min(dhikr.count, current + 1));
  };

  return (
    <View style={styles.dhikrCard} testID={`dhikr-card-${dhikr.id}`}>
      <View style={styles.dhikrHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dhikrTitle}>{dhikr.title}</Text>
          <Text style={styles.dhikrRef}>{dhikr.reference}</Text>
        </View>
        <Pressable style={[styles.countPill, complete && styles.countPillDone]} onPress={tap} testID={`dhikr-count-${dhikr.id}`}>
          {complete ? (
            <Icon name="check" size={16} color={colors.onBrandPrimary} />
          ) : (
            <Text style={styles.countText}>
              {done}/{dhikr.count}
            </Text>
          )}
        </Pressable>
      </View>

      {dhikr.istiadha ? <Text style={styles.istiadha}>{dhikr.istiadha}</Text> : null}
      <Text style={styles.arabic}>{dhikrArabic(dhikr, time)}</Text>
      <Text style={styles.english}>{dhikrEnglish(dhikr, time)}</Text>

      <View style={styles.dhikrFoot}>
        <Text style={styles.source}>{dhikr.source}</Text>
        <View style={styles.authTag}>
          <Icon name="shield-check" size={13} color={colors.success} />
          <Text style={styles.authText}>{dhikr.authenticity}</Text>
        </View>
      </View>
    </View>
  );
}

function Tasbeeh() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { account, setTasbeeh } = useAccount();
  const { phrase, target, count } = account.tasbeeh;
  const selected = TASBEEH_PHRASES.find((p) => p.id === phrase) ?? TASBEEH_PHRASES[0];
  const [phraseOpen, setPhraseOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");

  const remaining = Math.max(0, target - count);
  const pct = Math.min(1, count / target);

  const tap = () => {
    const next = count + 1;
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    if (next === target) safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setTasbeeh((current) => ({ count: current.count + 1 }));
  };

  const setTarget = (t: number) => setTasbeeh({ target: t, count: 0 });

  return (
    <View style={styles.tasbeehWrap}>
      <Pressable style={styles.phraseSelector} onPress={() => setPhraseOpen(true)} testID="tasbeeh-phrase-selector">
        <Text style={styles.phraseText}>{selected.label}</Text>
        <Icon name="chevron-down" size={20} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.phraseMeaning}>{selected.meaning}</Text>

      <Pressable
        style={({ pressed }) => [styles.counterBtn, pressed && styles.counterPressed]}
        onPress={tap}
        testID="tasbeeh-counter"
        accessibilityRole="button"
        accessibilityLabel="Tasbeeh counter"
      >
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(236,202,105,0.17)", "rgba(255,255,255,0.035)", "rgba(255,255,255,0.012)"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.counterInner}>
          <Text selectable={false} style={styles.counterNum} testID="tasbeeh-count">{count}</Text>
          <Text selectable={false} style={styles.counterHint}>Tap to count</Text>
        </View>
      </Pressable>

      <View style={styles.targetRow}>
        {[33, 100, 300].map((t) => (
          <Pressable key={t} style={[styles.targetChip, target === t && styles.targetChipActive]} onPress={() => setTarget(t)} testID={`tasbeeh-target-${t}`}>
            <Text style={[styles.targetText, { color: target === t ? colors.onBrandPrimary : colors.onSurface }]}>{t}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.targetChip} onPress={() => setCustomOpen(true)} testID="tasbeeh-target-custom">
          <Text style={styles.targetText}>Custom</Text>
        </Pressable>
      </View>

      <View style={styles.tasbeehProgress}>
        <View style={styles.tasbeehProgressLabels}>
          <Text style={styles.tasbeehProgLabel}>
            {count} / {target}
          </Text>
          <Text style={styles.tasbeehProgLabel}>{remaining} remaining</Text>
        </View>
        <View style={styles.tasbeehTrack}>
          <View style={[styles.tasbeehFill, { width: `${pct * 100}%` }]} />
        </View>
      </View>

      <Pressable
        style={styles.resetBtn}
        onPress={() => {
          safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
          setTasbeeh({ count: 0 });
        }}
        testID="tasbeeh-reset"
      >
        <Icon name="restore" size={18} color={colors.gold} />
        <Text style={styles.resetText}>Reset Counter</Text>
      </Pressable>

      {/* Phrase picker */}
      <Modal visible={phraseOpen} transparent animationType="fade" onRequestClose={() => setPhraseOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPhraseOpen(false)}>
          <View style={styles.phraseSheet}>
            {TASBEEH_PHRASES.map((p) => (
              <Pressable
                key={p.id}
                style={styles.phraseOption}
                onPress={() => {
                  setTasbeeh({ phrase: p.id, count: 0 });
                  setPhraseOpen(false);
                }}
                testID={`phrase-option-${p.id}`}
              >
                <Text style={styles.phraseOptArabic}>{p.arabic}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.phraseOptLabel}>{p.label}</Text>
                  <Text style={styles.phraseOptMeaning}>{p.meaning}</Text>
                </View>
                {p.id === phrase ? <Icon name="check" size={18} color={colors.gold} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Custom target */}
      <Modal visible={customOpen} transparent animationType="fade" onRequestClose={() => setCustomOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCustomOpen(false)}>
          <View style={styles.customSheet}>
            <Text style={styles.customTitle}>Custom target</Text>
            <TextInput
              value={customVal}
              onChangeText={setCustomVal}
              keyboardType="number-pad"
              placeholder="e.g. 500"
              placeholderTextColor={colors.muted}
              style={styles.customInput}
              testID="tasbeeh-custom-input"
            />
            <Pressable
              style={styles.customSave}
              onPress={() => {
                const n = parseInt(customVal, 10);
                if (n > 0) setTarget(n);
                setCustomVal("");
                setCustomOpen(false);
              }}
              testID="tasbeeh-custom-save"
            >
              <Text style={styles.customSaveText}>Set target</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  desktopRoot: { flex: 1, backgroundColor: colors.surface, position: "relative", overflow: "hidden" },
  desktopPage: {
    width: "100%",
    maxWidth: 1540,
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingTop: 30,
    paddingBottom: 72,
    gap: 20,
    zIndex: 1,
  },
  desktopHero: {
    minHeight: 152,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 32,
    paddingHorizontal: 38,
    paddingVertical: 24,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
    shadowColor: colors.gold,
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },
  desktopEyebrow: { color: colors.gold, fontSize: 12, fontWeight: "800", letterSpacing: 2.5, marginBottom: 7 },
  desktopTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 52, lineHeight: 58, fontWeight: "700", letterSpacing: -1.4 },
  desktopSubtitle: { color: colors.onSurfaceSecondary, fontSize: 18, lineHeight: 27, marginTop: 4 },
  desktopQuote: { color: colors.gold, fontFamily: serifFont, fontSize: 17, lineHeight: 27, maxWidth: 420, textAlign: "right", opacity: 0.92 },
  categoryShell: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
  },
  desktopCategories: { flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 8 },
  categoryButton: {
    minWidth: 82,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "transparent",
    cursor: "pointer",
  },
  categoryButtonActive: { backgroundColor: colors.goldSoft, borderColor: colors.goldBorder },
  categoryText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  categoryTextActive: { color: colors.gold },
  desktopSearch: {
    width: 275,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceTertiary,
  },
  desktopSearchInput: { flex: 1, color: colors.onSurface, fontSize: 15, paddingVertical: 10 },
  desktopContentRow: { flexDirection: "row", alignItems: "stretch", gap: 20 },
  featuredDhikr: {
    flex: 1,
    minWidth: 0,
    minHeight: 552,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
    overflow: "hidden",
    shadowColor: colors.gold,
    shadowOpacity: 0.09,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
  },
  featuredHead: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  featuredIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldSoft,
  },
  featuredHeadCopy: { flex: 1, gap: 4 },
  featuredEyebrow: { color: colors.gold, fontSize: 12, fontWeight: "800", letterSpacing: 1.8 },
  featuredCount: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  completionChip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldSoft,
  },
  completionChipDone: { borderColor: colors.success, backgroundColor: "rgba(45,106,79,0.16)" },
  completionText: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  dhikrBody: {
    flex: 1,
    minHeight: 360,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    paddingHorizontal: 22,
    paddingVertical: 30,
  },
  roundArrow: {
    width: 52,
    height: 52,
    flexShrink: 0,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceTertiary,
    cursor: "pointer",
  },
  dhikrTextColumn: { flex: 1, maxWidth: 820, alignItems: "center", justifyContent: "center", gap: 16 },
  featuredArabic: {
    color: colors.onSurface,
    fontFamily: arabicFont,
    fontSize: 37,
    lineHeight: 64,
    textAlign: "center",
    writingDirection: "rtl",
  },
  ornamentRow: { width: "62%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  ornamentLine: { height: 1, flex: 1, backgroundColor: colors.goldBorder },
  featuredEnglish: { color: colors.onSurface, fontFamily: serifFont, fontSize: 22, lineHeight: 34, textAlign: "center", fontStyle: "italic" },
  featuredSource: { color: colors.gold, fontSize: 12, lineHeight: 18, textAlign: "center", fontWeight: "700", letterSpacing: 0.35 },
  featuredActions: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  secondaryAction: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceTertiary,
    cursor: "pointer",
  },
  secondaryActionText: { color: colors.gold, fontSize: 13, fontWeight: "800" },
  dotRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.borderStrong },
  dotActive: { width: 22, backgroundColor: colors.gold },
  completeButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: colors.brandPrimary,
    cursor: "pointer",
    shadowColor: colors.gold,
    shadowOpacity: 0.24,
    shadowRadius: 14,
  },
  completeButtonText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "900" },
  desktopPressed: { opacity: 0.74, transform: [{ scale: 0.985 }] },
  desktopEmpty: {
    flex: 1,
    minHeight: 552,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
  },
  desktopEmptyText: { color: colors.onSurface, fontFamily: serifFont, fontSize: 20 },
  desktopSide: { width: 420, flexShrink: 0, gap: 18 },
  streakCard: {
    minHeight: 220,
    alignItems: "center",
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
  },
  sideTitleRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 9 },
  sideTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 18, fontWeight: "700" },
  streakNumber: { color: colors.gold, fontFamily: serifFont, fontSize: 72, lineHeight: 78, fontWeight: "700", marginTop: 12 },
  streakDays: { color: colors.onSurface, fontSize: 13, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" },
  sideNote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 8 },
  sideBottomRow: { flex: 1, flexDirection: "row", gap: 14, alignItems: "stretch" },
  nextAdhkarCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 250,
    padding: 20,
    justifyContent: "space-between",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
  },
  nextTime: { color: colors.gold, fontFamily: serifFont, fontSize: 34, lineHeight: 40, fontWeight: "800", marginTop: 18, textAlign: "center" },
  reminderHint: { color: colors.gold, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 13 },
  tasbeehCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 250,
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
  },
  tasbeehPhrasePill: { minHeight: 30, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder, alignItems: "center", justifyContent: "center", marginTop: 8, alignSelf: "stretch" },
  tasbeehPhrase: { color: colors.gold, fontSize: 13, fontWeight: "900" },
  tasbeehRing: {
    width: 126,
    height: 126,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 13,
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
  },
  tasbeehCount: { color: colors.onSurface, fontFamily: serifFont, fontSize: 42, lineHeight: 46, fontWeight: "900" },
  tasbeehTarget: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  tasbeehActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  counterMini: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceTertiary,
    cursor: "pointer",
  },
  counterMiniPrimary: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  segmentWrap: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingBottom: 12,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  segmentActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  segmentText: { fontSize: 13, fontWeight: "700" },

  listContent: { width: "100%", maxWidth: 980, alignSelf: "center", paddingHorizontal: 28, paddingBottom: 56, gap: 14 },
  progressHeader: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: 16,
    gap: 10,
  },
  progressTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  progressCount: { color: colors.gold, fontSize: 14, fontWeight: "800" },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: colors.brandPrimary },
  progressHint: { color: colors.muted, fontSize: 12 },
  istiadha: { color: colors.gold, fontSize: 18, lineHeight: 34, textAlign: "right", writingDirection: "rtl", opacity: 0.9 },
  dhikrCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  dhikrHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dhikrTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  dhikrRef: { color: colors.muted, fontSize: 12, marginTop: 2 },
  countPill: {
    minWidth: 56,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillDone: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  countText: { color: colors.gold, fontWeight: "700", fontSize: 14 },
  arabic: {
    color: colors.onSurface,
    fontSize: 22,
    lineHeight: 44,
    textAlign: "right",
    writingDirection: "rtl",
  },
  english: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 22 },
  dhikrFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  source: { color: colors.gold, fontSize: 12, textDecorationLine: "underline" },
  authTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.goldSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  authText: { color: colors.success, fontSize: 11, fontWeight: "600" },

  // Tasbeeh
  tasbeehWrap: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center", alignItems: "center", paddingHorizontal: 28, paddingTop: 16 },
  phraseSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 240,
    justifyContent: "center",
  },
  phraseText: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
  phraseMeaning: { color: colors.muted, fontSize: 14, marginTop: 8, marginBottom: 18 },
  counterBtn: {
    width: 272,
    height: 272,
    borderRadius: 136,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.goldBorder,
    overflow: "hidden",
    cursor: "pointer",
    userSelect: "none",
    shadowColor: colors.gold,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  counterPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  counterInner: {
    width: 212,
    height: 212,
    borderRadius: 106,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  counterNum: { color: colors.gold, fontSize: 72, fontWeight: "900", textAlign: "center", lineHeight: 78, includeFontPadding: false, fontVariant: ["tabular-nums"] },
  counterHint: { color: colors.onSurface, fontSize: 13, opacity: 0.82, textAlign: "center", fontWeight: "700", letterSpacing: 0.2 },
  targetRow: { width: "100%", maxWidth: 560, flexDirection: "row", gap: 10, marginTop: 24, alignSelf: "center" },
  targetChip: {
    flex: 1,
    minWidth: 96,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
    cursor: "pointer",
    userSelect: "none",
  },
  targetChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary, shadowColor: colors.gold, shadowOpacity: 0.16, shadowRadius: 10 },
  targetText: { color: colors.onSurface, fontWeight: "800", fontSize: 14, textAlign: "center" },
  tasbeehProgress: { width: "100%", maxWidth: 560, marginTop: 22, gap: 8 },
  tasbeehProgressLabels: { flexDirection: "row", justifyContent: "space-between" },
  tasbeehProgLabel: { color: colors.muted, fontSize: 13 },
  tasbeehTrack: { height: 8, borderRadius: 999, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  tasbeehFill: { height: 8, borderRadius: 999, backgroundColor: colors.brandPrimary },
  resetBtn: {
    minWidth: 220,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
    cursor: "pointer",
  },
  resetText: { color: colors.gold, fontWeight: "700", fontSize: 15 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  phraseSheet: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.goldBorder, padding: 8 },
  phraseOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12 },
  phraseOptArabic: { color: colors.gold, fontSize: 22, width: 60, textAlign: "center" },
  phraseOptLabel: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  phraseOptMeaning: { color: colors.muted, fontSize: 12 },
  customSheet: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.goldBorder, padding: 20, gap: 14 },
  customTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
  customInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.onSurface,
    fontSize: 18,
  },
  customSave: { backgroundColor: colors.brandPrimary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  customSaveText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 15 },
}));
