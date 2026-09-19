// SDK 57's root expo-notifications export eagerly registers a push-token
// listener, which throws in Android Expo Go. Our reminders are local only.
// Keep these SDK-specific entry points together and check their dependency
// graph in prelaunch-check.cjs whenever expo-notifications is upgraded.
export { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
export { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
export { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";
export { getPermissionsAsync, requestPermissionsAsync } from "expo-notifications/build/NotificationPermissions";
export { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
export { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
export { SchedulableTriggerInputTypes } from "expo-notifications/build/Notifications.types";
