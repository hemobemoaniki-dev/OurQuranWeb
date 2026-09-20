import { Text } from "@/src/components/AppText";
import { BrandMark } from "@/src/components/BrandMark";
import { Icon, type IconName } from "@/src/components/Icon";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
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
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
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
  const goal = Math.max(1, account.settings.dailyGoal);
  const goalPct = Math.min(1, todayAyat / goal);
  const goalReached = todayAyat >= goal;
  const meta = surahMeta(account.currentSurah);
  const readingPct = Math.max(0, Math.min(1, account.currentAyah / Math.max(1, meta.ayahs)));

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
            <Pressable
              onPress={() => router.push(user ? "/settings/profile" : "/auth")}
              accessibilityRole="button"
              accessibilityLabel={user ? "Open profile" : "Sign in"}
              style={({ pressed }) => [styles.profileAction, pressed && styles.pressed]}
            >
              <ProfileAvatar value={user ? account.photoURL : undefined} size={38} />
              <View style={styles.profileCopy}>
                <Text style={styles.profileName}>{user ? account.username || "Reader" : "Guest"}</Text>
                <Text style={styles.profileMeta}>{user ? "Account" : "Sign in to save"}</Text>
              </View>
              <Icon name="chevron-down" size={17} color={colors.muted} />
            </Pressable>
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
                ? ["rgba(212,175,55,0.24)", "rgba(255,255,255,0.035)", "rgba(0,0,0,0.12)"]
                : ["rgba(212,175,55,0.20)", "rgba(255,255,255,0.88)", "rgba(255,252,244,0.98)"]}
              locations={[0, 0.58, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fill}
            />
            <View style={styles.heroMark}>
              <BrandMark size={148} tint={colors.gold} glow={colors.gold} intensity="strong" />
            </View>
            <View style={styles.heroContent}>
              <Text style={styles.eyebrow}>CONTINUE READING</Text>
              <Text style={styles.heroTitle}>{meta.name}</Text>
              <Text style={styles.heroMeta}>Ayah {account.currentAyah} of {meta.ayahs}</Text>
              <View style={styles.heroProgressTrack}>
                <View style={[styles.heroProgressFill, { width: `${readingPct * 100}%` }]} />
              </View>
              <View style={styles.heroFoot}>
                <Text style={styles.heroProgressText}>{Math.round(readingPct * 100)}% through this surah</Text>
                <View style={styles.readButton}>
                  <Text style={styles.readButtonText}>Read now</Text>
                  <Icon name="arrow-right" size={18} color={colors.onBrandPrimary} />
                </View>
              </View>
            </View>
            {desktopWeb ? <Text style={styles.heroQuote}>“A light for every step forward.”</Text> : null}
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
              colors={[colors.goldSoft, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fill}
            />
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
                <Text style={styles.goalRingLabel}>complete</Text>
              </View>
              <View style={styles.goalNumbers}>
                <Text style={styles.goalValue}>{todayAyat}</Text>
                <Text style={styles.goalTotal}>of {goal} ayahs</Text>
                <Text style={styles.goalHelper}>
                  {goalReached ? "Alhamdulillah — keep going." : `${Math.max(0, goal - todayAyat)} remaining today`}
                </Text>
              </View>
              {desktopWeb ? <Text style={styles.goalQuote}>“Small steps lead to great heights.”</Text> : null}
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
                onPress={() => setPeriod(item.key)}
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

        <View style={styles.metricsRow} testID="hasanaat-tracker">
          <JourneyMetric label="Hasanaat" value={formatK(stats.hasanaat)} icon="heart" tint={palette[0]} />
          <JourneyMetric label="Ayahs read" value={formatK(stats.ayat)} icon="book-open-page-variant" tint={palette[1]} />
          <JourneyMetric label="Reading time" value={readingDuration(stats.seconds)} icon="clock-outline" tint={palette[2]} />
          <JourneyMetric label="Reading days" value={String(stats.days)} icon="calendar-check-outline" tint={palette[3]} />
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
    <View style={[styles.statCard, { borderColor: `${tint}42` }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${tint}14`, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      />
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
  const [page, setPage] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const totalPages = Math.ceil(QUICK_ACCESS_ITEMS.length / 4);

  const goTo = useCallback((nextPage: number, animated = true) => {
    const normalized = (nextPage + totalPages) % totalPages;
    setPage(normalized);
    if (pageWidth > 0) ref.current?.scrollTo({ x: normalized * pageWidth, animated });
  }, [pageWidth, totalPages]);

  useEffect(() => {
    if (!pageWidth) return;
    const timer = setInterval(() => goTo(page + 1), 5600);
    return () => clearInterval(timer);
  }, [goTo, page, pageWidth]);

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
        onLayout={(event) => setPageWidth(Math.round(event.nativeEvent.layout.width))}
      >
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            if (!pageWidth) return;
            setPage(Math.max(0, Math.min(totalPages - 1, Math.round(event.nativeEvent.contentOffset.x / pageWidth))));
          }}
          contentContainerStyle={styles.quickCarouselTrack}
        >
          {pages.map((items, pageIndex) => (
            <View key={pageIndex} style={[styles.quickPage, pageWidth ? { width: pageWidth } : null]}>
              {items.map((item) => (
                <QuickAction key={item.label} icon={item.icon} label={item.label} hint={item.hint} onPress={() => router.push(item.href as any)} />
              ))}
            </View>
          ))}
        </ScrollView>
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
    <Pressable style={({ pressed }) => [styles.quickAction, pressed && styles.cardPressed]} onPress={onPress}>
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.surfaceSecondary,
    overflow: "hidden",
    cursor: "pointer",
  },
  heroMark: {
    position: "absolute",
    right: 28,
    top: 28,
    opacity: 0.26,
    transform: [{ rotate: "-4deg" }],
  },
  heroContent: { flex: 1, justifyContent: "center", paddingHorizontal: 34, paddingVertical: 30, maxWidth: 760, zIndex: 1 },
  eyebrow: { color: c.gold, fontSize: 13, lineHeight: 17, fontWeight: "900", letterSpacing: 1.45 },
  heroTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 52, lineHeight: 59, fontWeight: "700", letterSpacing: -1.1, marginTop: 9 },
  heroMeta: { color: c.muted, fontSize: 17, lineHeight: 23, fontWeight: "600", marginTop: 4 },
  heroProgressTrack: { width: "68%", maxWidth: 520, height: 5, borderRadius: 4, backgroundColor: c.surfaceTertiary, overflow: "hidden", marginTop: 22 },
  heroProgressFill: { height: 5, borderRadius: 4, backgroundColor: c.gold },
  heroFoot: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 18 },
  heroProgressText: { color: c.muted, fontSize: 15, lineHeight: 20, fontWeight: "600" },
  heroQuote: { position: "absolute", right: 28, bottom: 31, maxWidth: 190, color: c.onSurface, fontFamily: serifFont, fontStyle: "italic", fontSize: 16, lineHeight: 23, textAlign: "right", opacity: 0.82 },
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
    padding: 25,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.surfaceSecondary,
    overflow: "hidden",
    gap: 14,
    cursor: "pointer",
  },
  goalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  goalTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 25, lineHeight: 31, fontWeight: "700", marginTop: 6 },
  goalCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 20 },
  goalRing: {
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 7,
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  goalPercent: { color: c.onSurface, fontFamily: serifFont, fontSize: 31, lineHeight: 36, fontWeight: "700", letterSpacing: -0.7 },
  goalRingLabel: { color: c.muted, fontSize: 11.5, lineHeight: 15, fontWeight: "700" },
  goalNumbers: { flex: 1, minWidth: 0 },
  goalValue: { color: c.onSurface, fontFamily: serifFont, fontSize: 39, lineHeight: 44, fontWeight: "700" },
  goalTotal: { color: c.muted, fontSize: 15.5, lineHeight: 20, fontWeight: "700" },
  goalHelper: { color: c.muted, fontSize: 13.5, lineHeight: 18, fontWeight: "500", marginTop: 7 },
  goalQuote: { flex: 1, maxWidth: 150, color: c.onSurface, fontFamily: serifFont, fontStyle: "italic", fontSize: 14.5, lineHeight: 21, textAlign: "center", opacity: 0.8 },
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
    gap: 4,
    padding: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  period: { minWidth: 76, height: 34, paddingHorizontal: 12, borderRadius: 11, alignItems: "center", justifyContent: "center", cursor: "pointer" },
  periodActive: { backgroundColor: c.goldSoft, borderWidth: 1, borderColor: c.goldBorder },
  periodText: { color: c.muted, fontSize: 14, lineHeight: 18, fontWeight: "800" },
  periodTextActive: { color: c.gold },

  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  statCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 190,
    minHeight: 138,
    padding: 19,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: c.surfaceSecondary,
    overflow: "hidden",
  },
  metricIcon: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statValue: { fontFamily: serifFont, fontSize: 35, lineHeight: 40, fontWeight: "700", letterSpacing: -0.6, marginTop: 10 },
  statLabel: { color: c.muted, fontSize: 14.5, lineHeight: 19, fontWeight: "700", marginTop: 2 },
  metricBars: { position: "absolute", right: 18, bottom: 18, width: 92, height: 68, flexDirection: "row", alignItems: "flex-end", gap: 7, opacity: 0.32 },
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
    minHeight: 242,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
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
  quickPager: { flexDirection: "row", alignItems: "center", gap: 8 },
  quickPagerButton: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, borderColor: c.goldBorder, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center", cursor: "pointer" },
  quickDots: { flexDirection: "row", alignItems: "center", gap: 5 },
  quickDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.borderStrong },
  quickDotActive: { width: 16, backgroundColor: c.gold },
  quickAction: {
    width: "48%",
    flexGrow: 1,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.goldSoft,
    shadowColor: c.gold,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    cursor: "pointer",
  },
  quickIcon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.goldSoft, borderWidth: 1, borderColor: c.goldBorder },
  quickCopy: { flex: 1, minWidth: 0 },
  quickLabel: { color: c.onSurface, fontSize: 15.5, lineHeight: 20, fontWeight: "800" },
  quickHint: { color: c.muted, fontSize: 12.5, lineHeight: 16, fontWeight: "500", marginTop: 2 },

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
