import { Text } from "@/src/components/AppText";
import { Icon } from "@/src/components/Icon";
import { playCrownTriumph } from "@/src/lib/streak-crown";
import { makeStyles, useTheme } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export const StreakBadge = memo(function StreakBadge({
  streak,
  crownActive,
  celebrateToken,
  onPressProgress,
}: {
  streak: number;
  crownActive: boolean;
  celebrateToken: number;
  onPressProgress: () => void;
}) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();

  const crownScale = useSharedValue(crownActive ? 1 : 0);
  const crownY = useSharedValue(crownActive ? 0 : -26);
  const crownRotate = useSharedValue(0);
  const glow = useSharedValue(0);
  const badgeScale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(crownScale);
    cancelAnimation(crownY);
    cancelAnimation(crownRotate);
    cancelAnimation(glow);
    cancelAnimation(badgeScale);

    if (!crownActive) {
      crownScale.value = withTiming(0, { duration: 130 });
      crownY.value = -20;
      crownRotate.value = 0;
      glow.value = withTiming(0, { duration: 120 });
      badgeScale.value = withSpring(1, { damping: 18, stiffness: 250 });
      return;
    }

    if (celebrateToken <= 0) {
      crownScale.value = withSpring(1, { damping: 15, stiffness: 250 });
      crownY.value = withSpring(0, { damping: 16, stiffness: 250 });
      return;
    }

    crownScale.value = 0.2;
    crownY.value = -34;
    crownRotate.value = -16;
    glow.value = 0;
    badgeScale.value = 0.96;

    crownY.value = withSequence(
      withSpring(5, { damping: 8, stiffness: 260, mass: 0.7 }),
      withSpring(0, { damping: 15, stiffness: 250, mass: 0.7 }),
    );
    crownScale.value = withSequence(
      withSpring(1.42, { damping: 8, stiffness: 300, mass: 0.62 }),
      withSpring(0.94, { damping: 9, stiffness: 300, mass: 0.62 }),
      withSpring(1, { damping: 16, stiffness: 250 }),
    );
    crownRotate.value = withSequence(
      withSpring(12, { damping: 8, stiffness: 280 }),
      withSpring(-5, { damping: 9, stiffness: 280 }),
      withSpring(0, { damping: 15, stiffness: 250 }),
    );
    badgeScale.value = withSequence(
      withSpring(1.045, { damping: 10, stiffness: 250 }),
      withSpring(1, { damping: 16, stiffness: 220 }),
    );
    glow.value = withSequence(
      withTiming(1, { duration: 150 }),
      withRepeat(
        withSequence(withTiming(0.35, { duration: 190 }), withTiming(1, { duration: 190 })),
        2,
        true,
      ),
      withDelay(120, withTiming(0, { duration: 520 })),
    );

    void playCrownTriumph();
  }, [badgeScale, celebrateToken, crownActive, crownRotate, crownScale, crownY, glow]);

  const crownStyle = useAnimatedStyle(() => ({
    opacity: crownActive ? Math.max(0.15, crownScale.value) : 0,
    transform: [
      { translateY: crownY.value },
      { rotate: crownRotate.value + "deg" },
      { scale: crownScale.value },
    ],
  }));

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 1 + glow.value * 0.035 }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.6 + glow.value * 0.75 }],
  }));

  const shellBorder = scheme === "dark" ? "#A47B2C" : "#B98522";
  const progressBg: [string, string] = scheme === "dark" ? ["#171512", "#0D0D0C"] : ["#FFFDF8", "#F4EBD9"];
  const streakBg: [string, string] = crownActive
    ? (scheme === "dark" ? ["#3B2C12", "#17120A"] : ["#FFE4A3", "#F4BF5E"])
    : (scheme === "dark" ? ["#332114", "#17110D"] : ["#FFE9CC", "#F6CAA0"]);
  const numberColor = crownActive
    ? (scheme === "dark" ? "#FFD978" : "#6E4300")
    : (scheme === "dark" ? "#FFAD5B" : "#8A4A13");

  return (
    <Animated.View style={[styles.badge, shellStyle]} testID="home-streak-badge">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { borderColor: colors.gold, shadowColor: colors.gold },
          glowStyle,
        ]}
      />

      <View style={[styles.shell, { borderColor: shellBorder }]}>
        <Pressable
          onPress={onPressProgress}
          accessibilityRole="button"
          accessibilityLabel="Open progress metrics"
          testID="streak-progress-button"
          hitSlop={5}
          style={({ pressed }) => [styles.progressSide, { opacity: pressed ? 0.64 : 1 }]}
        >
          <LinearGradient pointerEvents="none" colors={progressBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
          <View
            style={[
              styles.progressGlyph,
              {
                borderColor: scheme === "dark" ? "#B08B45" : "#C79B42",
                backgroundColor: scheme === "dark" ? "#D4AF3718" : "#FFFFFFA8",
              },
            ]}
          >
            <Icon name="chart-box-outline" size={25} color={scheme === "dark" ? "#F7E8B0" : "#5C4211"} />
          </View>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: shellBorder }]} />

        <View
          style={styles.streakSide}
          accessible
          accessibilityLabel={crownActive ? `${streak} day crowned streak.` : `${streak} day reading streak.`}
        >
          <LinearGradient pointerEvents="none" colors={streakBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />

          <View style={styles.crownStage}>
            {crownActive ? (
              <>
                <Animated.View pointerEvents="none" style={[styles.sparkle, styles.sparkleA, sparkleStyle]}>
                  <Icon name="star-four-points" size={10} color="#FFE599" />
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.sparkle, styles.sparkleB, sparkleStyle]}>
                  <Icon name="star-four-points" size={8} color="#FFF0B8" />
                </Animated.View>
                <Animated.View
                  testID="streak-crown"
                  style={[
                    styles.crownGlyph,
                    {
                      borderColor: "#E6B94B",
                      backgroundColor: scheme === "dark" ? "#5B4014" : "#FFF1BA",
                      shadowColor: "#E6B94B",
                    },
                    crownStyle,
                  ]}
                >
                  <Icon name="crown" size={27} color={scheme === "dark" ? "#FFD86A" : "#9B6700"} />
                </Animated.View>
              </>
            ) : (
              <LinearGradient colors={["#FFAD4D", "#EF6D2E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fireGlyph}>
                <Icon name="fire" size={25} color="#FFF8EC" />
              </LinearGradient>
            )}
          </View>

          <Text
            style={[styles.streakValue, { color: numberColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {streak}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

const useStyles = makeStyles(() => ({
  badge: {
    position: "relative",
    width: 160,
    height: 64,
  },
  shell: {
    flex: 1,
    borderRadius: 21,
    borderWidth: 2,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  glow: {
    position: "absolute",
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderRadius: 25,
    borderWidth: 2,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 9,
  },
  progressSide: {
    width: 62,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  progressGlyph: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    width: 2,
  },
  streakSide: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 9,
    overflow: "hidden",
  },
  crownStage: {
    width: 42,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  fireGlyph: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#FFBE73",
    alignItems: "center",
    justifyContent: "center",
  },
  crownGlyph: {
    width: 41,
    height: 41,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.42,
    shadowRadius: 8,
    elevation: 7,
  },
  sparkle: {
    position: "absolute",
    zIndex: 3,
  },
  sparkleA: {
    top: -2,
    right: -2,
  },
  sparkleB: {
    left: -1,
    bottom: 1,
  },
  streakValue: {
    minWidth: 30,
    textAlign: "center",
    fontSize: 31,
    lineHeight: 35,
    fontWeight: "900",
    letterSpacing: -1.1,
    fontVariant: ["tabular-nums"],
  },
}));
