// Ported from lib/notifications/notification_service.dart
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Foreground presentation (Flutter showed heads-up notifications via channel importance).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private initialised = false;

  /** Create the Android channel + ask permission (equivalent of init()). */
  async init(): Promise<void> {
    if (this.initialised) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('cashback_channel', {
        name: 'Cashback Notifications',
        description: 'Reminders for cashback after 90 days',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    this.initialised = true;
  }

  /** Ask the user for notification permission once. Returns true if granted. */
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  }

  /** Fire an immediate notification. */
  async showNotification(title: string, body: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  }

  /**
   * Schedule a notification for `date` (only if it is in the future),
   * mirroring scheduleNotification() in the Dart service.
   */
  async scheduleNotification(
    title: string,
    body: string,
    date: Date
  ): Promise<string | null> {
    if (date.getTime() <= Date.now()) {
      console.log('⛔ Skipped scheduling: Date is in the past.');
      return null;
    }
    return Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        channelId: 'cashback_channel',
        date,
      },
    });
  }
}

export const notificationService = new NotificationService();
