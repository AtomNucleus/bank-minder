import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let LiveActivity: any;

/**
 * Starts a shift reminder using Live Activity on iOS or falls back to a persistent notification.
 * Live Activities require an EAS development build; this function gracefully degrades to
 * notifications when running in Expo Go.
 *
 * @param checkInId - Unique identifier for the shift
 * @param shiftData - Shift details (title, subtitle, etc.)
 * @returns Object indicating which reminder type was started
 */
export async function startShiftReminder(
  checkInId: string,
  shiftData?: {
    title?: string;
    subtitle?: string;
    amount?: number;
  }
) {
  try {
    // Attempt to use Live Activity on iOS (only works in EAS builds, not Expo Go)
    if (Platform.OS === 'ios') {
      try {
        // Dynamic import to prevent crashes in Expo Go
        LiveActivity = LiveActivity ?? (await import('expo-live-activity'));

        if (LiveActivity?.startActivity) {
          const result = await LiveActivity.startActivity(
            {
              title: shiftData?.title || 'Shift Active',
              subtitle:
                shiftData?.subtitle || 'Deposit the bank before leaving!',
              amount: shiftData?.amount || 0,
            },
            {
              activityId: checkInId,
              appURL:
                'hotelbanktrackertracker://complete-deposit?checkInId=' +
                checkInId,
            }
          );

          console.log('Live Activity started:', result);
          return { type: 'live-activity', id: checkInId };
        }
      } catch (liveActivityError) {
        console.warn(
          'Live Activity not available (running in Expo Go?), falling back to notifications:',
          liveActivityError
        );
      }
    }

    // Fallback: Use persistent local notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: shiftData?.title || 'Shift Active: Deposit the bank!',
        body:
          shiftData?.subtitle ||
          'Tap to complete your deposit and mark the shift as finished.',
        data: {
          checkInId,
          type: 'shift_reminder',
        },
        sound: 'default',
        badge: 1,
      },
      trigger: null, // Immediate notification, persists until dismissed
    });

    console.log('Persistent notification scheduled:', notificationId);
    return { type: 'notification', id: notificationId };
  } catch (error) {
    console.error('Failed to start shift reminder:', error);
    throw new Error('Could not start shift reminder');
  }
}

/**
 * Ends a shift reminder by stopping the Live Activity or dismissing the notification.
 *
 * @param checkInId - Unique identifier for the shift
 * @param notificationId - Optional ID of the scheduled notification to dismiss
 */
export async function endShiftReminder(
  checkInId: string,
  notificationId?: string
) {
  try {
    // Attempt to end Live Activity (no-op if not available)
    if (Platform.OS === 'ios') {
      try {
        LiveActivity = LiveActivity ?? (await import('expo-live-activity'));
        if (LiveActivity?.endActivity) {
          await LiveActivity.endActivity(checkInId);
          console.log('Live Activity ended:', checkInId);
        }
      } catch (error) {
        console.warn('Could not end Live Activity:', error);
      }
    }

    // Dismiss all notifications as fallback
    // Note: In production, you may want to track notification IDs to dismiss only specific ones
    await Notifications.dismissAllNotificationsAsync();
    console.log('Notifications dismissed');
  } catch (error) {
    console.error('Failed to end shift reminder:', error);
  }
}

/**
 * Configure the notification handler for the app.
 * This should be called once during app initialization.
 */
export async function configureNotifications() {
  try {
    // Set the notification handler behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Listen for notifications when app is in foreground
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { data } = response.notification.content;
        console.log('Notification response received:', data);
        // Handle deep linking here if needed
      }
    );

    return () => subscription.remove();
  } catch (error) {
    console.error('Failed to configure notifications:', error);
  }
}

/**
 * Request user permission for notifications.
 */
export async function requestNotificationPermissions() {
  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    console.log('Notification permission status:', status);
    return status === 'granted';
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
}