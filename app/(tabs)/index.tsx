import { Text } from "@/src/components/AppText";
import { BrandMark } from "@/src/components/BrandMark";
import { Icon, type IconName } from "@/src/components/Icon";
import { ProfileMenu } from "@/src/components/ProfileMenu";
import { ReaderBackdrop } from "@/src/components/ReaderBackdrop";
import { StreakBadge } from "@/src/components/StreakBadge";
import { WebPageBackdrop } from "@/src/components/WebPageBackdrop";
import { useAccount, useAuth } from "@/src/context/AppState";
import { surahMeta } from "@/src/data/surahs";
import { computeStreak, dateKey, formatK } from "@/src/lib/dates";
import {
  dashboardDays,
  dashboardStats,
  readingDayState,
  readingDuration,
  type Period,
} from "@/src/lib/dashboard";
import { consumePendingCrownCelebration, crownActiveForStreak } from "@/src/lib/streak-crown";
import { makeStyles, useTheme } from "@/src/theme";
import { serifFont } from "@/src/typography";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "all", label: "All time" },
];

const WEEK_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Home() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 1180;
  const desktopWeb = Platform.OS === "web" && width >= 900;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { account, hydrated, syncStatus, lastSyncAt, updateSettings } = useAccount();
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
  const periodStats = useMemo(() => ({
    today: dashboardStats(account, "today", localDay),
    week: dashboardStats(account, "week", localDay),
    all: dashboardStats(account, "all", localDay),
  }), [account, localDay]);
  const metricsRef = useRef<ScrollView>(null);
  const metricsOffsetRef = useRef(0);
  const metricsMotionRef = useRef<number | null>(null);
  const metricsScrollX = useRef(new Animated.Value(0)).current;
  const [metricsWidth, setMetricsWidth] = useState(0);
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
  const goal = Math.max(1, account.settings.dailyGoal);
  const goalPct = Math.min(1, todayAyat / goal);
  const goalReached = todayAyat >= goal;
  const meta = surahMeta(account.currentSurah);
  const readingPct = Math.max(0, Math.min(1, account.currentAyah / Math.max(1, meta.ayahs)));

  const cancelMetricsMotion = useCallback(() => {
    if (metricsMotionRef.current != null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(metricsMotionRef.current);
      metricsMotionRef.current = null;
    }
  }, []);

  const slideMetricsTo = useCallback((nextPeriod: Period, animated = true) => {
    const targetIndex = PERIODS.findIndex((item) => item.key === nextPeriod);
    if (targetIndex < 0) return;
    setPeriod(nextPeriod);
    if (metricsWidth <= 0) return;

    const target = targetIndex * metricsWidth;

    if (animated && Platform.OS === "web" && typeof requestAnimationFrame === "function") {
      cancelMetricsMotion();
      const from = metricsOffsetRef.current;
      const distance = target - from;
      const duration = 300;
      const startedAt = performance.now();

      const frame = (now: number) => {
        const raw = Math.min(1, (now - startedAt) / duration);
        // Fast, modern ease-out: the cards move decisively, then settle softly.
        const eased = raw === 1 ? 1 : 1 - Math.pow(2, -10 * raw);
        const x = from + distance * eased;
        metricsOffsetRef.current = x;
        metricsScrollX.setValue(x);
        metricsRef.current?.scrollTo({ x, animated: false });

        if (raw < 1) {
          metricsMotionRef.current = requestAnimationFrame(frame);
        } else {
          metricsOffsetRef.current = target;
          metricsMotionRef.current = null;
        }
      };

      metricsMotionRef.current = requestAnimationFrame(frame);
      return;
    }

    metricsOffsetRef.current = target;
    metricsScrollX.setValue(target);
    metricsRef.current?.scrollTo({ x: target, animated });
  }, [cancelMetricsMotion, metricsWidth]);

  useEffect(() => {
    if (!metricsWidth) return;
    const timer = setInterval(() => {
      const currentIndex = PERIODS.findIndex((item) => item.key === period);
      const next = PERIODS[(currentIndex + 1) % PERIODS.length].key;
      slideMetricsTo(next, true);
    }, 3800);
    return () => clearInterval(timer);
  }, [metricsWidth, period, slideMetricsTo]);

  useEffect(() => () => cancelMetricsMotion(), [cancelMetricsMotion]);

  const checking = initializing || (!!user && !hydrated);
  const saved = !!user && hydrated && syncStatus === "synced" && !!lastSyncAt;
  const syncColor = checking
    ? colors.muted
    : !user
      ? colors.gold
      : (syncStatus === "error" || syncStatus === "offline")
        ? (scheme === "dark" ? "#FF8497" : "#AE2645")
        : saved
          ? (scheme === "dark" ? "#6EE7B7" : "#16734E")
          : colors.gold;
  const syncTitle = !user
    ? "Guest session"
    : syncStatus === "syncing"
      ? "Syncing"
      : saved
        ? "Synced"
        : "Sync needs attention";
  const syncNote = !user
    ? "Progress resets when this browser session ends. Sign in to keep your Quran journey."
    : syncStatus === "offline"
      ? "Offline. Your signed-in progress will sync when you reconnect."
      : syncStatus === "error"
        ? "Open sync settings to retry."
        : "Your Quran journey is saved to your account.";

  const greetingName = user && hydrated && account.uid === user.uid ? account.username || "Reader" : "Reader";
  const palette = scheme === "dark"
    ? ["#FF91B7", "#88C8FF", "#FFCA91", "#75E4C5"]
    : ["#AD285D", "#236AB0", "#955209", "#16745E"];

  return (
    <View style={styles.root}>
      {Platform.OS === "web" ? <WebPageBackdrop intensity="strong" /> : null}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.topCopy}>
            <Text style={styles.salamLine}>As-salamu alaykum,</Text>
            <Text style={styles.greetingName}>{greetingName}</Text>
            <Text style={styles.topSub}>Continue your Quran journey with focus and consistency.</Text>
          </View>

          {!desktopWeb ? <View style={styles.topActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={scheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              onPress={() => updateSettings({ theme: scheme === "dark" ? "light" : "dark" })}
              style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
              testID="home-theme-toggle"
            >
              <Icon name={scheme === "dark" ? "white-balance-sunny" : "weather-night"} size={21} color={colors.gold} />
            </Pressable>
            <StreakBadge
              streak={streak}
              crownActive={crownActive}
              celebrateToken={crownCelebrationToken}
              onPressProgress={() => router.push("/settings/progress")}
            />
            <ProfileMenu accent={colors.gold} compact />
          </View> : null}
        </View>

        <View style={[styles.primaryRow, compact && styles.stackRow]}>
          <Pressable
            style={({ pressed }) => [styles.hero, pressed && styles.cardPressed]}
            onPress={() => router.push("/reader")}
            testID="continue-reading-card"
          >
            {Platform.OS === "web" ? <ReaderBackdrop id="solar-ember" /> : null}
            <LinearGradient
              pointerEvents="none"
              colors={scheme === "dark"
                ? ["rgba(12,11,9,0.18)", "rgba(212,175,55,0.18)", "rgba(8,9,10,0.28)"]
                : ["rgba(255,249,230,0.34)", "rgba(212,175,55,0.13)", "rgba(255,252,244,0.44)"]}
              locations={[0, 0.52, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fill}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0.13)", "rgba(255,255,255,0.025)", "transparent"]}
              locations={[0, 0.35, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.heroGloss}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["transparent", "rgba(10,10,9,0.10)", "rgba(8,9,10,0.58)"]}
              locations={[0, 0.54, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.heroRightBlend}
            />
            <View pointerEvents="none" style={styles.heroTopEdge} />
            <View style={styles.heroMark}>
              <View pointerEvents="none" style={styles.heroMarkAura} />
              <BrandMark size={248} tint={colors.gold} glow={colors.gold} intensity="strong" tone="gold" />
            </View>
            <View style={styles.heroContent}>
              <Text style={styles.eyebrow}>CONTINUE READING</Text>
              <Text style={styles.heroTitle}>{meta.name}</Text>
              <Text style={styles.heroMeta}>Ayah {account.currentAyah} of {meta.ayahs}</Text>
              <View style={styles.heroProgressTrack}>
                <LinearGradient
                  pointerEvents="none"
                  colors={["#B06F18", "#DDAE3B", "#F4D06A", "#E7B13C"]}
                  locations={[0, 0.38, 0.72, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[
                    styles.heroProgressFill,
                    readingPct > 0 && styles.heroProgressFillVisible,
                    { width: `${readingPct * 100}%` },
                  ]}
                >
                  {readingPct >= 0.1 ? (
                    <View style={styles.heroProgressValueWrap}>
                      <Text style={styles.heroProgressValue}>{Math.round(readingPct * 100)}%</Text>
                    </View>
                  ) : null}
                </LinearGradient>
              </View>
              <View style={styles.heroFoot}>
                <View style={styles.readButton}>
                  <Text style={styles.readButtonText}>Read now</Text>
                  <Icon name="arrow-right" size={18} color={colors.onBrandPrimary} />
                </View>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/settings/goal")}
            style={({ pressed }) => [styles.goalCard, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel="Edit daily reading goal"
            testID="home-goal-edit"
          >
            <LinearGradient
              pointerEvents="none"
              colors={[colors.goldSoft, "rgba(255,255,255,0.025)", "transparent"]}
              locations={[0, 0.42, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fill}
            />
            <View pointerEvents="none" style={styles.goalTopEdge} />
            <View style={styles.goalTop}>
              <View>
                <Text style={styles.eyebrow}>DAILY GOAL</Text>
                <Text style={styles.goalTitle}>{goalReached ? "Goal complete" : "Today’s target"}</Text>
              </View>
              <Icon name="pencil-outline" size={18} color={colors.gold} />
            </View>
            <View style={styles.goalCenter}>
              <View style={styles.goalRing}>
                <Text style={styles.goalPercent}>{Math.round(goalPct * 100)}%</Text>
              </View>
              <View style={styles.goalNumbers}>
                <View style={styles.goalCountRow}>
                  <Text style={styles.goalValue}>{todayAyat}</Text>
                  <Text style={styles.goalDivider}>/</Text>
                  <Text style={styles.goalTarget}>{goal}</Text>
                </View>
                <Text style={styles.goalTotal}>ayahs today</Text>
                <View style={styles.goalRemainingPill}>
                  <Text style={styles.goalRemainingText}>
                    {goalReached ? "Goal reached" : `${Math.max(0, goal - todayAyat)} left`}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${goalPct * 100}%` }]} />
            </View>
          </Pressable>
        </View>

        <View style={styles.journeyHead}>
          <View>
            <Text style={styles.sectionTitle}>Your journey</Text>
            <Text style={styles.sectionSub}>A snapshot of your reading momentum.</Text>
          </View>
          <View style={styles.periods} accessibilityRole="tablist">
            {PERIODS.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: period === item.key }}
                onPress={() => slideMetricsTo(item.key, true)}
                style={({ pressed }) => [
                  styles.period,
                  period === item.key && styles.periodActive,
                  pressed && styles.pressed,
                ]}
                testID={`dashboard-period-${item.key}`}
              >
                <Text style={[styles.periodText, period === item.key && styles.periodTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View
          style={styles.metricsCarouselViewport}
          onLayout={(event) => {
            const width = Math.round(event.nativeEvent.layout.width);
            setMetricsWidth(width);
            const index = PERIODS.findIndex((item) => item.key === period);
            if (width > 0 && index >= 0) {
              const target = index * width;
              metricsOffsetRef.current = target;
              metricsScrollX.setValue(target);
              requestAnimationFrame(() => metricsRef.current?.scrollTo({ x: target, animated: false }));
            }
          }}
          testID="hasanaat-tracker"
        >
          <Animated.ScrollView
            ref={metricsRef as any}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const x = event.nativeEvent.contentOffset.x;
              metricsOffsetRef.current = x;
              metricsScrollX.setValue(x);
            }}
            onScrollBeginDrag={cancelMetricsMotion}
            onMomentumScrollEnd={(event) => {
              if (!metricsWidth) return;
              const index = Math.max(0, Math.min(PERIODS.length - 1, Math.round(event.nativeEvent.contentOffset.x / metricsWidth)));
              const settled = index * metricsWidth;
              metricsOffsetRef.current = settled;
              metricsScrollX.setValue(settled);
              setPeriod(PERIODS[index].key);
            }}
            contentContainerStyle={styles.metricsCarouselTrack}
          >
            {PERIODS.map((item, pageIndex) => {
              const pageStats = periodStats[item.key];
              const inputRange = metricsWidth > 0
                ? [(pageIndex - 1) * metricsWidth, pageIndex * metricsWidth, (pageIndex + 1) * metricsWidth]
                : [-1, 0, 1];
              const pageOpacity = metricsScrollX.interpolate({
                inputRange,
                outputRange: [0.42, 1, 0.42],
                extrapolate: "clamp",
              });
              const pageScale = metricsScrollX.interpolate({
                inputRange,
                outputRange: [0.965, 1, 0.965],
                extrapolate: "clamp",
              });
              const pageShift = metricsScrollX.interpolate({
                inputRange,
                outputRange: [metricsWidth * 0.085, 0, -metricsWidth * 0.085],
                extrapolate: "clamp",
              });
              const metricDefs = [
                { label: "Hasanaat", value: formatK(pageStats.hasanaat), icon: "heart" as IconName, tint: palette[0] },
                { label: "Ayahs read", value: formatK(pageStats.ayat), icon: "book-open-page-variant" as IconName, tint: palette[1] },
                { label: "Reading time", value: readingDuration(pageStats.seconds), icon: "clock-outline" as IconName, tint: palette[2] },
                { label: "Reading days", value: String(pageStats.days), icon: "calendar-check-outline" as IconName, tint: palette[3] },
              ];

              return (
                <Animated.View
                  key={item.key}
                  style={[
                    styles.metricsPage,
                    metricsWidth ? { width: metricsWidth } : null,
                    {
                      opacity: pageOpacity,
                      transform: [{ translateX: pageShift }, { scale: pageScale }],
                    },
                  ]}
                >
                  {metricDefs.map((metric, cardIndex) => {
                    const cardShift = metricsScrollX.interpolate({
                      inputRange,
                      outputRange: [34 + cardIndex * 13, 0, -(34 + cardIndex * 13)],
                      extrapolate: "clamp",
                    });
                    const cardLift = metricsScrollX.interpolate({
                      inputRange,
                      outputRange: [8 + cardIndex * 2, 0, 8 + cardIndex * 2],
                      extrapolate: "clamp",
                    });

                    return (
                      <Animated.View
                        key={metric.label}
                        style={[
                          styles.metricCardShell,
                          { transform: [{ translateX: cardShift }, { translateY: cardLift }] },
                        ]}
                      >
                        <JourneyMetric {...metric} />
                      </Animated.View>
                    );
                  })}
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
        </View>

        <View style={[styles.lowerRow, compact && styles.stackRow]}>
          <View style={styles.weekPanel} testID="home-week-strip">
            <View style={styles.panelHead}>
              <View>
                <Text style={styles.panelTitle}>Weekly journey</Text>
                <Text style={styles.panelSub}>Build a seven-day rhythm.</Text>
              </View>
              <View style={styles.streakPill}>
                <Icon name="fire" size={17} color={colors.gold} />
                <Text style={styles.streakValue}>{streak}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>
            </View>
            <View style={styles.weekRow}>
              {days.map((day, index) => {
                const state = readingDayState(account.history, day.key, today);
                const readTint = scheme === "dark" ? "#9AF75A" : "#25884A";
                const missedTint = scheme === "dark" ? "#FF5F73" : "#C92A45";
                const pendingTint = day.key === today ? colors.gold : (scheme === "dark" ? "#676B72" : "#8C8F95");
                const tint = state === "read"
                  ? readTint
                  : state === "missed"
                    ? missedTint
                    : pendingTint;

                const connectorTintFor = (targetIndex: number) => {
                  if (targetIndex < 0 || targetIndex >= days.length) return "transparent";
                  const target = days[targetIndex];
                  const targetState = readingDayState(account.history, target.key, today);
                  if (targetState === "read") return readTint;
                  if (targetState === "missed") return missedTint;
                  if (target.key === today) return colors.gold;
                  return scheme === "dark" ? "rgba(103,107,114,0.48)" : "rgba(140,143,149,0.42)";
                };

                const leftTint = index > 0 ? connectorTintFor(index - 1) : "transparent";
                const rightTint = index < days.length - 1 ? connectorTintFor(index) : "transparent";
                const isToday = day.key === today;
                const isCrown = state === "read" && day.key === crownDayKey;

                return (
                  <View key={day.key} style={styles.day}>
                    <View style={styles.dayNodeRow}>
                      <View style={[styles.dayConnector, index === 0 && styles.dayConnectorHidden, { backgroundColor: leftTint }]} />
                      <View
                        style={[
                          styles.dayNode,
                          {
                            borderColor: tint,
                            backgroundColor: state === "read"
                              ? `${readTint}28`
                              : state === "missed"
                                ? `${missedTint}24`
                                : isToday
                                  ? colors.goldSoft
                                  : colors.surfaceTertiary,
                            shadowColor: tint,
                            shadowOpacity: state === "future" ? 0 : 0.34,
                          },
                          isToday && styles.dayNodeToday,
                        ]}
                        testID={`week-day-${day.key}-${state}`}
                      >
                        {isCrown ? (
                          <View testID={"week-crown-" + day.key}><Icon name="crown" size={21} color={colors.gold} /></View>
                        ) : state === "read" ? (
                          <Icon name="check" size={22} color={tint} />
                        ) : state === "missed" ? (
                          <Icon name="close" size={23} color={tint} />
                        ) : isToday ? (
                          <View style={[styles.dayDot, { backgroundColor: colors.gold }]} />
                        ) : (
                          <View style={[styles.dayDot, { backgroundColor: scheme === "dark" ? "#73777E" : "#8C8F95" }]} />
                        )}
                      </View>
                      <View style={[styles.dayConnector, index === days.length - 1 && styles.dayConnectorHidden, { backgroundColor: rightTint }]} />
                    </View>

                    <Text style={[styles.dayLetter, isToday && { color: colors.gold }]}>{WEEK_DAY_NAMES[index]}</Text>
                    <Text style={[styles.dayState, { color: tint }]}>
                      {state === "read" ? (isCrown ? "Streak" : "Read") : state === "missed" ? "Missed" : isToday ? "Today" : "Upcoming"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <QuickAccessCarousel />
        </View>

        <Pressable
          disabled={checking}
          onPress={() => router.push(user ? "/settings/sync" : "/auth")}
          style={({ pressed }) => [styles.syncBanner, pressed && styles.cardPressed]}
          accessibilityRole="button"
          accessibilityLabel={`${syncTitle}. ${syncNote}`}
          testID="home-sync-card"
        >
          <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
          <View style={styles.syncCopy}>
            <Text style={styles.syncTitle}>{syncTitle}</Text>
            <Text style={styles.syncNote}>{syncNote}</Text>
          </View>
          <View style={styles.syncAction}>
            <Text style={styles.syncActionText}>{user ? "Manage" : "Sign in"}</Text>
            <Icon name="arrow-right" size={16} color={colors.gold} />
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const JourneyMetric = memo(function JourneyMetric({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: IconName;
  tint: string;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.statCard, { borderColor: `${tint}4D`, shadowColor: tint }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${tint}26`, `${tint}0D`, "rgba(255,255,255,0.018)", "transparent"]}
        locations={[0, 0.32, 0.62, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[`${tint}66`, `${tint}16`, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.metricTopGlow}
      />
      <View pointerEvents="none" style={[styles.metricAura, { backgroundColor: `${tint}14`, shadowColor: tint }]} />
      <View style={[styles.metricIcon, { borderColor: `${tint}70`, backgroundColor: `${tint}13` }]}>
        <Icon name={icon} size={21} color={tint} />
      </View>
      <Text style={[styles.statValue, { color: tint }]} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.68}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View pointerEvents="none" style={styles.metricBars}>
        {[0.35, 0.54, 0.68, 0.82, 1].map((height, index) => (
          <View key={index} style={[styles.metricBar, { height: `${height * 100}%`, backgroundColor: tint }]} />
        ))}
      </View>
    </View>
  );
});

const QUICK_ACCESS_ITEMS: { icon: IconName; label: string; hint: string; href: string }[] = [
  { icon: "bookmark-multiple-outline", label: "Bookmarks", hint: "Ayahs & Names", href: "/settings/bookmarks" },
  { icon: "target", label: "Daily Goal", hint: "Adjust your target", href: "/settings/goal" },
  { icon: "microphone-outline", label: "Reciter", hint: "Choose your voice", href: "/settings/reciter" },
  { icon: "chart-line", label: "Progress", hint: "Streaks & metrics", href: "/settings/progress" },
  { icon: "palette-outline", label: "Reader Theme", hint: "Reader atmosphere", href: "/settings/reader-theme" },
  { icon: "format-size", label: "Text Size", hint: "Reading comfort", href: "/settings/reader" },
  { icon: "speedometer", label: "Playback", hint: "Recitation speed", href: "/settings/speed" },
  { icon: "play-circle-outline", label: "Autoplay", hint: "Audio behavior", href: "/settings/autoplay" },
  { icon: "image-multiple-outline", label: "Background", hint: "Website scenery", href: "/settings/background" },
  { icon: "bell-outline", label: "Reminders", hint: "Reading notifications", href: "/settings/notifications" },
  { icon: "account-outline", label: "Profile", hint: "Identity & account", href: "/settings/profile" },
  { icon: "cloud-sync-outline", label: "Sync", hint: "Cloud status", href: "/settings/sync" },
];

function QuickAccessCarousel() {
  const styles = useStyles();
  const router = useRouter();
  const ref = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const motionRef = useRef<number | null>(null);
  const quickScrollX = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const totalPages = Math.ceil(QUICK_ACCESS_ITEMS.length / 4);

  const cancelMotion = useCallback(() => {
    if (motionRef.current != null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(motionRef.current);
      motionRef.current = null;
    }
  }, []);

  const goTo = useCallback((nextPage: number, animated = true) => {
    const normalized = (nextPage + totalPages) % totalPages;
    setPage(normalized);
    if (pageWidth <= 0) return;

    const target = normalized * pageWidth;

    // React Native Web's animated ScrollView jump can resolve immediately in
    // some browsers. Drive the offset ourselves so autoplay and arrow presses
    // always get a visible premium slide instead of a hard content swap.
    if (animated && Platform.OS === "web" && typeof requestAnimationFrame === "function") {
      cancelMotion();
      const from = offsetRef.current;
      const distance = target - from;
      const duration = 290;
      const startedAt = Date.now();

      const frame = () => {
        const elapsed = Date.now() - startedAt;
        const raw = Math.min(1, elapsed / duration);
        const eased = raw === 1 ? 1 : 1 - Math.pow(2, -10 * raw);
        const x = from + distance * eased;
        offsetRef.current = x;
        quickScrollX.setValue(x);
        ref.current?.scrollTo({ x, animated: false });

        if (raw < 1) {
          motionRef.current = requestAnimationFrame(frame);
        } else {
          offsetRef.current = target;
          motionRef.current = null;
        }
      };

      motionRef.current = requestAnimationFrame(frame);
      return;
    }

    offsetRef.current = target;
    quickScrollX.setValue(target);
    ref.current?.scrollTo({ x: target, animated });
  }, [cancelMotion, pageWidth, totalPages]);

  useEffect(() => {
    if (!pageWidth) return;
    const timer = setInterval(() => goTo(page + 1), 4000);
    return () => clearInterval(timer);
  }, [goTo, page, pageWidth]);

  useEffect(() => cancelMotion, [cancelMotion]);

  const pages = Array.from({ length: totalPages }, (_, pageIndex) => QUICK_ACCESS_ITEMS.slice(pageIndex * 4, pageIndex * 4 + 4));

  return (
    <View style={styles.quickPanel}>
      <View style={styles.panelHead}>
        <View>
          <Text style={styles.panelTitle}>Quick access</Text>
          <Text style={styles.panelSub}>12 shortcuts · auto previews four at a time.</Text>
        </View>
        <View style={styles.quickPager}>
          <Pressable accessibilityLabel="Previous shortcuts" onPress={() => goTo(page - 1)} style={styles.quickPagerButton}><Icon name="chevron-left" size={19} color="#ECCA69" /></Pressable>
          <View style={styles.quickDots}>{pages.map((_, index) => <View key={index} style={[styles.quickDot, index === page && styles.quickDotActive]} />)}</View>
          <Pressable accessibilityLabel="Next shortcuts" onPress={() => goTo(page + 1)} style={styles.quickPagerButton}><Icon name="chevron-right" size={19} color="#ECCA69" /></Pressable>
        </View>
      </View>
      <View
        style={styles.quickCarouselViewport}
        onLayout={(event) => {
          const width = Math.round(event.nativeEvent.layout.width);
          setPageWidth(width);
          const target = page * width;
          offsetRef.current = target;
          quickScrollX.setValue(target);
          requestAnimationFrame(() => ref.current?.scrollTo({ x: target, animated: false }));
        }}
      >
        <Animated.ScrollView
          ref={ref as any}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const x = event.nativeEvent.contentOffset.x;
            offsetRef.current = x;
            quickScrollX.setValue(x);
          }}
          onScrollBeginDrag={cancelMotion}
          onMomentumScrollEnd={(event) => {
            if (!pageWidth) return;
            const settled = Math.max(0, Math.min(totalPages - 1, Math.round(event.nativeEvent.contentOffset.x / pageWidth)));
            const target = settled * pageWidth;
            offsetRef.current = target;
            quickScrollX.setValue(target);
            setPage(settled);
          }}
          contentContainerStyle={styles.quickCarouselTrack}
        >
          {pages.map((items, pageIndex) => {
            const inputRange = pageWidth > 0
              ? [(pageIndex - 1) * pageWidth, pageIndex * pageWidth, (pageIndex + 1) * pageWidth]
              : [-1, 0, 1];
            const pageOpacity = quickScrollX.interpolate({
              inputRange,
              outputRange: [0.32, 1, 0.32],
              extrapolate: "clamp",
            });
            const pageScale = quickScrollX.interpolate({
              inputRange,
              outputRange: [0.95, 1, 0.95],
              extrapolate: "clamp",
            });
            const pageShift = quickScrollX.interpolate({
              inputRange,
              outputRange: [pageWidth * 0.11, 0, -pageWidth * 0.11],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={pageIndex}
                style={[
                  styles.quickPage,
                  pageWidth ? { width: pageWidth } : null,
                  {
                    opacity: pageOpacity,
                    transform: [{ translateX: pageShift }, { scale: pageScale }],
                  },
                ]}
              >
                {items.map((item, cardIndex) => {
                  const cardShift = quickScrollX.interpolate({
                    inputRange,
                    outputRange: [42 + cardIndex * 15, 0, -(42 + cardIndex * 15)],
                    extrapolate: "clamp",
                  });
                  const cardLift = quickScrollX.interpolate({
                    inputRange,
                    outputRange: [10 + cardIndex * 2, 0, 10 + cardIndex * 2],
                    extrapolate: "clamp",
                  });

                  return (
                    <Animated.View
                      key={item.label}
                      style={[
                        styles.quickActionShell,
                        { transform: [{ translateX: cardShift }, { translateY: cardLift }] },
                      ]}
                    >
                      <QuickAction icon={item.icon} label={item.label} hint={item.hint} onPress={() => router.push(item.href as any)} />
                    </Animated.View>
                  );
                })}
              </Animated.View>
            );
          })}
        </Animated.ScrollView>
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed, hovered }: any) => [
        styles.quickAction,
        hovered && styles.quickActionHover,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(236,202,105,0.16)", "rgba(255,255,255,0.025)", "transparent"]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quickActionGlow}
      />
      <View style={styles.quickIcon}>
        <Icon name={icon} size={22} color={colors.gold} />
      </View>
      <View style={styles.quickCopy}>
        <Text style={styles.quickLabel}>{label}</Text>
        <Text style={styles.quickHint}>{hint}</Text>
      </View>
      <Icon name="arrow-top-right" size={17} color={colors.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface, position: "relative" },
  content: {
    width: "100%",
    maxWidth: 1580,
    alignSelf: "center",
    paddingHorizontal: 36,
    paddingBottom: 38,
    gap: 20,
    zIndex: 1,
  },
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.975 }] },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },

  topBar: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  topCopy: { flex: 1, minWidth: 0 },
  salamLine: { color: c.gold, fontSize: 16, lineHeight: 21, fontWeight: "900", letterSpacing: 0.35 },
  greetingName: { color: c.onSurface, fontFamily: serifFont, fontSize: 43, lineHeight: 48, fontWeight: "700", letterSpacing: -1.1 },
  topSub: { color: c.muted, fontSize: 16, lineHeight: 23, fontWeight: "500", marginTop: 3 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
    cursor: "pointer",
  },
  profileAction: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    cursor: "pointer",
  },
  profileCopy: { minWidth: 86 },
  profileName: { color: c.onSurface, fontSize: 14.5, lineHeight: 19, fontWeight: "900" },
  profileMeta: { color: c.muted, fontSize: 11, lineHeight: 15, fontWeight: "700" },

  primaryRow: { flexDirection: "row", gap: 18, alignItems: "stretch" },
  stackRow: { flexDirection: "column" },
  hero: {
    flex: 1.7,
    minHeight: 250,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: "rgba(12,12,11,0.72)",
    overflow: "hidden",
    cursor: "pointer",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  heroGloss: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heroRightBlend: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 190,
  },
  heroTopEdge: {
    position: "absolute",
    left: 22,
    right: 22,
    top: 0,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,239,173,0.46)",
    shadowColor: "#ECCA69",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  heroMark: {
    position: "absolute",
    right: -64,
    top: -18,
    width: 390,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
    transform: [{ rotate: "10deg" }, { scale: 1.03 }],
  },
  heroMarkAura: {
    position: "absolute",
    width: 285,
    height: 180,
    borderRadius: 120,
    backgroundColor: "rgba(233,187,61,0.10)",
    shadowColor: "#F6C94C",
    shadowOpacity: 0.56,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 0 },
  },
  heroContent: { flex: 1, justifyContent: "center", paddingHorizontal: 36, paddingVertical: 30, maxWidth: 660, zIndex: 2 },
  eyebrow: { color: c.gold, fontSize: 13, lineHeight: 17, fontWeight: "900", letterSpacing: 1.45 },
  heroTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 52, lineHeight: 59, fontWeight: "700", letterSpacing: -1.1, marginTop: 9, textShadowColor: "rgba(0,0,0,0.42)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } },
  heroMeta: { color: c.muted, fontSize: 17, lineHeight: 23, fontWeight: "600", marginTop: 4 },
  heroProgressTrack: {
    width: "72%",
    maxWidth: 590,
    minWidth: 300,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(8,9,10,0.68)",
    borderWidth: 1,
    borderColor: "rgba(236,202,105,0.30)",
    overflow: "hidden",
    marginTop: 22,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  heroProgressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#E7B84D",
    shadowOpacity: 0.36,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  heroProgressFillVisible: {},
  heroProgressValueWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    backgroundColor: "transparent",
  },
  heroProgressValue: {
    color: "#1B1205",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    letterSpacing: 0.15,
    textShadowColor: "rgba(255,244,196,0.32)",
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 0 },
  },
  heroFoot: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 18 },
  readButton: {
    minWidth: 132,
    height: 44,
    borderRadius: 15,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.brandPrimary,
    borderWidth: 1,
    borderColor: "rgba(255,241,185,0.42)",
    shadowColor: c.gold,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  readButtonText: { color: c.onBrandPrimary, fontSize: 15.5, lineHeight: 20, fontWeight: "900" },

  goalCard: {
    flex: 0.82,
    minWidth: 310,
    minHeight: 250,
    paddingHorizontal: 26,
    paddingVertical: 24,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: "rgba(12,12,11,0.66)",
    overflow: "hidden",
    gap: 16,
    cursor: "pointer",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
  },
  goalTopEdge: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 0,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,239,173,0.34)",
  },
  goalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  goalTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 25, lineHeight: 30, fontWeight: "700", marginTop: 4 },
  goalCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 24,
    paddingVertical: 4,
  },
  goalRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 7,
    borderColor: c.goldBorder,
    backgroundColor: "rgba(212,175,55,0.07)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: c.gold,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  goalPercent: { color: c.onSurface, fontFamily: serifFont, fontSize: 30, lineHeight: 35, fontWeight: "800", letterSpacing: -0.6 },
  goalNumbers: { flex: 1, minWidth: 0, justifyContent: "center" },
  goalCountRow: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  goalValue: { color: c.onSurface, fontFamily: serifFont, fontSize: 38, lineHeight: 42, fontWeight: "800" },
  goalDivider: { color: c.gold, fontFamily: serifFont, fontSize: 25, lineHeight: 30, fontWeight: "700", opacity: 0.78 },
  goalTarget: { color: c.onSurface, fontFamily: serifFont, fontSize: 25, lineHeight: 30, fontWeight: "700", opacity: 0.88 },
  goalTotal: { color: c.muted, fontSize: 13.5, lineHeight: 18, fontWeight: "700", marginTop: 1 },
  goalRemainingPill: {
    alignSelf: "flex-start",
    minHeight: 28,
    marginTop: 10,
    paddingHorizontal: 11,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },
  goalRemainingText: { color: c.gold, fontSize: 11.5, lineHeight: 15, fontWeight: "900" },
  track: { height: 5, borderRadius: 4, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  trackFill: { height: 5, borderRadius: 4, backgroundColor: c.gold },

  journeyHead: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 18,
  },
  sectionTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 33, lineHeight: 39, fontWeight: "700", letterSpacing: -0.5 },
  sectionSub: { color: c.muted, fontSize: 15, lineHeight: 21, fontWeight: "500", marginTop: 3 },
  periods: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: "rgba(9,9,8,0.54)",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  period: { minWidth: 82, height: 38, paddingHorizontal: 14, borderRadius: 13, alignItems: "center", justifyContent: "center", cursor: "pointer" },
  periodActive: {
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
    shadowColor: c.gold,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  periodText: { color: c.muted, fontSize: 14, lineHeight: 18, fontWeight: "800" },
  periodTextActive: { color: c.gold },

  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  metricsCarouselViewport: { width: "100%", overflow: "hidden" },
  metricsCarouselTrack: { alignItems: "stretch" },
  metricsPage: { flexDirection: "row", flexWrap: "nowrap", gap: 14 },
  metricCardShell: { flex: 1, flexBasis: 0, minWidth: 190 },
  statCard: {
    flex: 1,
    width: "100%",
    minHeight: 146,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: "rgba(12,13,14,0.58)",
    overflow: "hidden",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  metricTopGlow: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 0,
    height: 1.5,
    borderRadius: 999,
  },
  metricAura: {
    position: "absolute",
    right: -24,
    top: -34,
    width: 118,
    height: 118,
    borderRadius: 59,
    opacity: 0.72,
    shadowOpacity: 0.34,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
  },
  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  statValue: { fontFamily: serifFont, fontSize: 35, lineHeight: 40, fontWeight: "700", letterSpacing: -0.6, marginTop: 10 },
  statLabel: { color: c.muted, fontSize: 14.5, lineHeight: 19, fontWeight: "700", marginTop: 2 },
  metricBars: { position: "absolute", right: 18, bottom: 18, width: 92, height: 68, flexDirection: "row", alignItems: "flex-end", gap: 7, opacity: 0.48 },
  metricBar: { flex: 1, minHeight: 8, borderRadius: 7 },

  lowerRow: { flexDirection: "row", gap: 18, alignItems: "stretch" },
  weekPanel: {
    flex: 1.35,
    minHeight: 242,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  quickPanel: {
    flex: 0.85,
    minWidth: 360,
    minHeight: 252,
    padding: 24,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: "rgba(10,11,12,0.56)",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    overflow: "hidden",
  },
  panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  panelTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 23, lineHeight: 28, fontWeight: "700" },
  panelSub: { color: c.muted, fontSize: 14, lineHeight: 19, fontWeight: "500", marginTop: 3 },
  streakPill: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 34, paddingHorizontal: 11, borderRadius: 12, backgroundColor: c.goldSoft, borderWidth: 1, borderColor: c.goldBorder },
  streakValue: { color: c.onSurface, fontSize: 18, lineHeight: 22, fontWeight: "900" },
  streakLabel: { color: c.muted, fontSize: 11, lineHeight: 14, fontWeight: "800" },
  weekRow: { flex: 1, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 20 },
  day: { flex: 1, alignItems: "center", minWidth: 66 },
  dayNodeRow: { width: "100%", minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  dayConnector: { flex: 1, height: 3, minWidth: 10, opacity: 0.92 },
  dayConnectorHidden: { opacity: 0 },
  dayNode: {
    width: 54,
    height: 54,
    flexShrink: 0,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  dayNodeToday: { borderWidth: 2.5 },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  dayLetter: { color: c.onSurface, fontSize: 14, lineHeight: 18, fontWeight: "900", marginTop: 9 },
  dayState: { fontSize: 11.5, lineHeight: 15, fontWeight: "900", marginTop: 2 },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  quickCarouselViewport: { flex: 1, width: "100%", overflow: "hidden", marginTop: 14 },
  quickCarouselTrack: { alignItems: "stretch" },
  quickPage: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignContent: "flex-start" },
  quickActionShell: { width: "48%", flexGrow: 1, minHeight: 80 },
  quickPager: { flexDirection: "row", alignItems: "center", gap: 8 },
  quickPagerButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: "rgba(212,175,55,0.12)",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    shadowColor: c.gold,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  quickDots: { flexDirection: "row", alignItems: "center", gap: 5 },
  quickDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.22)" },
  quickDotActive: { width: 20, backgroundColor: c.gold, shadowColor: c.gold, shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  quickAction: {
    width: "100%",
    height: "100%",
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(236,202,105,0.26)",
    backgroundColor: "rgba(27,24,18,0.68)",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    cursor: "pointer",
    overflow: "hidden",
  },
  quickActionHover: {
    transform: [{ translateY: -2 }],
    borderColor: "rgba(236,202,105,0.52)",
    backgroundColor: "rgba(38,32,21,0.76)",
    shadowColor: c.gold,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
  },
  quickActionGlow: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: c.goldBorder,
    shadowColor: c.gold,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  quickCopy: { flex: 1, minWidth: 0 },
  quickLabel: { color: c.onSurface, fontSize: 16, lineHeight: 20, fontWeight: "900", letterSpacing: 0.05 },
  quickHint: { color: c.muted, fontSize: 12.5, lineHeight: 16, fontWeight: "600", marginTop: 3 },

  syncBanner: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    cursor: "pointer",
  },
  syncDot: { width: 9, height: 9, borderRadius: 5 },
  syncCopy: { flex: 1, minWidth: 0 },
  syncTitle: { color: c.onSurface, fontSize: 15.5, lineHeight: 20, fontWeight: "800" },
  syncNote: { color: c.muted, fontSize: 13, lineHeight: 18, fontWeight: "500", marginTop: 2 },
  syncAction: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32, paddingHorizontal: 10, borderRadius: 11, backgroundColor: c.goldSoft },
  syncActionText: { color: c.gold, fontSize: 12.5, lineHeight: 16, fontWeight: "900" },
}));
