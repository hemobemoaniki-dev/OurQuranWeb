import { Text } from "@/src/components/AppText";
import { Tabs } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: "index", label: "Home", icon: "home-variant-outline" },
  { name: "read", label: "Read Quran", icon: "book-open-page-variant-outline" },
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
  const inactive = scheme === "dark" ? "#E8E5DF" : "#28251F";
  const tint = focused ? colors.gold : inactive;

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
      <View style={[styles.iconSlot, focused && { backgroundColor: colors.goldSoft, borderColor: colors.goldBorder }]}>
        <Icon name={meta.icon} size={24} color={tint} />
      </View>
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {meta.label}
      </Text>
      {focused ? <View style={[styles.activeRail, { backgroundColor: colors.gold }]} /> : null}
    </Pressable>
  );
});

function CustomTabBar({ state, navigation }: any) {
  const styles = useStyles();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.base,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 18),
          borderRightColor: scheme === "dark" ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
        },
      ]}
      testID="desktop-tab-sidebar"
    >
      <LinearGradient
        pointerEvents="none"
        colors={scheme === "dark"
          ? ["rgba(44,35,17,0.98)", "rgba(13,13,13,0.99)", "rgba(4,4,4,1)"]
          : ["rgba(249,240,210,0.98)", "rgba(255,253,247,0.99)", "rgba(246,242,231,1)"]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />

      <View style={styles.brand}>
        <View style={[styles.brandMark, { borderColor: colors.goldBorder, backgroundColor: colors.goldSoft }]}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.brandLogo}
            contentFit="cover"
            transition={0}
            accessibilityLabel="OurQuran"
          />
        </View>
        <View style={styles.brandCopy}>
          <Text style={[styles.brandName, { color: scheme === "dark" ? "#FFFFFF" : "#15120D" }]}>OurQuran</Text>
          <Text style={styles.brandTag}>READ · REFLECT · ASCEND</Text>
        </View>
      </View>

      <View style={styles.row}>
        {state.routes.map((route: any, index: number) => {
          const meta = TABS.find((tab) => tab.name === route.name);
          return meta
            ? <TabItem key={route.key} route={route} meta={meta} focused={state.index === index} navigation={navigation} />
            : null;
        })}
      </View>

      <View style={styles.footer}>
        <View style={[styles.footerDot, { backgroundColor: colors.gold }]} />
        <Text style={styles.footerText}>Your Quran journey, synced.</Text>
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
        tabBarPosition: "left",
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
    width: 232,
    minWidth: 232,
    height: "100%",
    paddingHorizontal: 14,
    backgroundColor: c.surface,
    borderRightWidth: 1,
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
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogo: { width: 36, height: 36, borderRadius: 10 },
  brandCopy: { flex: 1, minWidth: 0, gap: 2 },
  brandName: { fontSize: 19, lineHeight: 23, fontWeight: "900", letterSpacing: -0.4 },
  brandTag: { color: c.gold, fontSize: 7, lineHeight: 10, fontWeight: "900", letterSpacing: 1.25 },
  row: { flex: 1, gap: 7 },
  item: {
    position: "relative",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 15,
    overflow: "hidden",
  },
  itemFocused: {
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },
  itemPressed: { opacity: 0.68 },
  iconSlot: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1, fontSize: 13.5, lineHeight: 18, fontWeight: "800", letterSpacing: -0.1 },
  activeRail: {
    position: "absolute",
    right: 0,
    top: 13,
    bottom: 13,
    width: 3,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  footerDot: { width: 7, height: 7, borderRadius: 4 },
  footerText: { flex: 1, color: c.muted, fontSize: 10.5, lineHeight: 15, fontWeight: "600" },
}));
