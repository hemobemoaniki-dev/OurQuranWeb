import { Text } from "@/src/components/AppText";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { useRouter } from "expo-router";
import Head from "expo-router/head";
import { ActivityIndicator, Platform, ScrollView, Pressable, View, useWindowDimensions } from "react-native";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";

import { Icon, type IconName } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { WebPageBackdrop } from "@/src/components/WebPageBackdrop";
import { useAccount, useAuth } from "@/src/context/AppState";
import { RECITERS } from "@/src/data/reciters";
import { siteBackground } from "@/src/data/site-backgrounds";
import { formatK, monthValue, todayValue, weekValue } from "@/src/lib/dates";
import { makeStyles, useTheme } from "@/src/theme";
import { serifFont } from "@/src/typography";

const SUPPORT_URL = "https://ko-fi.com/ourquran";
const PRIVACY_URL = "https://ourquran.web.app/privacy";

export default function SettingsHome({ inTab = false }: { inTab?: boolean }) {
  const { width } = useWindowDimensions();
  if (Platform.OS === "web" && width >= 1080) return <DesktopSettingsHome />;
  return <MobileSettingsHome inTab={inTab} />;
}

function MobileSettingsHome({ inTab = false }: { inTab?: boolean }) {
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
      router.replace("/");
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
          <Row icon="image-multiple-outline" label="Website Background" value={siteBackground(account.settings.siteBackground).name} onPress={() => router.push("/settings/background")} />
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

function DesktopSettingsHome() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { account, isGuest, syncStatus, updateSettings, syncNow } = useAccount();
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState<"sync" | "signout" | "">("");
  const [message, setMessage] = useState("");
  const reciter = RECITERS.find((item) => item.id === account.settings.reciter)?.name ?? "Selected reciter";
  const background = siteBackground(account.settings.siteBackground);
  const readingSizes = ["small", "standard", "large", "xlarge"] as const;
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const doSync = async () => {
    if (busy) return;
    if (isGuest) {
      router.push("/auth");
      return;
    }
    setBusy("sync");
    setMessage("");
    const ok = await syncNow().catch(() => false);
    setMessage(ok ? "Everything is safely synced." : "Sync could not finish. Please try again.");
    setBusy("");
  };

  const doSignOut = async () => {
    if (busy) return;
    setBusy("signout");
    setMessage("");
    try {
      await signOut();
      router.replace("/");
    } catch {
      setMessage("Could not sign out. Please try again.");
      setBusy("");
    }
  };

  const nextReadingSize = () => {
    const current = readingSizes.indexOf(account.settings.readingSize);
    updateSettings({ readingSize: readingSizes[(current + 1) % readingSizes.length] });
  };

  return (
    <>
      <Head><title>Settings — OurQuran</title><meta name="description" content="Personalize your Quran reading, recitation, goals, reminders, account and privacy settings." /></Head>
      <View style={styles.desktopSettingsRoot}>
        <WebPageBackdrop intensity="strong" />
        <ScrollView contentContainerStyle={styles.desktopSettingsPage} showsVerticalScrollIndicator={false}>
          <View style={styles.settingsHero}>
            <View>
              <Text style={styles.settingsEyebrow}>YOUR SPACE · YOUR RHYTHM</Text>
              <Text style={styles.settingsTitle}>Settings</Text>
              <Text style={styles.settingsSubtitle}>Shape your OurQuran experience around the way you read, listen, and grow.</Text>
            </View>
            <Text style={styles.settingsQuote}>“The most beloved deeds are those done consistently.”{`\n`}— Sahih al-Bukhari</Text>
          </View>

          <View style={styles.desktopProfileCard}>
            {isGuest ? <View style={styles.desktopAvatarFallback}><Icon name="account" size={34} color={colors.gold} /></View> : <ProfileAvatar value={account.photoURL} size={72} />}
            <View style={styles.desktopProfileCopy}>
              <Text style={styles.desktopProfileName}>{isGuest ? "Guest reader" : account.fullName || account.username || "OurQuran reader"}</Text>
              <Text style={styles.desktopProfileEmail}>{isGuest ? "Create an account to protect your progress on every device." : account.email || user?.email}</Text>
              <View style={styles.desktopSyncStatus}><View style={styles.syncDot} /><Text style={styles.desktopSyncStatusText}>{isGuest ? "Local session" : syncStatus === "synced" ? "Your journey is synced" : syncStatus}</Text></View>
            </View>
            <View style={styles.profileStats}>
              <DesktopStat value={formatK(account.totalHasanaat)} label="Hasanaat" />
              <DesktopStat value={formatK(account.completedReads)} label="Ayahs read" />
              <DesktopStat value={`${Math.floor(account.totalSeconds / 3600)}h ${Math.floor((account.totalSeconds % 3600) / 60)}m`} label="Reading time" />
            </View>
            <Pressable onPress={() => router.push(isGuest ? "/auth" : "/settings/profile")} style={({ pressed }) => [styles.profileAction, pressed && styles.desktopSettingPressed]}>
              <Icon name={isGuest ? "login" : "pencil-outline"} size={19} color={colors.onBrandPrimary} />
              <Text style={styles.profileActionText}>{isGuest ? "Sign in" : "Edit profile"}</Text>
            </Pressable>
          </View>

          <View style={styles.settingsGrid}>
            <SettingsPanel icon="book-open-page-variant" title="Reader settings" description="Make every ayah comfortable to read.">
              <SettingAction icon="web" label="Translation" value={account.settings.language === "en" ? "English" : account.settings.language.toUpperCase()} onPress={() => router.push("/settings/language")} />
              <SettingAction icon="format-size" label="Text size" value={account.settings.readingSize} onPress={nextReadingSize} />
              <SettingAction icon="palette-outline" label="Reader appearance" value="Personalized" onPress={() => router.push("/settings/reader-theme")} last />
            </SettingsPanel>

            <SettingsPanel icon="microphone-outline" title="Reciter & playback" description="Choose the voice and pace that keeps you present.">
              <SettingAction icon="account-voice" label="Reciter" value={reciter} onPress={() => router.push("/settings/reciter")} />
              <View style={styles.settingBlock}>
                <Text style={styles.settingBlockLabel}>Recitation speed</Text>
                <View style={styles.speedChoices}>{speeds.map((speed) => <Pressable key={speed} onPress={() => updateSettings({ speed })} style={[styles.speedChoice, account.settings.speed === speed && styles.speedChoiceActive]}><Text style={[styles.speedChoiceText, account.settings.speed === speed && styles.speedChoiceTextActive]}>{speed}×</Text></Pressable>)}</View>
              </View>
              <SettingToggle icon="play-circle-outline" label="Autoplay next ayah" enabled={account.settings.autoplay} onPress={() => updateSettings({ autoplay: !account.settings.autoplay })} last />
            </SettingsPanel>

            <SettingsPanel icon="palette-outline" title="Theme & appearance" description="Set the atmosphere for your daily reading.">
              <View style={styles.themeChoices}>{(["dark", "light", "system"] as const).map((theme) => <Pressable key={theme} onPress={() => updateSettings({ theme })} style={[styles.themeChoice, account.settings.theme === theme && styles.themeChoiceActive]}><Icon name={theme === "dark" ? "weather-night" : theme === "light" ? "white-balance-sunny" : "cellphone"} size={24} color={account.settings.theme === theme ? colors.gold : colors.muted} /><Text style={[styles.themeChoiceText, account.settings.theme === theme && styles.themeChoiceTextActive]}>{theme[0].toUpperCase() + theme.slice(1)}</Text></Pressable>)}</View>
              <SettingAction icon="image-multiple-outline" label="Website background" value={background.name} onPress={() => router.push("/settings/background")} />
              <Text style={styles.panelFootnote}>Theme and background choices sync across sessions. Background presets keep a contrast layer behind content for readability.</Text>
            </SettingsPanel>

            <SettingsPanel icon="bell-outline" title="Notifications & reminders" description="A gentle invitation back to the Qur’an.">
              <SettingToggle icon="bell-outline" label="Daily reminder" enabled={account.settings.notifications.enabled} onPress={() => updateSettings({ notifications: { ...account.settings.notifications, enabled: !account.settings.notifications.enabled } })} />
              <SettingAction icon="clock-outline" label="Reminder time" value={account.settings.notifications.time} onPress={() => router.push("/settings/notifications")} />
              <SettingAction icon="tune-variant" label="Notification options" value="Manage" onPress={() => router.push("/settings/notifications")} last />
            </SettingsPanel>

            <SettingsPanel icon="target" title="Daily reading goal" description="Build a sustainable rhythm, one ayah at a time.">
              <View style={styles.goalControl}>
                <Pressable onPress={() => updateSettings({ dailyGoal: Math.max(1, account.settings.dailyGoal - 1) })} style={styles.goalButton}><Icon name="minus" size={24} color={colors.gold} /></Pressable>
                <View style={styles.goalValueWrap}><Text style={styles.goalValue}>{account.settings.dailyGoal}</Text><Text style={styles.goalUnit}>ayahs per day</Text></View>
                <Pressable onPress={() => updateSettings({ dailyGoal: Math.min(500, account.settings.dailyGoal + 1) })} style={styles.goalButton}><Icon name="plus" size={24} color={colors.gold} /></Pressable>
              </View>
              <Pressable onPress={() => router.push("/settings/goal")} style={styles.panelWideButton}><Text style={styles.panelWideButtonText}>Set a custom goal</Text><Icon name="arrow-right" size={18} color={colors.gold} /></Pressable>
            </SettingsPanel>

            <SettingsPanel icon="cloud-sync-outline" title="Bookmarks & sync" description="Keep your place safe on every device.">
              <SettingAction icon="bookmark-multiple-outline" label="Saved ayahs" value={`${account.appState.bookmarks.length}`} onPress={() => router.push("/settings/bookmarks")} />
              <SettingAction icon="cloud-check" label="Sync status" value={isGuest ? "Sign in required" : syncStatus} onPress={() => router.push(isGuest ? "/auth" : "/settings/sync")} />
              <Pressable disabled={busy === "sync"} onPress={() => void doSync()} style={styles.panelWideButton}><Text style={styles.panelWideButtonText}>{busy === "sync" ? "Syncing…" : isGuest ? "Sign in to sync" : "Sync now"}</Text>{busy === "sync" ? <ActivityIndicator size="small" color={colors.gold} /> : <Icon name="cloud-sync" size={18} color={colors.gold} />}</Pressable>
            </SettingsPanel>

            <SettingsPanel icon="shield-check" title="Privacy & support" description="Clear choices, respectful data, help when needed.">
              <SettingAction icon="shield-check" label="Privacy policy" value="Read" onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)} />
              <SettingAction icon="information-outline" label="About OurQuran" value="Learn more" onPress={() => router.push("/settings/about")} />
              <SettingAction icon="hand-heart-outline" label="Support the project" value="Ko-fi" onPress={() => void WebBrowser.openBrowserAsync(SUPPORT_URL)} last />
            </SettingsPanel>

            <SettingsPanel icon="lock-outline" title="Security & account" description="Protect and manage your account.">
              <SettingAction icon="account-outline" label="Profile information" value="Edit" onPress={() => router.push(isGuest ? "/auth" : "/settings/profile")} />
              <SettingAction icon="lock-outline" label="Password & security" value="Manage" onPress={() => router.push(isGuest ? "/auth" : "/settings/account")} />
              <Pressable disabled={isGuest || busy === "signout"} onPress={() => void doSignOut()} style={styles.panelWideButton}><Text style={styles.panelWideButtonText}>{busy === "signout" ? "Signing out…" : isGuest ? "Guest session" : "Sign out"}</Text><Icon name="logout" size={18} color={colors.gold} /></Pressable>
            </SettingsPanel>

            <SettingsPanel icon="account-remove-outline" title="Delete account" description="Permanently remove your account and cloud data." danger>
              <View style={styles.deleteNotice}><Icon name="alert-circle-outline" size={22} color={colors.error} /><Text style={styles.deleteNoticeText}>This action is permanent. You will review exactly what is removed before confirming.</Text></View>
              <Pressable disabled={isGuest} onPress={() => router.push(isGuest ? "/auth" : "/settings/account")} style={[styles.deleteButton, isGuest && styles.settingDisabled]}><Text style={styles.deleteButtonText}>{isGuest ? "No account connected" : "Review account deletion"}</Text><Icon name="arrow-right" size={18} color={colors.error} /></Pressable>
            </SettingsPanel>
          </View>
          {message ? <Text accessibilityRole="alert" style={styles.desktopMessage}>{message}</Text> : null}
          <Text style={styles.settingsFooter}>OurQuran · Read and ascend · Your progress belongs to you.</Text>
        </ScrollView>
      </View>
    </>
  );
}

