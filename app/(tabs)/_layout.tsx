import { Text } from "@/src/components/AppText";
import { Tabs } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/src/components/BrandMark";
import { Icon, type IconName } from "@/src/components/Icon";
import { useAccount, useAuth } from "@/src/context/AppState";
import { makeStyles, useTheme } from "@/src/theme";

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: "index", label: "Home", icon: "home-variant-outline" },
  { name: "read", label: "Quran", icon: "book-open-page-variant-outline" },
  { name: "adhkar", label: "Adhkar", icon: "hands-pray" },
  { name: "names", label: "Names", icon: "star-crescent" },
  { name: "preferences", label: "Settings", icon: "tune-variant" },
];

const TabItem = memo(function TabItem({
  route,
  meta,
  focused,
  navigation,
}: {
  route: { key: string; name: string };
  meta: typeof TABS[number];
  focused: boolean;
  navigation: any;
}) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const tint = focused ? colors.gold : scheme === "dark" ? "#E8E5DF" : "#3A352D";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        focused && styles.itemFocused,
        pressed && styles.itemPressed,
      ]}
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
      {focused ? (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.goldSoft, "transparent"]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.itemGlow}
        />
      ) : null}
      <View style={[styles.iconSlot, focused && styles.iconSlotFocused]}>
        <Icon name={meta.icon} size={26} color={tint} />
      </View>
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {meta.label}
      </Text>
      {focused ? <View style={styles.activeDot} /> : null}
    </Pressable>
  );
});

function CustomTabBar({ state, navigation }: any) {
  const styles = useStyles();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { hydrated, syncStatus } = useAccount();
  const { user, initializing } = useAuth();

  const checking = initializing || (!!user && !hydrated);
  const statusColor = checking
    ? colors.muted
    : !user
      ? colors.gold
      : syncStatus === "error"
        ? "#D6505A"
        : syncStatus === "offline"
          ? "#D89B3A"
          : syncStatus === "synced"
            ? "#2E9B70"
            : colors.gold;

  return (
    <View
      style={[
        styles.base,
        {
          paddingTop: Math.max(insets.top, 18),
          paddingBottom: Math.max(insets.bottom, 16),
          borderRightColor: scheme === "dark" ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
        },
      ]}
      testID="desktop-tab-sidebar"
    >
      <LinearGradient
        pointerEvents="none"
        colors={scheme === "dark"
          ? ["rgba(42,32,14,0.98)", "rgba(10,10,10,0.995)", "rgba(3,3,3,1)"]
          : ["rgba(250,241,210,0.99)", "rgba(255,253,247,0.995)", "rgba(247,243,233,1)"]}
        locations={[0, 0.38, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />

      <View style={styles.brand}>
        <BrandMark size={58} tint={colors.gold} glow={colors.gold} intensity="strong" />
      </View>

      <View style={styles.row}>
        {state.routes.map((route: any, index: number) => {
          const meta = TABS.find((tab) => tab.name === route.name);
          return meta ? (
            <TabItem
              key={route.key}
              route={route}
              meta={meta}
              focused={state.index === index}
              navigation={navigation}
            />
          ) : null;
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={user ? "Open settings" : "Guest account settings"}
        onPress={() => navigation.navigate("preferences")}
        style={({ pressed }) => [styles.accountButton, pressed && styles.itemPressed]}
      >
        <Icon name={user ? "account-circle-outline" : "account-outline"} size={25} color={colors.onSurface} />
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </Pressable>
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
        tabBarPosition: "left",
        tabBarStyle: { width: 94, borderTopWidth: 0 },
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

const useStyles = makeStyles((c) => ({
  base: {
    width: 94,
    minWidth: 94,
    height: "100%",
    paddingHorizontal: 8,
    backgroundColor: c.surface,
    borderRightWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 8, height: 0 },
    overflow: "hidden",
  },
  background: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  brand: {
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  row: {
    flex: 1,
    gap: 10,
    alignItems: "center",
  },
  item: {
    position: "relative",
    width: 76,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 18,
    overflow: "hidden",
    cursor: "pointer",
  },
  itemFocused: {
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
    shadowColor: c.gold,
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  itemGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  itemPressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  iconSlot: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSlotFocused: {
    backgroundColor: c.goldSoft,
  },
  label: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 0.1,
    textAlign: "center",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.gold,
    shadowColor: c.gold,
    shadowOpacity: 0.65,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  accountButton: {
    width: 58,
    height: 52,
    borderRadius: 17,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    cursor: "pointer",
  },
  statusDot: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: c.surface,
  },
}));
