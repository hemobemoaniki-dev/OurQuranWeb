import { Text } from "@/src/components/AppText";
import { Tabs } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: "index", label: "Home", icon: "home-variant-outline" },
  { name: "read", label: "Read", icon: "book-open-page-variant-outline" },
  { name: "adhkar", label: "Adhkar", icon: "hands-pray" },
  { name: "names", label: "99 Names", icon: "star-crescent" },
  { name: "preferences", label: "Settings", icon: "tune-variant" },
];

const TabItem = memo(function TabItem({ route, meta, focused, navigation }: {
  route: { key: string; name: string };
  meta: typeof TABS[number];
  focused: boolean;
  navigation: any;
}) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const inactive = scheme === "dark" ? "#FFFFFF" : "#111111";
  const tint = focused ? colors.gold : inactive;

  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={() => {
        const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
      }}
      onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
      accessibilityRole="tab"
      accessibilityLabel={meta.label}
      accessibilityState={{ selected: focused }}
      testID={`tab-${meta.name}`}
    >
      <View style={styles.iconSlot}>
        <Icon name={meta.icon} size={32} color={tint} />
      </View>
      <Text
        style={[styles.label, { color: tint }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
      >
        {meta.label}
      </Text>
    </Pressable>
  );
});

function CustomTabBar({ state, navigation }: any) {
  const styles = useStyles();
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.base, { paddingBottom: Math.max(insets.bottom, 6) }]} testID="bottom-tab-bar">
      <LinearGradient
        pointerEvents="none"
        colors={scheme === "dark"
          ? ["rgba(77,58,28,0.82)", "rgba(21,18,15,0.90)", "rgba(7,7,7,0.94)"]
          : ["rgba(246,232,183,0.80)", "rgba(255,253,247,0.91)", "rgba(247,243,233,0.95)"]}
        locations={[0, 0.48, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />
      <View
        pointerEvents="none"
        style={[
          styles.topHairline,
          { backgroundColor: scheme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)" },
        ]}
      />
      <View style={styles.row}>
        {state.routes.map((route: any, index: number) => {
          const meta = TABS.find((tab) => tab.name === route.name);
          return meta
            ? <TabItem key={route.key} route={route} meta={meta} focused={state.index === index} navigation={navigation} />
            : null;
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: true,
        animation: "none",
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="read" />
      <Tabs.Screen name="adhkar" />
      <Tabs.Screen name="names" />
      <Tabs.Screen name="preferences" />
    </Tabs>
  );
}

const useStyles = makeStyles(() => ({
  base: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 80,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  background: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  topHairline: { position: "absolute", top: 0, left: 0, right: 0, height: 1 },
  row: { flexDirection: "row", minHeight: 74, alignItems: "stretch" },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 8,
    gap: 2,
  },
  itemPressed: { opacity: 0.58 },
  iconSlot: { width: 42, height: 38, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11.5, lineHeight: 15, fontWeight: "900", textAlign: "center", letterSpacing: -0.1 },
}));
