// NOTE: expo-notifications requires a native dev build (not Expo Go).
// To enable real push notifications run: npx expo run:android
// These are no-op stubs so the app builds fine in Expo Go.

export async function scheduleTaskReminders(
  _taskId: string,
  _title: string,
  _subject: string,
  _due: string,
  _time?: string
): Promise<void> {
  // no-op in Expo Go
}

export async function cancelTaskReminders(_taskId: string): Promise<void> {
  // no-op in Expo Go
}
