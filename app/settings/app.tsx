import { Text } from "@/src/components/AppText";
import { ScrollView, Pressable, Switch, View } from "react-native";
import { useState } from "react";
import { configureReminder } from "@/src/components/ReminderScheduler";

import { Icon } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { useAccount } from "@/src/context/AppState";
import { makeStyles, useTheme } from "@/src/theme";

const THEMES: { key: "dark" | "light" | "system"; label: string; icon: any }[] = [
  { key: "dark", label: "Dark", icon: "weather-night" },
  { key: "light", label: "Light", icon: "white-balance-sunny" },
  { key: "system", label: "Follow system", icon: "cellphone" },
];
const TIMES = ["06:00", "08:00", "12:00", "18:00", "20:00", "21:00"];

export default function AppSettings({ section = "theme" }: { section?: "theme" | "notifications" | "language" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { account, updateSettings } = useAccount();
  const s = account.settings;
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState("");
  const changeReminder = async (enabled: boolean, time: string) => {
    if (reminderBusy) return;
    setReminderBusy(true);
    setReminderError("");
    try {
      await configureReminder(enabled, time, enabled);
      updateSettings({ notifications: { enabled, time } });
    } catch (error: any) { setReminderError(error.message ?? "Could not schedule your reminder."); }
    finally { setReminderBusy(false); }
  };

  return (
    <View style={styles.root}>
      <SubHeader title={{ theme: "App Theme", notifications: "Notifications", language: "Language" }[section]} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {section === "theme" && <Group title="THEME">
          {THEMES.map((t, i) => (
            <Pressable
              key={t.key}
              style={[styles.row, i !== THEMES.length - 1 && styles.rowBorder]}
              onPress={() => updateSettings({ theme: t.key })}
              testID={`theme-${t.key}`}
            >
              <Icon name={t.icon} size={20} color={colors.gold} />
              <Text style={[styles.rowLabel, s.theme === t.key && { color: colors.gold, fontWeight: "700" }]}>{t.label}</Text>
              {s.theme === t.key ? <Icon name="check-circle" size={20} color={colors.gold} /> : <View style={styles.emptyDot} />}
            </Pressable>
          ))}
        </Group>}

        {section === "notifications" && <Group title="NOTIFICATIONS">
          <View style={[styles.row, styles.rowBorder]}>
            <Icon name="bell-outline" size={20} color={colors.gold} />
            <Text style={styles.rowLabel}>Daily reading reminder</Text>
            <Switch
              value={s.notifications.enabled}
              disabled={reminderBusy}
              onValueChange={(v) => { void changeReminder(v, s.notifications.time); }}
              trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }}
              thumbColor={colors.surface}
              testID="notifications-switch"
            />
          </View>
          {s.notifications.enabled && (
            <View style={styles.timeWrap}>
              <Text style={styles.timeLabel}>Reminder time</Text>
              <View style={styles.timeRow}>
                {TIMES.map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.timeChip, s.notifications.time === t && styles.timeChipActive]}
                    disabled={reminderBusy}
                    onPress={() => { void changeReminder(true, t); }}
                    testID={`notif-time-${t}`}
                  >
                    <Text style={[styles.timeText, { color: s.notifications.time === t ? colors.onBrandPrimary : colors.onSurface }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.helper}>Uses this phone’s local time. Notification permission is needed on each device.</Text>
            </View>
          )}
          {reminderError ? <Text style={[styles.helper, { color: colors.error }]}>{reminderError}</Text> : null}
        </Group>}

        {section === "language" && <Group title="LANGUAGE">
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={[styles.rowLabel, { color: colors.gold, fontWeight: "700" }]}>English</Text>
            <Icon name="check-circle" size={20} color={colors.gold} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.muted }]}>العربية (coming soon)</Text>
          </View>
        </Group>}
      </ScrollView>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.groupLabel}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 18 },
  groupLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  group: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { color: colors.onSurface, fontSize: 15, flex: 1 },
  emptyDot: { width: 20, height: 20, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  goalRow: { flexDirection: "row", gap: 8, paddingVertical: 14 },
  goalChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", backgroundColor: colors.surfaceTertiary },
  goalChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  goalText: { fontSize: 18, fontWeight: "800" },
  goalUnit: { fontSize: 11 },
  timeWrap: { paddingVertical: 14, gap: 10 },
  timeLabel: { color: colors.muted, fontSize: 13 },
  timeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  timeChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  timeText: { fontSize: 13, fontWeight: "600" },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18 },
}));
