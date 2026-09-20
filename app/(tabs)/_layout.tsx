import { Text } from "@/src/components/AppText";
import { BrandLockup } from "@/src/components/BrandLockup";
import { Icon, type IconName } from "@/src/components/Icon";
import { TasbeehIcon } from "@/src/components/TasbeehIcon";
import { WebTopNav } from "@/src/components/WebTopNav";
import { useAccount, useAuth } from "@/src/context/AppState";
import { makeStyles, useTheme } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { memo } from "react";
import { Platform, Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIVACY_URL = "https://ourquran.web.app/privacy";
const DELETE_ACCOUNT_URL = "https://ourquran.web.app/delete-account";

const TABS: { name: string; label: string; icon: IconName; href: "/" | "/read" | "/adhkar" | "/names" | "/preferences" }[] = [
  { name: "index", label: "Home", icon: "home-variant-outline", href: "/" },
  { name: "read", label: "Quran", icon: "book-open-page-variant-outline", href: "/read" },
  { name: "adhkar", label: "Adhkar", icon: "counter", href: "/adhkar" },
  { name: "names", label: "Names", icon: "star-crescent", href: "/names" },
  { name: "preferences", label: "Settings", icon: "tune-variant", href: "/preferences" },
];

const TabItem = memo(function TabItem({
  route,
  meta,
  focused,
}: {
  route: { key: string; name: string };
  meta: typeof TABS[number];
  focused: boolean;
}) {
  const styles = useStyles();
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const tint = focused ? colors.gold : scheme === "dark" ? "#F7F4EE" : "#2C271F";

  return (
    <Pressable
      style={({ pressed, hovered }: any) => [
        styles.item,
        (focused || hovered) && styles.itemFocused,
        pressed && styles.itemPressed,
      ]}
      onPress={() => {
        if (!focused) router.push(meta.href);
      }}
      accessibilityRole="tab"
      accessibilityLabel={meta.label}
      accessibilityState={{ selected: focused }}
      testID={`tab-${meta.name}`}
    >
      <LinearGradient
        pointerEvents="none"
        colors={focused
          ? [colors.goldSoft, "rgba(212,175,55,0.035)", "transparent"]
          : ["rgba(212,175,55,0.06)", "transparent", "transparent"]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.itemGlow}
      />
      <View style={[styles.iconSlot, focused && styles.iconSlotFocused]}>
        {meta.name === "adhkar"
          ? <TasbeehIcon color={tint} size={31} />
          : <Icon name={meta.icon} size={29} color={tint} />}
      </View>
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {meta.label}
      </Text>
      {focused ? <View style={styles.activeDot} /> : null}
    </Pressable>
  );
});

function LegalLink({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed, hovered }: any) => [
        styles.legalButton,
        hovered && styles.legalButtonHover,
        pressed && styles.itemPressed,
      ]}
    >
      <Icon name={icon} size={17} color={colors.gold} />
      <Text style={styles.legalText} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function CustomTabBar({ state }: any) {
  const styles = useStyles();
  const router = useRouter();
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
          paddingBottom: Math.max(insets.bottom, 14),
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
            />
          ) : null;
        })}
      </View>

      <View style={styles.footerLinks}>
        <LegalLink label="Privacy" icon="shield-check" onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)} />
        <LegalLink label="Delete" icon="account-remove-outline" onPress={() => void WebBrowser.openBrowserAsync(DELETE_ACCOUNT_URL)} />
        <LegalLink
          label={user ? "Account" : "Sign in"}
          icon={user ? "account-circle-outline" : "account-outline"}
          onPress={() => router.push(user ? "/settings/account" : "/auth")}
        />
        <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const desktopWeb = Platform.OS === "web" && width >= 900;

  if (desktopWeb) {
    return (
      <View style={{ flex: 1, backgroundColor: "#030303" }}>
        <WebTopNav />
        <View style={{ flex: 1 }}>
          <Tabs
            detachInactiveScreens={false}
            screenOptions={{ headerShown: false, lazy: false, freezeOnBlur: true, animation: "none", tabBarHideOnKeyboard: true }}
            tabBar={() => null}
          >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="read" />
            <Tabs.Screen name="adhkar" />
            <Tabs.Screen name="names" />
            <Tabs.Screen name="preferences" />
          </Tabs>
        </View>
      </View>
    );
  }

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
    borderWidth: 1,
    borderColor: "transparent",
  },
  itemFocused: {
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
    shadowColor: c.gold,
    shadowOpacity: 0.18,
    shadowRadius: 15,
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
  footerLinks: {
    gap: 7,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.divider,
  },
  legalButton: {
    minHeight: 35,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 7,
    cursor: "pointer",
    overflow: "hidden",
  },
  legalButtonHover: {
    backgroundColor: "rgba(212,175,55,0.23)",
    shadowColor: c.gold,
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  legalText: {
    color: c.onSurface,
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: "900",
  },
  statusBar: {
    width: 34,
    height: 3,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 2,
  },
}));
