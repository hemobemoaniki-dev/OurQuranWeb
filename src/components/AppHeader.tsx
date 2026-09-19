import { Text } from "@/src/components/AppText";
import { memo } from "react";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLockup } from "@/src/components/BrandLockup";
import { Icon } from "@/src/components/Icon";
import { useAccount } from "@/src/context/AppState";
import { useSession } from "@/src/context/SessionContext";
import { formatClock, formatK, todayValue } from "@/src/lib/dates";
import { makeStyles, useTheme } from "@/src/theme";

// Global compact header used on every main screen: OurQuran logo + live metric
// capsule (Hasanaat / Ayat / Session). Settings lives in the bottom dock.
export const AppHeader = memo(function AppHeader({ showBack = false }: { showBack?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account } = useAccount();

  const hasanaat = todayValue(account.history, "hasanaat");
  const ayat = todayValue(account.history, "ayat");

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]} testID="app-header">
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.sideBtn}
            testID="header-back-button"
          >
            <Icon name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
        ) : (
          <View style={styles.sideBtn} />
        )}

        <View style={styles.logoWrap}>
          <BrandLockup tint={colors.gold} size={46} />
        </View>

        <View style={styles.sideBtn} />
      </View>

      <View style={styles.capsule} testID="metric-capsule">
        <Metric icon="heart" value={formatK(hasanaat)} label="Hasanaat" />
        <View style={styles.capsuleDivider} />
        <Metric icon="book-open-page-variant" value={String(ayat)} label="Ayat" />
        <View style={styles.capsuleDivider} />
        <SessionMetric />
      </View>
    </View>
  );
});

function SessionMetric() {
  const { seconds } = useSession();
  return <Metric icon="fire" value={formatClock(seconds)} label="Session" />;
}

function Metric({ icon, value, label }: { icon: any; value: string; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <Icon name={icon} size={18} color={colors.gold} />
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    width: "100%",
    maxWidth: 1580,
    alignSelf: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 34,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  capsule: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  capsuleDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  metricValue: {
    color: colors.onSurface,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
}));
