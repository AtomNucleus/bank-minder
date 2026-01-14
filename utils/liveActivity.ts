/**
 * Live Activity and Notification Fallback Logic
 * Handles iOS Live Activities with graceful fallback to standard notifications
 * for devices that don't support Live Activities (iOS < 16.1)
 */

import * as Notifications from 'expo-notifications';
import { ActivityError, NotificationError } from '../types/errors';

// Types for Live Activity attributes and state
export interface LiveActivityAttributes {
  accountName: string;
  bankName: string;
  transactionId: string;
}

export interface LiveActivityState {
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
  merchantName?: string;
  category?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
}

/**
 * Check if the device supports Live Activities
 * Live Activities are supported on iOS 16.1 and later
 */
export const isLiveActivitySupported = (): boolean => {
  try {
    // Check if running on iOS and iOS version supports Live Activities
    if (typeof window === 'undefined') return false;
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return false;

    // iOS version 16.1 or later required
    const iOSVersionMatch = navigator.userAgent.match(/OS (\d+)_(\d+)/);
    if (!iOSVersionMatch) return false;

    const [, major, minor] = iOSVersionMatch;
    const majorVersion = parseInt(major, 10);
    const minorVersion = parseInt(minor, 10);

    return majorVersion > 16 || (majorVersion === 16 && minorVersion >= 1);
  } catch (error) {
    console.warn('Error checking Live Activity support:', error);
    return false;
  }
};

/**
 * Start a Live Activity with fallback to notifications
 * @param attributes - Live Activity attributes (account and transaction info)
 * @param state - Initial Live Activity state (amount, status, etc.)
 * @returns Promise with activity ID or notification ID
 */
export const startLiveActivity = async (
  attributes: LiveActivityAttributes,
  state: LiveActivityState
): Promise<{ id: string; type: 'liveActivity' | 'notification' }> => {
  try {
    // Check if Live Activities are supported
    if (isLiveActivitySupported()) {
      try {
        // Attempt to start Live Activity
        const activityId = await startNativeLiveActivity(attributes, state);
        return { id: activityId, type: 'liveActivity' };
      } catch (error) {
        console.warn('Failed to start Live Activity, falling back to notification:', error);
        // Fall through to notification fallback
      }
    }

    // Fallback to notification if Live Activities not supported or failed
    const notificationId = await sendTransactionNotification(
      {
        title: `${attributes.bankName} - Transaction`,
        body: `${state.status === 'pending' ? 'Processing' : state.status} transaction of ${state.currency} ${state.amount} from ${attributes.accountName}`,
        data: {
          accountName: attributes.accountName,
          bankName: attributes.bankName,
          transactionId: attributes.transactionId,
          amount: state.amount,
          currency: state.currency,
          status: state.status,
          merchantName: state.merchantName,
          category: state.category,
        },
      },
      true
    );

    return { id: notificationId, type: 'notification' };
  } catch (error) {
    const activityError = new ActivityError(
      'Failed to start Live Activity or send notification',
      error instanceof Error ? error.message : String(error)
    );
    console.error('Error in startLiveActivity:', activityError);
    throw activityError;
  }
};

/**
 * Update an existing Live Activity
 * @param activityId - ID of the Live Activity to update
 * @param state - New Live Activity state
 * @returns Promise<void>
 */
export const updateLiveActivity = async (
  activityId: string,
  state: LiveActivityState
): Promise<void> => {
  try {
    if (!isLiveActivitySupported()) {
      console.warn('Live Activities not supported, skipping update');
      return;
    }

    // Update native Live Activity
    await updateNativeLiveActivity(activityId, state);
  } catch (error) {
    console.error('Error updating Live Activity:', error);
    // Don't throw - Live Activity update failures shouldn't crash the app
  }
};

/**
 * End a Live Activity
 * @param activityId - ID of the Live Activity to end
 * @param finalState - Final state of the Live Activity
 * @returns Promise<void>
 */
