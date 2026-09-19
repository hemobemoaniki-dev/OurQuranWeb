import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useAccount, useAuth } from "@/src/context/AppState";

const ID = "ourquran-daily-reading";
let queue: Promise<unknown> = Promise.resolve();

// Serialize replacements: fast time changes must leave exactly one reminder.
export function configureReminder(enabled: boolean, time: string, askPermission = false): Promise<void> {
  const work = queue.catch(() => {}).then(async () => {
    if (Platform.OS === "web") {
      if (enabled) throw new Error("Reminders are available in the mobile app.");
      return;
    }
    // Deferred so an unavailable native module cannot break route exports.
    const Notifications = await import("@/src/lib/local-notifications");
    await Notifications.cancelScheduledNotificationAsync(ID);
    if (!enabled) return;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Choose a valid reminder time.");
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync(ID, {
      name: "Daily reading", importance: Notifications.AndroidImportance.DEFAULT,
    });
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && askPermission) permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) throw new Error("Allow OurQuran notifications in your phone settings to receive reminders.");
    const [hour, minute] = time.split(":").map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: { title: "Your daily Qur’an reading", body: "Take a moment to continue your reading with OurQuran." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: ID },
    });
  });
  queue = work;
  return work;
}

export function ReminderScheduler() {
  const { account, hydrated } = useAccount();
  const { user } = useAuth();
  const { enabled, time } = account.settings.notifications;
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    let clearHandler: (() => void) | undefined;
    void import("@/src/lib/local-notifications").then((Notifications) => {
      if (!active) return;
      Notifications.setNotificationHandler({ handleNotification: async () => ({
        shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
      }) });
      clearHandler = () => Notifications.setNotificationHandler(null);
    }).catch((error) => console.warn("Reminder handler unavailable:", error.message));
    return () => { active = false; clearHandler?.(); };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const refresh = () => { void configureReminder(enabled, time).catch((error) => console.warn("Reminder unavailable:", error.message)); };
    refresh();
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") refresh(); });
    return () => sub.remove();
  }, [hydrated, enabled, time, user?.uid]);
  return null;
}
