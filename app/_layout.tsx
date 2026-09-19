import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, LogBox, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { ReminderScheduler } from "@/src/components/ReminderScheduler";
import { ReaderWarmup } from "@/src/components/ReaderWarmup";
import { AppProviders } from "@/src/context/AppState";
import { SessionProvider } from "@/src/context/SessionContext";
import { ThemeApplier } from "@/src/context/ThemeApplier";
import { stopAllAyahAudio } from "@/src/lib/audio";
import { queryClient } from "@/src/query-client";
import { useTheme } from "@/src/theme";

void SplashScreen.preventAutoHideAsync();

// Keep runtime warnings visible during testing.
LogBox.ignoreAllLogs(false);

function ThemedStatusBar() {
  const { scheme } = useTheme();
  const pathname = usePathname();
  return <StatusBar style={pathname === "/reader" || scheme === "dark" ? "light" : "dark"} />;
}

function AudioRouteGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/reader") stopAllAyahAudio();
  }, [pathname]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") stopAllAyahAudio();
    });
    return () => subscription.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    LatoRegular: require("../assets/fonts/Lato-Regular.ttf"),
    LatoBold: require("../assets/fonts/Lato-Bold.ttf"),
    LatoBlack: require("../assets/fonts/Lato-Black.ttf"),
    // Load the navigation icon font before the splash screen disappears. The
    // Material icon component uses this exact Android font-family name, so
    // every tab glyph is ready on the very first frame instead of loading
    // lazily after a tab is pressed.
    "Material Design Icons": require("@react-native-vector-icons/material-design-icons/fonts/MaterialDesignIcons.ttf"),
  });
  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);
  const { colors } = useTheme();
  if (!fontsLoaded && !fontError) return null;
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <KeyboardProvider>
              <AppProviders>
                <SessionProvider>
                  <ThemeApplier />
                  <ReminderScheduler />
                  <ReaderWarmup />
                  <ThemedStatusBar />
                  <AudioRouteGuard />
                  <View style={{ flex: 1, backgroundColor: colors.surface }}>
                    <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: colors.surface } }} />
                  </View>
                </SessionProvider>
              </AppProviders>
            </KeyboardProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
