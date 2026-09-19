import { Text } from "@/src/components/AppText";
import { ScrollView, View } from "react-native";

import { Icon, type IconName } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { useAccount } from "@/src/context/AppState";
import { computeStreak, formatK, hasReadingActivity, weekDays } from "@/src/lib/dates";
import { makeStyles, useTheme } from "@/src/theme";

export default function ProgressScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { account } = useAccount();

  const readingDays = Object.values(account.history).filter(hasReadingActivity).length;
  const streak = computeStreak(account.history);
  const days = weekDays();
  const maxHas = Math.max(1, ...days.map((d) => account.history[d.key]?.hasanaat ?? 0));

  const stats: { icon: IconName; value: string; label: string }[] = [
    { icon: "heart", value: formatK(account.totalHasanaat), label: "Total Hasanaat" },
    { icon: "book-open-page-variant", value: String(account.completedReads), label: "Ayat read" },
    { icon: "calendar-check", value: String(readingDays), label: "Reading days" },
    { icon: "fire", value: `${streak}`, label: "Current streak" },
  ];

  return (
    <View style={styles.root}>
      <SubHeader title="Your Progress" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {stats.map((st) => (
            <View key={st.label} style={styles.statCard}>
              <Icon name={st.icon} size={22} color={colors.gold} />
              <Text style={styles.statValue}>{st.value}</Text>
              <Text style={styles.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week&apos;s Hasanaat</Text>
          <View style={styles.chart}>
            {days.map((d) => {
              const val = account.history[d.key]?.hasanaat ?? 0;
              const h = Math.max(4, (val / maxHas) * 120);
              return (
                <View key={d.key} style={styles.barCol}>
                  <View style={[styles.bar, { height: h, backgroundColor: val > 0 ? colors.brandPrimary : colors.surfaceTertiary }]} />
                  <Text style={styles.barLabel}>{d.label[0]}</Text>
                </View>
              );
            })}
          </View>
        </View>


      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    width: "47.5%",
    flexGrow: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  statValue: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  statLabel: { color: colors.muted, fontSize: 13 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  cardTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 140 },
  barCol: { alignItems: "center", gap: 8, flex: 1 },
  bar: { width: 18, borderRadius: 6 },
  barLabel: { color: colors.muted, fontSize: 11 },
  syncRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  syncStatus: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  syncMeta: { color: colors.muted, fontSize: 13 },
}));