function DesktopStat({ value, label }: { value: string; label: string }) {
  const styles = useStyles();
  return <View style={styles.desktopStat}><Text style={styles.desktopStatValue}>{value}</Text><Text style={styles.desktopStatLabel}>{label}</Text></View>;
}

function SettingsPanel({ icon, title, description, children, danger = false }: { icon: IconName; title: string; description: string; children: React.ReactNode; danger?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.settingsPanel, danger && styles.settingsPanelDanger]}>
      <View style={styles.panelHead}><View style={[styles.panelIcon, danger && styles.panelIconDanger]}><Icon name={icon} size={25} color={danger ? colors.error : colors.gold} /></View><View style={{ flex: 1 }}><Text style={styles.panelTitle}>{title}</Text><Text style={styles.panelDescription}>{description}</Text></View></View>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function SettingAction({ icon, label, value, onPress, last = false }: { icon: IconName; label: string; value: string; onPress: () => void; last?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.settingAction, !last && styles.settingActionBorder, pressed && styles.desktopSettingPressed]}><View style={styles.settingActionIcon}><Icon name={icon} size={19} color={colors.gold} /></View><Text style={styles.settingActionLabel}>{label}</Text><Text numberOfLines={1} style={styles.settingActionValue}>{value}</Text><Icon name="chevron-right" size={18} color={colors.muted} /></Pressable>;
}

