import { Text } from "@/src/components/AppText";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/src/components/Icon";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { StreakBadge } from "@/src/components/StreakBadge";
import { useAccount, useAuth } from "@/src/context/AppState";
import { surahMeta } from "@/src/data/surahs";
import { computeStreak, dateKey, formatK } from "@/src/lib/dates";
import { dashboardDays, dashboardStats, readingDayState, readingDuration, type Period } from "@/src/lib/dashboard";
import { consumePendingCrownCelebration, crownActiveForStreak } from "@/src/lib/streak-crown";
import { makeStyles, useTheme } from "@/src/theme";

const PERIODS: { key: Period; label: string }[] = [{ key: "today", label: "Today" }, { key: "week", label: "Week" }, { key: "all", label: "All time" }];

export default function Home() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { account, hydrated, syncStatus, lastSyncAt } = useAccount();
  const { user, initializing } = useAuth();
  const [period, setPeriod] = useState<Period>("today");
  const [crownCelebrationToken, setCrownCelebrationToken] = useState(0);
  const { editGoal } = useLocalSearchParams<{ editGoal?: string }>();
  useEffect(() => {
    if (editGoal !== "1" || !hydrated) return;
    router.setParams({ editGoal: "" });
    router.push("/settings/goal");
  }, [editGoal, hydrated, router]);
  const today = dateKey(new Date());
  const localDay = useMemo(() => new Date(`${today}T12:00:00`), [today]);
  const days = useMemo(() => dashboardDays(localDay), [localDay]);
  const stats = useMemo(() => dashboardStats(account, period, localDay), [account, period, localDay]);
  const streak = useMemo(() => computeStreak(account.history, localDay), [account.history, localDay]);
  const crownActive = crownActiveForStreak(streak);
  const crownDayKey = useMemo(() => {
    if (!crownActive) return "";
    const readable = days.filter((day) => readingDayState(account.history, day.key, today) === "read");
    return readable[readable.length - 1]?.key ?? "";
  }, [account.history, crownActive, days, today]);
  useFocusEffect(
    useCallback(() => {
      if (!hydrated || !crownActive) return;
      let cancelled = false;
      void consumePendingCrownCelebration(streak, today, account.uid || "guest").then((shouldCelebrate) => {
        if (!cancelled && shouldCelebrate) setCrownCelebrationToken((token) => token + 1);
      });
      return () => { cancelled = true; };
    }, [account.uid, crownActive, hydrated, streak, today]),
  );
  const todayAyat = account.history[today]?.ayat ?? 0;
  const goal = account.settings.dailyGoal;
  const goalPct = Math.min(1, todayAyat / Math.max(1, goal));
  const goalReached = todayAyat >= goal;
  const checking = initializing || (!!user && !hydrated);
  const saved = !!user && hydrated && syncStatus === "synced" && !!lastSyncAt;
  const syncColor = checking ? colors.muted : (!user || syncStatus === "error" || syncStatus === "offline") ? (scheme === "dark" ? "#FF8497" : "#AE2645") : saved ? (scheme === "dark" ? "#6EE7B7" : "#16734E") : colors.gold;
  const syncTitle = user && hydrated && (saved || syncStatus === "syncing") ? "Syncing" : "Not syncing";
  const greetingName = user && hydrated && account.uid === user.uid ? account.username || "Reader" : "Reader";
  const meta = surahMeta(account.currentSurah);
  const palette = scheme === "dark" ? ["#FF91B7", "#88C8FF", "#FFCA91", "#75E4C5"] : ["#AD285D", "#236AB0", "#955209", "#16745E"];
  const highContrast = scheme === "dark" ? "#FFFFFF" : "#111111";

  return <View style={styles.root}>
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.welcome}>
        <Pressable onPress={() => router.push(user ? "/settings/profile" : "/auth")} accessibilityRole="button" accessibilityLabel={user ? "Edit your profile" : "Sign in"} style={({ pressed }) => [styles.identity, { opacity: pressed ? 0.65 : 1 }]}>
          <ProfileAvatar value={user ? account.photoURL : undefined} size={42} />
          <View style={styles.greeting} testID="home-greeting">
            <Text style={styles.salamLine} numberOfLines={1}>As-salamu alaykum,</Text>
            <Text style={styles.greetingName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{greetingName}</Text>
          </View>
        </Pressable>
        <StreakBadge
          streak={streak}
          crownActive={crownActive}
          celebrateToken={crownCelebrationToken}
          onPressProgress={() => router.push("/settings/progress")}
        />
      </View>

      <View style={styles.weekCard} testID="home-week-strip">
        <View style={styles.weekRow}>{days.map(d => {
          const state = readingDayState(account.history, d.key, today);
          const tint = state === "read" ? palette[3] : state === "missed" ? (scheme === "dark" ? "#FF8297" : "#B8324D") : d.key === today ? colors.gold : colors.border;
          return <View key={d.key} style={styles.day} accessible accessibilityLabel={`${d.key}: ${state === "pending" ? "today, not read yet" : state}`}>
            <View style={[styles.dayRing, { borderColor: tint, backgroundColor: state === "read" ? `${palette[3]}25` : state === "missed" ? "#FF829722" : "transparent" }]}>
              <Text style={[styles.dayLetter, { color: state === "future" || state === "untracked" ? colors.muted : tint }]}>{d.label}</Text>
              {state === "read" && d.key === crownDayKey ? (
                <View style={styles.dayCrown} testID={"week-crown-" + d.key}>
                  <Icon name="crown" size={13} color="#6B4700" />
                </View>
              ) : state === "read" ? (
                <View style={[styles.dayStatus, { backgroundColor: tint }]}><Icon name="check" size={9} color={colors.surface} /></View>
              ) : null}
              {state === "missed" && <View style={[styles.dayStatus, { backgroundColor: tint }]}><Icon name="minus" size={9} color={colors.surface} /></View>}
            </View>
            <View style={[styles.todayDot, { backgroundColor: d.key === today ? colors.gold : "transparent" }]} />
          </View>;
        })}</View>
        
      </View>

      <Pressable style={({ pressed }) => [styles.continueCard, { opacity: pressed ? 0.72 : 1 }]} onPress={() => router.push("/reader")} testID="continue-reading-card">
        <LinearGradient
          pointerEvents="none"
          colors={scheme === "dark"
            ? ["rgba(212,175,55,0.17)", "rgba(255,255,255,0.035)", "rgba(0,0,0,0.18)"]
            : ["rgba(212,175,55,0.16)", "rgba(255,255,255,0.72)", "rgba(255,252,244,0.88)"]}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.eyebrow}>{user && hydrated ? `CONTINUE READING · @${account.username || "reader"}` : "CONTINUE READING"}</Text>
          <Text style={[styles.continueName, { color: highContrast }]}>{meta.name}</Text>
          <Text style={[styles.helper, { color: scheme === "dark" ? "#D7D7D7" : "#5A554D" }]}>Ayah {account.currentAyah} of {meta.ayahs}</Text>
        </View>
        <View style={[styles.play, { borderColor: highContrast, backgroundColor: scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.42)" }]}>
          <Icon name="arrow-right" size={31} color={highContrast} />
        </View>
      </Pressable>

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Your journey</Text><Text style={styles.eyebrow}>OURQURAN</Text></View>
      <View style={styles.periods} accessibilityRole="tablist">
        <LinearGradient
          pointerEvents="none"
          colors={scheme === "dark"
            ? ["rgba(212,175,55,0.13)", "rgba(255,255,255,0.03)", "rgba(0,0,0,0.12)"]
            : ["rgba(212,175,55,0.11)", "rgba(255,255,255,0.70)", "rgba(248,244,234,0.86)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
        {PERIODS.map(p => (
          <Pressable
            key={p.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: period === p.key }}
            onPress={() => setPeriod(p.key)}
            style={({ pressed }) => [styles.period, period === p.key && styles.periodActive, { opacity: pressed ? 0.62 : 1 }]}
            testID={`dashboard-period-${p.key}`}
          >
            <Text style={[styles.periodText, { color: period === p.key ? colors.gold : highContrast }]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.grid} testID="hasanaat-tracker">
        <JourneyMetric label="Hasanaat" value={formatK(stats.hasanaat)} icon="heart" tint={palette[0]} index={0} />
        <JourneyMetric label="Ayahs read" value={formatK(stats.ayat)} icon="book-open-page-variant" tint={palette[1]} index={1} />
        <JourneyMetric label="Reading time" value={readingDuration(stats.seconds)} icon="clock-outline" tint={palette[2]} index={2} />
        <JourneyMetric label="Reading days" value={String(stats.days)} icon="calendar-check-outline" tint={palette[3]} index={3} />
      </View>

      <Pressable onPress={() => router.push("/settings/goal")} style={({ pressed }) => [styles.goalCard, { opacity: pressed ? 0.75 : 1 }]} accessibilityRole="button" accessibilityLabel="Edit daily reading goal" testID="home-goal-edit">
        <LinearGradient pointerEvents="none" colors={["#FFFFFF0D", colors.goldSoft, "transparent"]} style={styles.fill} />
        <View style={styles.goalHead}><View style={styles.goalTitle}><Icon name={goalReached ? "trophy-outline" : "target"} size={22} color={colors.gold} /><Text style={styles.cardTitle}>Daily Quran Goal</Text></View><Icon name="pencil-outline" size={18} color={colors.gold} /></View>
        <View style={styles.goalCount}><Text style={styles.goalValue}>{todayAyat}<Text style={styles.goalTotal}> / {goal} ayahs</Text></Text><Text style={styles.percent}>{Math.round(goalPct * 100)}%</Text></View>
        <View style={styles.track}><View style={[styles.trackFill, { width: `${goalPct * 100}%` }]} /></View>
        <Text style={styles.helper}>{goalReached ? "Alhamdulillah. Keep the goodness growing." : `${Math.max(0, goal - todayAyat)} more to reach today’s goal.`}</Text>
      </Pressable>

      <Pressable disabled={checking} onPress={() => router.push(user ? "/settings/sync" : "/auth")} style={({ pressed }) => [styles.syncCard, { opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityLabel={saved ? "Syncing enabled. All changes saved. Open sync details." : `${syncTitle}. Open account sync.`} testID="home-sync-card">
        <View style={[styles.syncDot, { backgroundColor: syncColor }]} /><View style={{ flex: 1, gap: 4 }}><Text style={styles.syncTitle}>{syncTitle}</Text></View><Icon name="chevron-right" size={18} color={colors.muted} />
      </Pressable>


    </ScrollView>
  </View>;
}

const JourneyMetric = memo(function JourneyMetric({ label, value, icon, tint, index }: { label: string; value: string; icon: IconName; tint: string; index: number }) {
  const styles = useStyles();
  return <View style={[styles.statCard, { borderColor: `${tint}52` }]}>
    <LinearGradient colors={[`${tint}17`, `${tint}05`, "transparent"]} locations={[0, 0.58, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
    <View style={styles.metricTop}>
      <View style={styles.metricStar}>
        <View style={[styles.metricStarFacet, { borderColor: `${tint}70`, backgroundColor: `${tint}16` }]} />
        <View style={[styles.metricStarFacet, styles.metricStarFacetTurn, { borderColor: `${tint}55`, backgroundColor: `${tint}0D` }]} />
        <View style={[styles.metricStarCore, { backgroundColor: `${tint}16`, borderColor: `${tint}88` }]}>
          <Icon name={icon} size={20} color={tint} />
        </View>
      </View>
      <Text style={[styles.metricIndex, { color: `${tint}A6` }]}>0{index + 1}</Text>
    </View>
    <Text style={[styles.statValue, { color: tint }]} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.65}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <View style={[styles.metricRail, { backgroundColor: tint }]} />
  </View>;
});

const useStyles = makeStyles(c => ({
  root: { flex: 1, backgroundColor: c.surface }, content: { width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 28, paddingBottom: 56, gap: 18 },
  welcome: { flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 4, paddingBottom: 2 }, identity: { flex: 1, minWidth: 0, flexDirection: "row", gap: 10, alignItems: "center" }, greeting: { flex: 1, minWidth: 0, justifyContent: "center", gap: 1 }, salamLine: { color: c.muted, fontSize: 12, lineHeight: 16, fontWeight: "600" }, greetingName: { color: c.onSurface, fontSize: 20, lineHeight: 24, fontWeight: "900", letterSpacing: -0.45 },
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  weekCard: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.surfaceSecondary, borderRadius: 18, borderWidth: 1, borderColor: c.border, gap: 4 }, weekRow: { flexDirection: "row", justifyContent: "space-between" }, day: { flex: 1, alignItems: "center", gap: 5 }, dayRing: { width: 32, height: 42, borderRadius: 7, borderWidth: 0, alignItems: "center", justifyContent: "center" }, dayLetter: { fontSize: 13, fontWeight: "700" }, dayStatus: { position: "absolute", right: 10, bottom: -3, borderRadius: 6, width: 12, height: 12, justifyContent: "center", alignItems: "center" }, dayCrown: { position: "absolute", right: 6, bottom: -7, width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#D9A72E", backgroundColor: "#FFD66A", justifyContent: "center", alignItems: "center", shadowColor: "#D9A72E", shadowOpacity: 0.35, shadowRadius: 4, elevation: 4 }, todayDot: { width: 4, height: 4, borderRadius: 2 }, weekHint: { color: c.muted, fontSize: 10, textAlign: "center" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }, sectionTitle: { color: c.onSurface, fontSize: 24, fontWeight: "800", letterSpacing: -0.45 }, eyebrow: { color: c.gold, fontSize: 9, letterSpacing: 1.7, fontWeight: "700" },
  periods: { position: "relative", flexDirection: "row", padding: 4, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: c.border, backgroundColor: "transparent" }, period: { flex: 1, minHeight: 46, paddingVertical: 11, alignItems: "center", justifyContent: "center", borderRadius: 14 }, periodActive: { backgroundColor: c.goldSoft, borderWidth: 1, borderColor: c.goldBorder }, periodText: { fontSize: 14, lineHeight: 18, fontWeight: "900", letterSpacing: -0.15 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, statCard: { width: "23%", flexGrow: 1, minWidth: 220, minHeight: 154, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 15, gap: 5, alignItems: "flex-start", borderRadius: 22, borderWidth: 1, overflow: "hidden", backgroundColor: c.surfaceSecondary }, metricTop: { width: "100%", flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }, metricStar: { width: 46, height: 46, alignItems: "center", justifyContent: "center" }, metricStarFacet: { position: "absolute", width: 31, height: 31, borderRadius: 7, borderWidth: 1, transform: [{ rotate: "45deg" }] }, metricStarFacetTurn: { transform: [{ rotate: "0deg" }, { scale: 0.88 }] }, metricStarCore: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" }, metricIndex: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 1.5 }, statLabel: { color: c.muted, fontSize: 11, lineHeight: 15, fontWeight: "700", letterSpacing: 0.2 }, statValue: { fontSize: 29, lineHeight: 34, fontWeight: "900", letterSpacing: -0.8 }, metricRail: { position: "absolute", left: 16, right: 16, bottom: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  goalCard: { overflow: "hidden", padding: 22, gap: 14, borderRadius: 23, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.goldBorder }, goalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, goalTitle: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }, cardTitle: { color: c.onSurface, fontSize: 15, fontWeight: "600", flex: 1 }, goalCount: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, goalValue: { color: c.onSurface, fontSize: 24, fontWeight: "700" }, goalTotal: { color: c.muted, fontSize: 13, fontWeight: "400" }, percent: { color: c.gold, fontSize: 13, fontWeight: "700" }, track: { height: 6, borderRadius: 3, backgroundColor: c.surfaceTertiary, overflow: "hidden" }, trackFill: { height: 6, borderRadius: 3, backgroundColor: c.gold }, helper: { color: c.muted, fontSize: 11, lineHeight: 17 },
  syncCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15, borderRadius: 19, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary }, syncDot: { width: 14, height: 14, borderRadius: 7 }, syncTitle: { color: c.onSurface, fontSize: 14, fontWeight: "600" },
  continueCard: { position: "relative", overflow: "hidden", minHeight: 136, paddingHorizontal: 24, paddingVertical: 22, borderRadius: 23, borderWidth: 1, borderColor: c.goldBorder, backgroundColor: "transparent", flexDirection: "row", alignItems: "center", gap: 14 }, continueName: { color: c.onSurface, fontSize: 30, lineHeight: 36, fontWeight: "900", letterSpacing: -0.6 }, play: { width: 52, height: 52, borderRadius: 18, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
}));
