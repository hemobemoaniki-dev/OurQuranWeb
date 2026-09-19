import { Stack } from "expo-router";
import Head from "expo-router/head";

export default function SettingsLayout() {
  return (
    <>
      <Head><meta name="robots" content="noindex,nofollow" /></Head>
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