export const endLiveActivity = async (
  activityId: string,
  finalState?: LiveActivityState
): Promise<void> => {
  try {
    if (!isLiveActivitySupported()) {
      console.warn('Live Activities not supported, skipping end');
      return;
    }

    await endNativeLiveActivity(activityId, finalState);
  } catch (error) {
    console.error('Error ending Live Activity:', error);
    // Don't throw - Live Activity end failures shouldn't crash the app
  }
};

/**
 * Send a transaction notification with fallback retry logic
 * @param payload - Notification payload
 * @param retry - Whether to retry on failure
 * @returns Promise with notification ID
 */
export const sendTransactionNotification = async (
  payload: NotificationPayload,
  retry: boolean = true
): Promise<string> => {
  try {
    // Request notification permissions if needed
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) {
      const { granted: requestGranted } = await Notifications.requestPermissionsAsync();
      if (!requestGranted) {
        throw new NotificationError(
          'Notification permissions not granted',
          'User denied notification permissions'
        );
      }
    }

    // Schedule immediate notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        sound: payload.sound !== false ? 'default' : null,
        data: payload.data || {},
        badge: 1,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });

    return notificationId;
  } catch (error) {
    if (retry) {
      console.warn('Notification send failed, retrying in 1 second:', error);
      // Retry after 1 second
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const notificationId = await sendTransactionNotification(payload, false);
            resolve(notificationId);
          } catch (retryError) {
            reject(retryError);
          }
        }, 1000);
      });
    }

    const notificationError = new NotificationError(
      'Failed to send notification',
      error instanceof Error ? error.message : String(error)
    );
    console.error('Error in sendTransactionNotification:', notificationError);
    throw notificationError;
  }
};

/**
 * Setup notification handlers for transaction updates
 * @param onNotificationReceived - Callback when notification is received
 * @param onNotificationTapped - Callback when user taps notification
 */
export const setupNotificationHandlers = (
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (notification: Notifications.Notification) => void
): (() => void) => {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    onNotificationReceived?.(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response.notification);
    onNotificationTapped?.(response.notification);
  });

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};

/**
 * Native Live Activity implementation
 * These functions would typically be implemented via native modules or push notifications
 */

const startNativeLiveActivity = async (
  attributes: LiveActivityAttributes,
  state: LiveActivityState
): Promise<string> => {
  // This would be implemented via native code (Swift) or push notification service
  // For now, we'll simulate it
  const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('Starting Live Activity:', { activityId, attributes, state });
  return activityId;
};

const updateNativeLiveActivity = async (
  activityId: string,
  state: LiveActivityState
): Promise<void> => {
  // This would be implemented via native code (Swift) or push notification service
  console.log('Updating Live Activity:', { activityId, state });
};

const endNativeLiveActivity = async (
  activityId: string,
  finalState?: LiveActivityState
): Promise<void> => {
  // This would be implemented via native code (Swift) or push notification service
  console.log('Ending Live Activity:', { activityId, finalState });
};

/**
 * Batch utility: Update multiple Live Activities
 * @param updates - Array of {activityId, state} objects to update
 */
export const batchUpdateLiveActivities = async (
  updates: Array<{ activityId: string; state: LiveActivityState }>
): Promise<void> => {
  try {
    await Promise.all(
      updates.map(({ activityId, state }) =>
        updateLiveActivity(activityId, state).catch((error) => {
          console.warn(`Failed to update activity ${activityId}:`, error);
          // Continue with other updates even if one fails
        })
      )
    );
  } catch (error) {
    console.error('Error in batchUpdateLiveActivities:', error);
  }
};

/**
 * Get Live Activity support info for debugging
 */
export const getLiveActivitySupportInfo = () => {
  return {
    isSupported: isLiveActivitySupported(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    platform: typeof window !== 'undefined' ? window.navigator.platform : 'N/A',
  };
};

export default {
  isLiveActivitySupported,
  startLiveActivity,
  updateLiveActivity,
  endLiveActivity,
  sendTransactionNotification,
  setupNotificationHandlers,
  batchUpdateLiveActivities,
  getLiveActivitySupportInfo,
};
