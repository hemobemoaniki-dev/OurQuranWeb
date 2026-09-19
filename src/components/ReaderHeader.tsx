import { Text } from "@/src/components/AppText";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/src/components/Icon";
import { useAccount } from "@/src/context/AppState";
import { useSession } from "@/src/context/SessionContext";
import { formatClock, formatK, todayValue } from "@/src/lib/dates";
import type { ReaderTheme } from "@/src/lib/reader-themes";
import { serifFont } from "@/src/typography";

export const ReaderHeader = memo(function ReaderHeader({
  theme: t,
  onBack,
  onOpenSettings,
}: {
  theme: ReaderTheme;
  onBack: () => void;
  onOpenSettings: () => void;
}) {
  const { account } = useAccount();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 10 }]}>
      <View style={{ paddingVertical: 2 }}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave reader"
            onPress={onBack}
            testID="reader-leave"
            style={({ pressed }) => [
              styles.circleButton,
              {
                borderColor: t.accent + "66",
                backgroundColor: "rgba(5,6,10,0.78)",
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Icon name="arrow-left" color="#FFFFFF" size={23} />
          </Pressable>

          <View style={styles.brand}>
            <Icon name="mosque" color={t.accent} size={25} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              maxFontSizeMultiplier={1.1}
              style={styles.brandText}
            >
              OurQuran
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open reader settings"
            onPress={onOpenSettings}
            testID="reader-quick-settings-open"
            style={({ pressed }) => [
              styles.circleButton,
              {
                borderColor: t.border + "99",
                backgroundColor: t.glass,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Icon name="menu" color="#FFFFFF" size={27} />
          </Pressable>
        </View>

        <Text maxFontSizeMultiplier={1.15} style={styles.tagline}>
          Read and Ascend
        </Text>
      </View>

      <View style={[styles.metrics, { backgroundColor: "rgba(5,6,10,0.82)", borderColor: t.accent + "55" }]}>
        <Metric
          theme={t}
          icon="heart"
          value={formatK(todayValue(account.history, "hasanaat"))}
          label="Hasanaat"
        />
        <View style={[styles.metricDivider, { backgroundColor: t.border }]} />
        <Metric
          theme={t}
          icon="book-open-page-variant"
          value={String(todayValue(account.history, "ayat"))}
          label="Aya"
        />
        <View style={[styles.metricDivider, { backgroundColor: t.border }]} />
        <SessionMetric theme={t} />
      </View>
    </View>
  );
});

function SessionMetric({ theme }: { theme: ReaderTheme }) {
  const { seconds } = useSession();
  return <Metric theme={theme} icon="fire" value={formatClock(seconds)} label="Session" />;
}

function Metric({
  theme,
  icon,
  value,
  label,
}: {
  theme: ReaderTheme;
  icon: IconName;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricValueRow}>
        <Icon name={icon} size={18} color={theme.accent} />
        <Text
          maxFontSizeMultiplier={1.05}
          adjustsFontSizeToFit
          numberOfLines={1}
          minimumFontScale={0.72}
          style={styles.metricValue}
        >
          {value}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  topRow: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  brandText: {
    color: "#FFFFFF",
    fontFamily: serifFont,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.4,
    flexShrink: 1,
    paddingRight: 3,
  },
  tagline: {
    width: "100%",
    textAlign: "center",
    color: "#ECE8F0",
    fontSize: 10,
    lineHeight: 17,
    letterSpacing: 1.8,
    paddingHorizontal: 8,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 70,
    paddingHorizontal: 4,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 3,
  },
  metricValueRow: {
    width: "100%",
    minHeight: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  metricLabel: {
    width: "100%",
    color: "#E5E2E8",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    letterSpacing: 0.55,
    textAlign: "center",
  },
  metricDivider: {
    width: 1,
    marginVertical: 5,
  },
});
