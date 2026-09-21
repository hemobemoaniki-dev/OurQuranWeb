import { Image } from "expo-image";
import { Text } from "@/src/components/AppText";
import { BrandMark } from "@/src/components/BrandMark";
import { Icon, type IconName } from "@/src/components/Icon";
import { ProfileMenu } from "@/src/components/ProfileMenu";
import { ReaderBackdrop } from "@/src/components/ReaderBackdrop";
import { StreakBadge } from "@/src/components/StreakBadge";
import { WebPageBackdrop } from "@/src/components/WebPageBackdrop";
import { useAccount, useAuth } from "@/src/context/AppState";
import { ADHKAR } from "@/src/data/adhkar";
import { NAMES_99 } from "@/src/data/names99";
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
  const compact = width < 1100;
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
  const [metricsScrollX] = useState(() => new Animated.Value(0));
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

  const latestBookmark = useMemo(() => {
    const items = [...account.appState.bookmarks];
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items[0] ?? null;
  }, [account.appState.bookmarks]);

  const latestBookmarkLabel = latestBookmark
    ? `${surahMeta(latestBookmark.surah).name} · Ayah ${latestBookmark.ayah}`
    : "No saved ayah yet";

  const morningAdhkarRemaining = useMemo(() => {
    const counts = account.adhkarProgress.date === today ? account.adhkarProgress.counts : {};
    return ADHKAR.filter((item) => item.times.includes("morning")).reduce((remaining, item) => {
      const done = counts[`morning:${item.id}`] ?? 0;
      return remaining + (done < item.count ? 1 : 0);
    }, 0);
  }, [account.adhkarProgress, today]);

  const featuredName = useMemo(() => {
    const seed = localDay.getDate() + localDay.getMonth() * 31 + localDay.getFullYear();
    return NAMES_99[seed % NAMES_99.length];
  }, [localDay]);

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
  }, [cancelMetricsMotion, metricsWidth, metricsScrollX]);

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
      {Platform.OS === "web" && !desktopWeb ? <WebPageBackdrop intensity="strong" /> : null}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + (desktopWeb ? 14 : 24) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.topCopy}>
            <Text style={styles.salamLine}>As-salamu alaykum,</Text>
            <Text style={styles.greetingName}>{greetingName}</Text>
            <Text style={styles.topSub}>Continue your Quran journey with focus and consistency.</Text>
          </View>

          {desktopWeb ? <View style={{ marginRight: 145, alignSelf: "center" }}><Text style={{ fontFamily: serifFont, fontStyle: "italic", color: colors.onSurface, fontSize: 20, lineHeight: 21 }}>{"Better\n   Muslims ─\n      A Brighter ─\n         Tomorrow"}</Text></View> : null}
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
            {desktopWeb ? <Image source={require("../../assets/images/sanctuary-hero.webp")} contentFit="cover" style={styles.fill} /> : Platform.OS === "web" ? <ReaderBackdrop id="solar-ember" /> : null}
            <LinearGradient
              pointerEvents="none"
              colors={scheme === "dark"
                ? ["rgba(208,151,38,0.28)", "rgba(15,14,12,0.34)", "rgba(8,10,10,0.58)"]
                : ["rgba(255,252,244,0.96)", "rgba(255,252,244,0.85)", "rgba(247,241,230,0.72)"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fill}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0.12)", "transparent", "rgba(236,202,105,0.08)"]}
              locations={[0, 0.42, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGlassLayer}
            />
            <View pointerEvents="none" style={styles.heroInnerEdge} />
            <View style={styles.heroMark}>
              <BrandMark size={desktopWeb ? 155 : 238} tint="#F0C94F" glow="#FFD65A" intensity="strong" finish="gold" />
              {desktopWeb ? <><Text style={{ color: "#FFE68A", fontSize: 28, fontFamily: serifFont }}>وَاقْرَأْ وَارْتَقِ</Text><Text style={{ color: "#FFE68A", fontSize: 9, letterSpacing: 3, fontWeight: "900", marginTop: 5 }}>READ AND ASCEND</Text></> : null}
            </View>
            <View style={styles.heroContent}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}><Icon name="book-open-page-variant-outline" size={25} color={colors.gold} /><Text style={styles.eyebrow}>CONTINUE READING</Text></View>
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
              colors={[colors.goldSoft, "rgba(255,255,255,0.018)", "transparent"]}
              locations={[0, 0.46, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fill}
            />
            <View pointerEvents="none" style={styles.cardInnerEdge} />
            <View style={styles.goalTop}>
              <View>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><Icon name="target" size={25} color={colors.gold} /><Text style={styles.eyebrow}>DAILY GOAL</Text></View>
                <Text style={styles.goalTitle}>{goalReached ? "Goal complete" : "Today’s target"}</Text>
              </View>
              <Icon name="pencil-outline" size={18} color={colors.gold} />
            </View>
            <View style={styles.goalCenter}>
              <View style={[styles.goalRing, desktopWeb ? { borderWidth: 0, backgroundImage: `conic-gradient(#FFDA64 ${goalPct * 360}deg, rgba(230,218,164,0.23) 0deg)` } as any : null]}>
                {desktopWeb ? <View style={{ position: "absolute", inset: 8, borderRadius: 99, backgroundColor: scheme === "dark" ? "#061015" : "#FFFCF4" } as any} /> : null}
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
          {desktopWeb && width >= 1100 ? <View accessibilityRole="image" accessibilityLabel="Discipline today, Jannah tomorrow. Mosque under a crescent moon." style={{ flex: 0.79, minWidth: 210, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#606C89" }}><Image source={require("../../assets/images/dashboard-reference.webp")} contentFit="fill" style={{ position: "absolute", width: "668.8%", height: "418.222%", left: "-492.4%", top: "-90.222%" }} /></View> : null}
        </View>

        {desktopWeb ? (
          <View style={styles.todayPanel}>
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(236,202,105,0.095)", "rgba(255,255,255,0.018)", "rgba(3,5,6,0.24)"]}
              locations={[0, 0.42, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fill}
            />
            <View pointerEvents="none" style={styles.todayInnerEdge} />
            <View style={styles.todayHead}>
              <View style={styles.todayTitleWrap}>
                <View style={styles.todayTitleIcon}><Icon name="calendar-star" size={20} color={colors.gold} /></View>
                <View>
                  <Text style={styles.todayTitle}>Today</Text>
                  <Text style={styles.todaySub}>Everything you need for a blessed day.</Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push("/read")}
                style={({ pressed, hovered }: any) => [styles.todayViewAll, hovered && styles.todayViewAllHover, pressed && styles.pressed]}
              >
                <Text style={styles.todayViewAllText}>View all</Text>
                <Icon name="arrow-right" size={16} color={colors.gold} />
              </Pressable>
            </View>

            <View style={styles.todayGrid}>
              <TodayShortcut
                icon="play"
                label="Continue listening"
                hint={`${meta.name} · Ayah ${account.currentAyah}`}
                onPress={() => router.push("/reader")}
              />
              <TodayShortcut
                icon="bookmark-outline"
                label="Latest bookmark"
                hint={latestBookmarkLabel}
                onPress={() => latestBookmark
                  ? router.push({ pathname: "/reader", params: { surah: latestBookmark.surah, ayah: latestBookmark.ayah } })
                  : router.push("/settings/bookmarks")}
              />
              <TodayShortcut
                icon="white-balance-sunny"
                label="Today’s adhkar"
                hint={morningAdhkarRemaining > 0 ? `Morning · ${morningAdhkarRemaining} left` : "Morning complete"}
                onPress={() => router.push("/adhkar")}
              />
              <TodayShortcut
                icon="star-four-points-outline"
                label="Names of Allah"
                hint={featuredName?.transliteration ?? "Explore the 99 Names"}
                onPress={() => router.push("/names")}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.journeyHead}>
          <View>
            <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}><Icon name="chart-bar" size={27} color={colors.gold} /><Text style={styles.sectionTitle}>Your journey</Text></View>
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
                <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><Icon name="target" size={26} color={colors.gold} /><Text style={styles.panelTitle}>Weekly journey</Text></View>
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
  const [quickScrollX] = useState(() => new Animated.Value(0));
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
  }, [cancelMotion, pageWidth, totalPages, quickScrollX]);

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
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><Icon name="view-grid-outline" size={26} color="#ECCA69" /><Text style={styles.panelTitle}>Quick access</Text></View>
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

function TodayShortcut({
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
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        styles.todayShortcut,
        hovered && styles.todayShortcutHover,
        pressed && styles.cardPressed,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(236,202,105,0.16)", "rgba(255,255,255,0.02)", "transparent"]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      />
      <View style={styles.todayShortcutIcon}>
        <Icon name={icon} size={21} color={colors.gold} />
      </View>
      <View style={styles.todayShortcutCopy}>
        <Text style={styles.todayShortcutLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.todayShortcutHint}>{hint}</Text>
      </View>
      <Icon name="arrow-right" size={16} color={colors.muted} />
    </Pressable>
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

const useBaseStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface, position: "relative" },
  content: {
    width: "100%",
    maxWidth: 1740,
    alignSelf: "center",
    paddingHorizontal: 28,
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
    borderColor: "rgba(236,202,105,0.34)",
    backgroundColor: "rgba(9,10,10,0.72)",
    overflow: "hidden",
    cursor: "pointer",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  heroGlassLayer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  heroInnerEdge: {
    position: "absolute",
    top: 1,
    left: 20,
    right: 20,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    opacity: 0.56,
  },
  heroMark: {
    position: "absolute",
    right: -82,
    top: -26,
    width: 410,
    height: 310,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.82,
    transform: [{ rotate: "8deg" }, { scale: 1.08 }],
  },
  heroContent: { flex: 1, justifyContent: "center", paddingHorizontal: 36, paddingVertical: 30, maxWidth: 650, zIndex: 1 },
  eyebrow: { color: c.gold, fontSize: 13, lineHeight: 17, fontWeight: "900", letterSpacing: 1.45 },
  heroTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 54, lineHeight: 60, fontWeight: "800", letterSpacing: -1.2, marginTop: 8, textShadowColor: "rgba(0,0,0,0.34)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } },
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
    minWidth: 126,
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.brandPrimary,
    shadowColor: c.gold,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
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
    borderColor: "rgba(236,202,105,0.30)",
    backgroundColor: "rgba(10,11,11,0.64)",
    overflow: "hidden",
    gap: 16,
    cursor: "pointer",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 9 },
  },
  cardInnerEdge: {
    position: "absolute",
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.20)",
    opacity: 0.55,
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

  todayPanel: {
    minHeight: 142,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(236,202,105,0.28)",
    backgroundColor: "rgba(7,9,10,0.62)",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    overflow: "hidden",
  },
  todayInnerEdge: {
    position: "absolute",
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    opacity: 0.7,
  },
  todayHead: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 12,
  },
  todayTitleWrap: { flexDirection: "row", alignItems: "center", gap: 11 },
  todayTitleIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },
  todayTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 22, lineHeight: 27, fontWeight: "800" },
  todaySub: { color: c.muted, fontSize: 11.5, lineHeight: 15, fontWeight: "600", marginTop: 1 },
  todayViewAll: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "transparent",
    cursor: "pointer",
  },
  todayViewAllHover: { backgroundColor: c.goldSoft, borderColor: c.goldBorder },
  todayViewAllText: { color: c.onSurface, fontSize: 12.5, lineHeight: 16, fontWeight: "800" },
  todayGrid: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  todayShortcut: {
    flex: 1,
    minWidth: 0,
    minHeight: 66,
    paddingHorizontal: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(236,202,105,0.24)",
    backgroundColor: "rgba(14,16,17,0.70)",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    cursor: "pointer",
  },
  todayShortcutHover: {
    transform: [{ translateY: -2 }],
    borderColor: "rgba(236,202,105,0.50)",
    backgroundColor: "rgba(24,23,19,0.78)",
    shadowColor: c.gold,
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  todayShortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: c.goldBorder,
  },
  todayShortcutCopy: { flex: 1, minWidth: 0 },
  todayShortcutLabel: { color: c.onSurface, fontSize: 14.5, lineHeight: 18, fontWeight: "900" },
  todayShortcutHint: { color: c.muted, fontSize: 11.5, lineHeight: 15, fontWeight: "600", marginTop: 2 },

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


