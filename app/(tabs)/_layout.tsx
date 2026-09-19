import { Text } from "@/src/components/AppText";
import { BrandLockup } from "@/src/components/BrandLockup";
import { Icon, type IconName } from "@/src/components/Icon";
import { useAccount, useAuth } from "@/src/context/AppState";
import { makeStyles, useTheme } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const tint = focused ? colors.gold : scheme === "dark" ? "#F7F4EE" : "#2C271F";

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
          start={{ x: 0.08, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={styles.itemGlow}
        />
      ) : null}
      <View style={[styles.iconSlot, focused && styles.iconSlotFocused]}>
        <Icon name={meta.icon} size={29} color={tint} />
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
          paddingTop: Math.max(insets.top, 16),
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
        <BrandLockup
          tint={colors.gold}
          size={68}
          orientation="vertical"
          lightText={scheme === "dark"}
        />
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
        <Icon name={user ? "account-circle-outline" : "account-outline"} size={28} color={colors.onSurface} />
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
        tabBarStyle: { width: 128, borderTopWidth: 0 },
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
    width: 128,
    minWidth: 128,
    height: "100%",
    paddingHorizontal: 10,
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
    minHeight: 116,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  row: {
    flex: 1,
    gap: 9,
    alignItems: "center",
  },
  item: {
    position: "relative",
    width: 106,
    minHeight: 78,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
    cursor: "pointer",
  },
  itemFocused: {
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
    shadowColor: c.gold,
    shadowOpacity: 0.16,
    shadowRadius: 13,
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
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSlotFocused: {
    backgroundColor: c.goldSoft,
  },
  label: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "900",
    letterSpacing: 0.15,
    textAlign: "center",
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.gold,
    shadowColor: c.gold,
    shadowOpacity: 0.7,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  accountButton: {
    width: 68,
    height: 58,
    borderRadius: 18,
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
    right: 9,
    bottom: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: c.surface,
  },
}));
