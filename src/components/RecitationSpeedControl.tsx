import { Text } from "@/src/components/AppText";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export const RECITATION_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type RecitationSpeed = (typeof RECITATION_SPEEDS)[number];

type SpeedColors = {
  accent: string;
  text: string;
  muted: string;
  surface: string;
  border: string;
  rail: string;
};

const THUMB_SIZE = 30;
const SNAP_MS = 55;

function closestSpeedIndex(value: number) {
  let best = 0;
  for (let i = 1; i < RECITATION_SPEEDS.length; i += 1) {
    if (Math.abs(RECITATION_SPEEDS[i] - value) < Math.abs(RECITATION_SPEEDS[best] - value)) best = i;
  }
  return best;
}

function formatSpeed(speed: number) {
  return (Number.isInteger(speed) ? speed.toFixed(0) : speed.toFixed(2).replace(/0$/, "")) + "×";
}

function indexForX(x: number, width: number) {
  "worklet";
  return Math.max(
    0,
    Math.min(
      RECITATION_SPEEDS.length - 1,
      Math.round((x / Math.max(1, width)) * (RECITATION_SPEEDS.length - 1)),
    ),
  );
}

/**
 * Shared speed control for Reader quick settings and Settings.
 *
 * Drag/tap motion stays on the UI thread. Account persistence happens once on
 * release, so moving the thumb never waits on React, storage, audio or sync.
 */
export const RecitationSpeedControl = memo(function RecitationSpeedControl({
  value,
  onChange,
  colors,
  testID = "recitation-speed",
}: {
  value: number;
  onChange: (speed: RecitationSpeed) => void;
  colors: SpeedColors;
  testID?: string;
}) {
  const initialIndex = closestSpeedIndex(value);
  const [displayIndex, setDisplayIndex] = useState(initialIndex);
  const displayIndexRef = useRef(initialIndex);

  const trackWidth = useSharedValue(1);
  const thumbX = useSharedValue(0);
  const liveIndex = useSharedValue(initialIndex);

  const updateDisplayIndex = useCallback((index: number) => {
    if (displayIndexRef.current === index) return;
    displayIndexRef.current = index;
    setDisplayIndex(index);
  }, []);

  const commitIndex = useCallback((index: number) => {
    const next = RECITATION_SPEEDS[index];
    updateDisplayIndex(index);
    onChange(next);
  }, [onChange, updateDisplayIndex]);

  const setTrackPosition = useCallback((event: LayoutChangeEvent) => {
    const width = Math.max(1, event.nativeEvent.layout.width);
    const index = closestSpeedIndex(value);
    trackWidth.value = width;
    liveIndex.value = index;
    thumbX.value = (index / (RECITATION_SPEEDS.length - 1)) * width;
  }, [liveIndex, thumbX, trackWidth, value]);

  useEffect(() => {
    const index = closestSpeedIndex(value);
    displayIndexRef.current = index;
    setDisplayIndex(index);
    liveIndex.value = index;
    const destination = (index / (RECITATION_SPEEDS.length - 1)) * trackWidth.value;
    thumbX.value = withTiming(destination, { duration: SNAP_MS });
  }, [liveIndex, thumbX, trackWidth, value]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .failOffsetY([-20, 20])
        .hitSlop({ top: 12, bottom: 12, left: 0, right: 0 })
        .onBegin((event) => {
          const width = Math.max(1, trackWidth.value);
          const x = Math.max(0, Math.min(width, event.x - THUMB_SIZE / 2));
          thumbX.value = x;
          liveIndex.value = indexForX(x, width);
        })
        .onUpdate((event) => {
          const width = Math.max(1, trackWidth.value);
          const x = Math.max(0, Math.min(width, event.x - THUMB_SIZE / 2));
          thumbX.value = x;
          liveIndex.value = indexForX(x, width);
        })
        .onEnd(() => {
          const width = Math.max(1, trackWidth.value);
          const index = liveIndex.value;
          thumbX.value = withTiming(
            (index / (RECITATION_SPEEDS.length - 1)) * width,
            { duration: SNAP_MS },
          );
          // One JS/React update after the finger is released. No React renders
          // are performed while the thumb is moving.
          runOnJS(commitIndex)(index);
        }),
    [commitIndex, liveIndex, thumbX, trackWidth, updateDisplayIndex],
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(0, thumbX.value),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB_SIZE / 2 }],
  }));

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      testID={testID + "-card"}
    >
      <View style={styles.valueRow}>
        <View style={[styles.valuePill, { borderColor: colors.border }]}>
          <Text style={[styles.value, { color: colors.accent }]}>
            {formatSpeed(RECITATION_SPEEDS[displayIndex])}
          </Text>
        </View>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={styles.gestureArea}
          accessibilityRole="adjustable"
          accessibilityLabel="Recitation speed"
          accessibilityValue={{
            min: 0.5,
            max: 2,
            now: RECITATION_SPEEDS[displayIndex],
            text: formatSpeed(RECITATION_SPEEDS[displayIndex]),
          }}
          testID={testID + "-slider"}
        >
          <View style={styles.trackInset} onLayout={setTrackPosition}>
            <View style={[styles.rail, { backgroundColor: colors.rail }]} />
            <Animated.View style={[styles.fill, { backgroundColor: colors.accent }, fillStyle]} />

            <View pointerEvents="none" style={styles.ticks}>
              {RECITATION_SPEEDS.map((speed, index) => (
                <View
                  key={speed}
                  style={[
                    styles.tick,
                    {
                      backgroundColor: index <= displayIndex ? colors.accent : colors.text,
                      borderColor: colors.surface,
                      opacity: index <= displayIndex ? 1 : 0.64,
                    },
                  ]}
                />
              ))}
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.thumb,
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.text,
                },
                thumbStyle,
              ]}
            />
          </View>
        </Animated.View>
      </GestureDetector>

      <View style={styles.labels}>
        <Text style={[styles.label, { color: colors.muted }]}>0.5×</Text>
        <Text style={[styles.label, { color: colors.muted }]}>1×</Text>
        <Text style={[styles.label, { color: colors.muted }]}>1.5×</Text>
        <Text style={[styles.label, { color: colors.muted }]}>2×</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 10,
  },
  valueRow: {
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  valuePill: {
    minWidth: 66,
    minHeight: 31,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  gestureArea: {
    height: 58,
    justifyContent: "center",
  },
  trackInset: {
    height: 34,
    marginHorizontal: THUMB_SIZE / 2,
    justifyContent: "center",
  },
  rail: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 5,
    borderRadius: 99,
  },
  fill: {
    position: "absolute",
    left: 0,
    height: 5,
    borderRadius: 99,
  },
  ticks: {
    position: "absolute",
    left: -5,
    right: -5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tick: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  thumb: {
    position: "absolute",
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 5,
  },
  labels: {
    marginTop: -4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
