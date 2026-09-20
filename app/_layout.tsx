import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import Head from "expo-router/head";
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
import { exitReaderAudio, stopAllAyahAudio } from "@/src/lib/audio";
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
    if (pathname !== "/reader") exitReaderAudio();
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
  const pathname = usePathname();
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
    <>
      <Head>
        <title>OurQuran — Read Quran, Build Consistency & Track Progress</title>
        <meta
          name="description"
          content="Read the Quran with recitation, translations, bookmarks, daily goals, streaks, Adhkar, Tasbeeh, the 99 Names of Allah, and synced progress across devices."
        />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="OurQuran" />
        <meta property="og:title" content="OurQuran — Read Quran, Build Consistency & Track Progress" />
        <meta
          property="og:description"
          content="A modern Quran reading experience with recitation, translations, daily goals, streaks, Adhkar, Tasbeeh and synced progress."
        />
        <meta name="twitter:card" content="summary" />
        <meta name="theme-color" content="#030303" />
        <link rel="icon" type="image/svg+xml" sizes="any" href="/favicon-web-v5.svg?v=5" />
        <link rel="shortcut icon" href="/favicon-web-v5.svg?v=5" />
        <link rel="manifest" href="/site.webmanifest" />
      </Head>
      <ErrorBoundary resetKey={pathname}>
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
    </>
  );
}