function SettingToggle({ icon, label, enabled, onPress, last = false }: { icon: IconName; label: string; enabled: boolean; onPress: () => void; last?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: enabled }} onPress={onPress} style={({ pressed }) => [styles.settingAction, !last && styles.settingActionBorder, pressed && styles.desktopSettingPressed]}><View style={styles.settingActionIcon}><Icon name={icon} size={19} color={colors.gold} /></View><Text style={styles.settingActionLabel}>{label}</Text><View style={[styles.settingToggle, enabled && styles.settingToggleOn]}><View style={[styles.settingToggleThumb, enabled && styles.settingToggleThumbOn]} /></View></Pressable>;
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
  desktopSettingsRoot: { flex: 1, backgroundColor: colors.surface, position: "relative", overflow: "hidden" },
  desktopSettingsPage: {
    width: "100%",
    maxWidth: 1540,
    alignSelf: "center",
    paddingHorizontal: 34,
    paddingTop: 30,
    paddingBottom: 68,
    gap: 20,
    zIndex: 1,
  },
  settingsHero: {
    minHeight: 148,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 30,
    paddingHorizontal: 38,
    paddingVertical: 24,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
    shadowColor: colors.gold,
    shadowOpacity: 0.1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },
  settingsEyebrow: { color: colors.gold, fontSize: 12, lineHeight: 17, fontWeight: "900", letterSpacing: 2.4, marginBottom: 7 },
  settingsTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 50, lineHeight: 56, fontWeight: "700", letterSpacing: -1.2 },
  settingsSubtitle: { color: colors.onSurfaceSecondary, fontSize: 17, lineHeight: 26, marginTop: 4 },
  settingsQuote: { color: colors.gold, fontFamily: serifFont, fontSize: 17, lineHeight: 27, maxWidth: 430, textAlign: "right" },
  desktopProfileCard: {
    minHeight: 126,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 26,
    paddingVertical: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
  },
  desktopAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldSoft,
  },
  desktopProfileCopy: { flex: 1, minWidth: 240 },
  desktopProfileName: { color: colors.onSurface, fontFamily: serifFont, fontSize: 24, lineHeight: 30, fontWeight: "700" },
  desktopProfileEmail: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 3 },
  desktopSyncStatus: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 9 },
  syncDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: colors.success, shadowColor: colors.success, shadowOpacity: 0.8, shadowRadius: 6 },
  desktopSyncStatusText: { color: colors.success, fontSize: 12, fontWeight: "800", textTransform: "capitalize" },
  profileStats: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  desktopStat: { minWidth: 112, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary },
  desktopStatValue: { color: colors.gold, fontFamily: serifFont, fontSize: 23, lineHeight: 28, fontWeight: "700" },
  desktopStatLabel: { color: colors.muted, fontSize: 10.5, lineHeight: 15, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  profileAction: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.brandPrimary, cursor: "pointer", shadowColor: colors.gold, shadowOpacity: 0.22, shadowRadius: 12 },
  profileActionText: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "900" },
  settingsGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", alignItems: "stretch", gap: 16 },
  settingsPanel: {
    width: "32.55%",
    minWidth: 340,
    minHeight: 314,
    padding: 20,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  settingsPanelDanger: { borderColor: "rgba(155,34,38,0.48)", backgroundColor: "rgba(155,34,38,0.055)" },
  panelHead: { minHeight: 66, flexDirection: "row", alignItems: "flex-start", gap: 13, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.divider },
  panelIcon: { width: 43, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.goldSoft },
  panelIconDanger: { borderColor: "rgba(155,34,38,0.45)", backgroundColor: "rgba(155,34,38,0.10)" },
  panelTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 20, lineHeight: 25, fontWeight: "700" },
  panelDescription: { color: colors.muted, fontSize: 11.5, lineHeight: 17, marginTop: 3 },
  panelBody: { flex: 1, paddingTop: 8 },
  settingAction: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 5, cursor: "pointer" },
  settingActionBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  settingActionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.goldSoft },
  settingActionLabel: { flex: 1, color: colors.onSurface, fontSize: 13.5, fontWeight: "700" },
  settingActionValue: { maxWidth: 130, color: colors.gold, fontSize: 11.5, fontWeight: "800", textTransform: "capitalize" },
  desktopSettingPressed: { opacity: 0.68, transform: [{ scale: 0.985 }] },
  settingToggle: { width: 44, height: 25, borderRadius: 99, padding: 3, justifyContent: "center", backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.borderStrong },
  settingToggleOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  settingToggleThumb: { width: 17, height: 17, borderRadius: 99, backgroundColor: colors.muted },
  settingToggleThumbOn: { alignSelf: "flex-end", backgroundColor: colors.gold },
  settingBlock: { minHeight: 74, justifyContent: "center", gap: 9, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: colors.divider },
  settingBlockLabel: { color: colors.onSurface, fontSize: 12.5, fontWeight: "800" },
  speedChoices: { flexDirection: "row", alignItems: "center", gap: 5 },
  speedChoice: { flex: 1, minHeight: 30, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary, cursor: "pointer" },
  speedChoiceActive: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  speedChoiceText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  speedChoiceTextActive: { color: colors.gold },
  themeChoices: { flexDirection: "row", alignItems: "stretch", gap: 8, marginTop: 13 },
  themeChoice: { flex: 1, minHeight: 92, alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary, cursor: "pointer" },
  themeChoiceActive: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  themeChoiceText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  themeChoiceTextActive: { color: colors.gold },
  panelFootnote: { color: colors.muted, fontSize: 10.5, lineHeight: 16, textAlign: "center", marginTop: 16 },
  goalControl: { minHeight: 120, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 23 },
  goalButton: { width: 46, height: 46, borderRadius: 99, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.surfaceTertiary, cursor: "pointer" },
  goalValueWrap: { minWidth: 105, alignItems: "center" },
  goalValue: { color: colors.gold, fontFamily: serifFont, fontSize: 52, lineHeight: 56, fontWeight: "700" },
  goalUnit: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  panelWideButton: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 10, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.goldSoft, cursor: "pointer" },
  panelWideButtonText: { color: colors.gold, fontSize: 12.5, fontWeight: "900" },
  deleteNotice: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginTop: 12, borderRadius: 13, borderWidth: 1, borderColor: "rgba(155,34,38,0.34)", backgroundColor: "rgba(155,34,38,0.07)" },
  deleteNoticeText: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 11.5, lineHeight: 18 },
  deleteButton: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 12, borderRadius: 13, borderWidth: 1, borderColor: "rgba(155,34,38,0.52)", cursor: "pointer" },
  deleteButtonText: { color: colors.error, fontSize: 12.5, fontWeight: "900" },
  settingDisabled: { opacity: 0.45 },
  desktopMessage: { color: colors.gold, fontSize: 13, fontWeight: "700", textAlign: "center" },
  settingsFooter: { color: colors.muted, fontFamily: serifFont, fontSize: 13, lineHeight: 20, textAlign: "center", opacity: 0.8, marginTop: 4 },
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
