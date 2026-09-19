import Head from "expo-router/head";
import { Text, TextInput } from "@/src/components/AppText";
import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { SubHeader } from "@/src/components/SubHeader";
import { Icon } from "@/src/components/Icon";
import { useAccount } from "@/src/context/AppState";
import { todayKey } from "@/src/lib/dates";
import { adhkarFor, dhikrArabic, dhikrEnglish, TASBEEH_PHRASES, type Dhikr } from "@/src/data/adhkar";
import { makeStyles, useTheme } from "@/src/theme";

type Mode = "morning" | "evening" | "tasbeeh";

export default function Adhkar() {
  const styles = useStyles();
  const [mode, setMode] = useState<Mode>("morning");
  const { resetAdhkarIfNewDay } = useAccount();

  useEffect(() => {
    resetAdhkarIfNewDay();
  }, [resetAdhkarIfNewDay]);

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
    Haptics.selectionAsync().catch(() => {});
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (next === target) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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
