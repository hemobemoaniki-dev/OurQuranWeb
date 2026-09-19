import { Text } from "@/src/components/AppText";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Redirect } from "expo-router";
import { SubHeader } from "@/src/components/SubHeader";
import { Icon } from "@/src/components/Icon";
import { useAccount, useAuth } from "@/src/context/AppState";
import { makeStyles, useTheme } from "@/src/theme";

export default function SyncSettings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { hydrated, syncStatus, lastSyncAt, syncNow } = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!user) return <Redirect href="/auth" />;
  const saved = hydrated && syncStatus === "synced" && !!lastSyncAt;
  return <View style={styles.root}>
    <SubHeader title="Data Sync" />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Icon name={saved ? "cloud-check" : "cloud-sync"} size={36} color={saved ? colors.success : colors.gold} />
        <Text style={styles.title}>{saved ? "Your progress is saved" : syncStatus === "offline" ? "Waiting for a connection" : syncStatus === "error" ? "Sync needs attention" : "Saving your progress…"}</Text>
        <Text style={styles.text}>{user.email}</Text>
        <Text style={styles.text}>Your bookmarks, avatar, reading progress and preferences sync with this account.</Text>
        <Text style={styles.text}>{lastSyncAt ? `Last saved: ${new Date(lastSyncAt).toLocaleString()}` : "No cloud save confirmed yet."}</Text>
        <Pressable disabled={busy || !hydrated} accessibilityRole="button" style={({ pressed }) => [styles.button, { opacity: pressed || busy ? 0.6 : 1 }]} onPress={async () => {
          setBusy(true); setError("");
          try {
            const ok = await syncNow();
            if (!ok) setError("Couldn't fully sync. Check your connection and try again.");
          } catch {
            setError("Couldn't fully sync. Check your connection and try again.");
          } finally { setBusy(false); }
        }}><Text style={styles.buttonText}>{busy ? "Checking…" : "Sync now"}</Text></Pressable>
        {error ? <Text style={styles.text}>{error}</Text> : null}
      </View>
    </ScrollView>
  </View>;
}
const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface }, content: { padding: 20 },
  card: { padding: 22, gap: 18, backgroundColor: c.surfaceSecondary, borderRadius: 24, borderWidth: 1, borderColor: c.border },
  title: { color: c.onSurface, fontSize: 22, fontWeight: "700" }, text: { color: c.muted, fontSize: 14, lineHeight: 22 },
  button: { backgroundColor: c.brandPrimary, borderRadius: 16, padding: 16, alignItems: "center" }, buttonText: { color: c.onBrandPrimary, fontSize: 15, fontWeight: "700" },
}));