// Match the supplied desktop composition while retaining the existing account,
// reading, goals, shortcuts and local-day progress behavior.
function useStyles() {
  const base = useBaseStyles();
  const { width } = useWindowDimensions();
  const { scheme } = useTheme();
  if (Platform.OS !== "web" || width < 900) return base;
  const panel = scheme === "dark" ? "rgba(4,12,15,0.78)" : "rgba(255,252,244,0.92)";
  const overrides: Record<string, object> = {
    root: { backgroundColor: "transparent" },
    content: { maxWidth: 1340, paddingHorizontal: 24, gap: 12, paddingBottom: 24 },
    topBar: { minHeight: 106 },
    salamLine: { fontSize: 19, lineHeight: 24 },
    greetingName: { fontSize: 54, lineHeight: 56 },
    topSub: { marginTop: 0, lineHeight: 22 },
    primaryRow: { gap: 16 },
    hero: { flex: 2.2, minHeight: 226, borderRadius: 16, borderColor: "rgba(255,213,99,0.78)" },
    heroContent: { paddingHorizontal: 20, paddingVertical: 18, maxWidth: "66%" },
    heroMark: { right: 10, top: 8, width: 220, height: 212, opacity: 1, transform: [] },
    heroTitle: { fontSize: 40, lineHeight: 44, marginTop: 3, marginLeft: 49 },
    heroMeta: { fontSize: 16, lineHeight: 21, marginTop: 0, marginLeft: 49 },
    heroProgressTrack: { marginTop: 12, marginLeft: 49, width: "90%", minWidth: 190, height: 25 },
    heroFoot: { marginLeft: 49, marginTop: 14 },
    readButton: { height: 46, minWidth: 138, backgroundColor: "#FFD64E", shadowOpacity: 0.55, shadowRadius: 18 },
    goalCard: { flex: 1, minWidth: 274, minHeight: 226, paddingHorizontal: 20, paddingVertical: 18, borderRadius: 16, gap: 12, backgroundColor: panel },
    goalTitle: { fontFamily: undefined, fontSize: 16, lineHeight: 21, fontWeight: "500" },
    goalCenter: { gap: 20, paddingVertical: 0 },
    goalRing: { width: 108, height: 108, borderRadius: 54 },
    goalValue: { fontSize: 34, lineHeight: 38 },
    goalRemainingPill: { marginTop: 8 },
    todayPanel: { padding: 14, borderRadius: 17, backgroundColor: panel },
    todayHead: { marginBottom: 10 },
    todayTitleWrap: { gap: 12 },
    todayTitleIcon: { width: 30, height: 30, borderWidth: 0, backgroundColor: "transparent" },
    todayTitle: { fontSize: 25, lineHeight: 28 },
    todaySub: { fontSize: 12, lineHeight: 15 },
    todayGrid: { gap: 22 },
    todayShortcut: { minHeight: 66, borderRadius: 13, backgroundColor: panel },
    todayShortcutHint: { fontSize: 13, lineHeight: 17 },
    todayShortcutIcon: { width: 46, height: 46, borderRadius: 13 },
    sectionTitle: { fontSize: 25, lineHeight: 28 },
    sectionSub: { fontSize: 12, lineHeight: 16, marginTop: 1 },
    journeyHead: { marginTop: 0 },
    periods: { padding: 3, borderRadius: 18 },
    period: { height: 28, minWidth: 85 },
    periodActive: { backgroundColor: "rgba(245,196,49,0.32)", borderColor: "#F3D15C" },
    metricsPage: { gap: 22 },
    metricCardShell: { minWidth: 0 },
    statCard: { minHeight: 108, padding: 12, paddingHorizontal: 16, borderRadius: 15, backgroundColor: panel },
    metricIcon: { width: 34, height: 34, borderRadius: 11 },
    statValue: { fontSize: 32, lineHeight: 34, marginTop: 3 },
    statLabel: { fontSize: 14, lineHeight: 18, marginTop: 0 },
    metricBars: { width: 82, height: 55, right: 19, bottom: 11, gap: 7 },
    lowerRow: { gap: 16 },
    weekPanel: { flex: 1.5, minHeight: 176, padding: 16, borderRadius: 18, borderColor: "rgba(236,202,105,0.46)", backgroundColor: panel },
    quickPanel: { flex: 1, minWidth: 420, minHeight: 176, padding: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: panel },
    panelTitle: { fontSize: 23, lineHeight: 27 },
    panelSub: { fontSize: 12, lineHeight: 16, marginTop: 0 },
    streakValue: { fontSize: 14, lineHeight: 18 },
    streakLabel: { fontSize: 13, lineHeight: 18 },
    weekRow: { marginTop: 12 },
    day: { minWidth: 0 },
    dayNodeRow: { minHeight: 44 },
    dayNode: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5 },
    dayLetter: { fontSize: 13, lineHeight: 17, marginTop: 5 },
    quickCarouselViewport: { marginTop: 7 },
    quickPage: { gap: 6 },
    quickActionShell: { minHeight: 53 },
    quickAction: { minHeight: 53, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, gap: 12, backgroundColor: panel },
    quickIcon: { width: 40, height: 40, borderRadius: 11 },
    quickLabel: { fontSize: 14, lineHeight: 17 },
    quickHint: { fontSize: 12, lineHeight: 16, marginTop: 1 },
    syncBanner: { minHeight: 52, backgroundColor: panel },
  };
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, overrides[key] ? [value, overrides[key]] : value])) as typeof base;
}
