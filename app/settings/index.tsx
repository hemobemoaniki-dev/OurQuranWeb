import { Text } from "@/src/components/AppText";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Pressable, View } from "react-native";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";

import { Icon, type IconName } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { useAccount, useAuth } from "@/src/context/AppState";
import { formatK, monthValue, todayValue, weekValue } from "@/src/lib/dates";
import { makeStyles, useTheme } from "@/src/theme";

const SUPPORT_URL = "https://ko-fi.com/ourquran";

export default function SettingsHome({ inTab = false }: { inTab?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { account, isGuest, syncStatus } = useAccount();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
      router.replace("/(tabs)");
    } catch {
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const syncMeta: Record<string, { icon: IconName; label: string }> = {
    synced: { icon: "cloud-check", label: "Synced across devices" },
    syncing: { icon: "cloud-sync", label: "Syncing…" },
    offline: { icon: "cloud-off-outline", label: "Offline" },
    error: { icon: "cloud-alert", label: "Sync error" },
  };
  const sm = syncMeta[syncStatus] ?? syncMeta.synced;

  return (
    <View style={styles.root}>
      <SubHeader title="Settings" showBack={!inTab} />
      <ScrollView contentContainerStyle={[styles.content, inTab && { paddingBottom: 128 }]} showsVerticalScrollIndicator={false}>
        {/* Account card */}
        {isGuest ? (
          <Pressable style={styles.accountCard} onPress={() => router.push("/auth")} testID="settings-signin">
            <View style={styles.avatarFallback}>
              <Icon name="account" size={28} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>Guest</Text>
              <Text style={styles.accountEmail}>Sign in to sync your progress</Text>
            </View>
            <Icon name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
        ) : (
          <Pressable style={styles.accountCard} onPress={() => router.push("/settings/profile")} testID="settings-account-card">
            <ProfileAvatar value={account.photoURL} />
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{account.username || "Reader"}</Text>
              <Text style={styles.accountEmail}>{account.email || user?.email}</Text>
            </View>
            <Icon name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
        )}

        {/* Your Progress */}
        {!isGuest && (
          <View style={styles.progressCard} testID="settings-progress-card">
            <View style={styles.progressHead}>
              <Text style={styles.sectionLabel}>YOUR PROGRESS</Text>
              <View style={styles.syncChip}>
                <Icon name={sm.icon} size={14} color={colors.gold} />
                <Text style={styles.syncText}>{sm.label}</Text>
              </View>
            </View>
            <View style={styles.progressRow}>
              <Col value={formatK(todayValue(account.history, "hasanaat"))} label="Today" />
              <Col value={formatK(weekValue(account.history, "hasanaat"))} label="Week" />
              <Col value={formatK(monthValue(account.history, "hasanaat"))} label="Month" />
            </View>
          </View>
        )}

        {/* Account settings */}
        {!isGuest && (
          <Section title="ACCOUNT SETTINGS">
            <Row icon="account-outline" label="Profile" onPress={() => router.push("/settings/profile")} />
            <Row icon="lock-outline" label="Security" onPress={() => router.push("/settings/account")} />
            <Row icon="cloud-sync-outline" label="Data Sync" value={sm.label} onPress={() => router.push("/settings/sync")} />
            <Row icon="chart-line" label="Your Progress" onPress={() => router.push("/settings/progress")} last />
          </Section>
        )}

        {/* Reader settings */}
        <Section title="READER SETTINGS">
          <Row icon="palette-outline" label="Reader Theme" onPress={() => router.push("/settings/reader-theme")} />
          <Row icon="heart-outline" label="Bookmarks" onPress={() => router.push("/settings/bookmarks")} />
          <Row icon="microphone-outline" label="Reciter Selection" onPress={() => router.push("/settings/reciter")} />
          <Row icon="speedometer" label="Recitation Speed" onPress={() => router.push("/settings/speed")} />
          <Row icon="play-circle-outline" label="Autoplay" onPress={() => router.push("/settings/autoplay")} last />
        </Section>

        {/* App settings */}
        <Section title="APP SETTINGS">
          <Row icon="palette-outline" label="App Theme" onPress={() => router.push("/settings/theme")} />
          <Row icon="target" label="Daily Quran Goal" onPress={() => router.push("/settings/goal")} />
          <Row icon="bell-outline" label="Notifications" onPress={() => router.push("/settings/notifications")} />
          <Row icon="web" label="Language" onPress={() => router.push("/settings/language")} last />
        </Section>



        {/* Support */}
        <Section title="SUPPORT">
          <Row icon="hand-heart-outline" label="Support" onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URL)} />
          <Row icon="information-outline" label="About OurQuran" onPress={() => router.push("/settings/about")} last />
        </Section>
        {!isGuest && (
          <View style={{ gap: 8 }}>
            <Pressable accessibilityRole="button" disabled={signingOut} style={styles.signOutButton} onPress={handleSignOut} testID="settings-sign-out">
              {signingOut ? <ActivityIndicator color={colors.gold} /> : <Icon name="logout" size={20} color={colors.gold} />}
              <Text style={styles.rowLabel}>{signingOut ? "Signing out…" : "Sign out"}</Text>
            </Pressable>
            {signOutError ? <Text accessibilityRole="alert" style={styles.syncText}>{signOutError}</Text> : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Col({ value, label }: { value: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.col}>
      <Text style={styles.colValue} maxFontSizeMultiplier={1.1}>{value}</Text>
      <Text style={styles.colLabel} numberOfLines={1} maxFontSizeMultiplier={1}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={({ pressed }) => [styles.row, !last && styles.rowBorder, { opacity: pressed ? 0.6 : 1 }]} onPress={onPress} testID={`settings-row-${label}`}>
      <Icon name={icon} size={20} color={colors.gold} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Icon name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  signOutButton: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.surfaceSecondary, cursor: "pointer" },
  content: { width: "100%", maxWidth: 1040, alignSelf: "center", paddingHorizontal: 32, paddingBottom: 56, gap: 20 },
  accountCard: {
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: 20,
    paddingVertical: 18,
    cursor: "pointer",
    shadowColor: colors.gold,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  avatar: { width: 56, height: 56, borderRadius: 999 },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  accountName: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
  accountEmail: { color: colors.muted, fontSize: 13, marginTop: 1 },
  accountBio: { color: colors.gold, fontSize: 12, fontStyle: "italic", marginTop: 3 },

  progressCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 20,
    gap: 16,
  },
  progressHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  syncChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  syncText: { color: colors.gold, fontSize: 12, fontWeight: "600" },
  progressRow: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  col: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
  },
  colValue: { color: colors.gold, fontSize: 22, fontWeight: "800" },
  colLabel: { color: colors.muted, fontSize: 11, fontWeight: "600", width: "100%", textAlign: "center" },

  sectionLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  group: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    gap: 2,
    overflow: "hidden",
  },
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 13, cursor: "pointer" },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { color: colors.onSurface, fontSize: 15, fontWeight: "700", flex: 1, letterSpacing: -0.15 },
  rowValue: { color: colors.muted, fontSize: 12 },
}));
