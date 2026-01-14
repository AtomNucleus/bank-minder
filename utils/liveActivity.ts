import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

/**
 * Types for Live Activity and Notifications
 */
export interface ShiftActivityData {
  shiftId: string;
  startTime: number;
  endTime: number;
  employeeName?: string;
  location?: string;
}

export interface NotificationConfig {
  sound?: boolean;
  vibrate?: boolean;
  badge?: boolean;
  priority?: 'default' | 'high' | 'max';
}

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

/**
 * Dynamic import handler for expo-activity module
 * Provides fallback support for Expo Go compatibility
 */
async function getActivityModule() {
  try {
    if (Platform.OS === 'ios') {
      const activityModule = await import('expo-activity');
      return activityModule;
    }
    return null;
  } catch (error) {
    console.warn('Live Activity module not available:', error);
    return null;
  }
}

/**
 * Configure notification handler
 * Sets up how notifications should be displayed
 */
export async function configureNotifications(
  config?: NotificationConfig
): Promise<void> {
  try {
    const defaultConfig: NotificationConfig = {
      sound: true,
      vibrate: true,
      badge: true,
      priority: 'high',
      ...config,
    };

    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        return {
          shouldShowAlert: true,
          shouldPlaySound: defaultConfig.sound ?? true,
          shouldSetBadge: defaultConfig.badge ?? true,
        };
      },
    });

    // Configure notification channels for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('shift-reminders', {
        name: 'Shift Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: defaultConfig.vibrate ? [0, 250, 250, 250] : [0],
        lightColor: '#FF1744',
        sound: defaultConfig.sound ? 'default' : null,
        enableVibrate: defaultConfig.vibrate ?? true,
        enableLights: true,
        bypassDnd: defaultConfig.priority === 'max',
      });

      await Notifications.setNotificationChannelAsync('shift-alerts', {
        name: 'Shift Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF6F00',
        sound: defaultConfig.sound ? 'default' : null,
        enableVibrate: defaultConfig.vibrate ?? true,
        bypassDnd: defaultConfig.priority === 'max',
      });
    }

    console.log('✓ Notifications configured successfully');
  } catch (error) {
    console.error('Failed to configure notifications:', error);
    throw error;
  }
}

/**
 * Request notification permissions from the user
 * Handles both iOS and Android permission requests
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
          allowCriticalAlerts: true,
        },
      });
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';

    console.log(`✓ Notification permissions: ${finalStatus}`);

    return {
      granted,
      canAskAgain: finalStatus !== 'denied',
      status: finalStatus,
    };
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: 'error',
    };
  }
}

/**
 * Start shift reminder using Live Activity (iOS 16.1+)
 * Falls back to notifications for other platforms
 */
export async function startShiftReminder(
  activityData: ShiftActivityData
): Promise<{ success: boolean; activityId?: string; notificationId?: string; message: string }> {
  try {
    // Ensure notifications are configured
    await configureNotifications();

    // Try to use Live Activity on iOS
    if (Platform.OS === 'ios') {
      try {
        const activityModule = await getActivityModule();
        
        if (activityModule?.startActivity) {
          const activityId = await activityModule.startActivity({
            id: `shift-start-${activityData.shiftId}`,
            name: 'ShiftReminderActivity',
            initialState: {
              shiftId: activityData.shiftId,
              startTime: new Date(activityData.startTime).toISOString(),
              employeeName: activityData.employeeName || 'Shift',
              location: activityData.location || 'Not specified',
              status: 'upcoming',
            },
            contentState: {
              shiftId: activityData.shiftId,
              startTime: new Date(activityData.startTime).toISOString(),
              employeeName: activityData.employeeName || 'Shift',
              location: activityData.location || 'Not specified',
              status: 'upcoming',
            },
            dismissalPolicy: {
              default: 5 * 60, // 5 minutes in seconds
              critical: 60, // 1 minute for critical
            },
          });

          console.log('✓ Live Activity started:', activityId);

          return {
            success: true,
            activityId,
            message: 'Shift reminder started via Live Activity',
          };
        }
      } catch (liveActivityError) {
        console.warn('Live Activity not available, falling back to notifications:', liveActivityError);
      }
    }

    // Fallback: Send notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Shift Starting Soon',
        body: `Your shift at ${activityData.location || 'your workplace'} starts in 15 minutes`,
        data: {
          shiftId: activityData.shiftId,
          type: 'shift-reminder',
          startTime: activityData.startTime.toString(),
        },
        sound: 'default',
        badge: 1,
      },
      trigger: {
        seconds: Math.max(1, Math.floor((activityData.startTime - Date.now()) / 1000) - 900), // 15 minutes before
      },
    });

    console.log('✓ Shift reminder notification scheduled:', notificationId);

    return {
      success: true,
      notificationId,
      message: 'Shift reminder scheduled via notification',
    };
  } catch (error) {
    console.error('Failed to start shift reminder:', error);
    return {
      success: false,
      message: `Failed to start shift reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * End shift reminder using Live Activity (iOS 16.1+)
 * Falls back to notifications for other platforms
 */
export async function endShiftReminder(
  activityData: ShiftActivityData
): Promise<{ success: boolean; activityId?: string; notificationId?: string; message: string }> {
  try {
    // Ensure notifications are configured
    await configureNotifications();

    // Try to update or create Live Activity on iOS
    if (Platform.OS === 'ios') {
      try {
        const activityModule = await getActivityModule();

        if (activityModule?.startActivity || activityModule?.updateActivity) {
          const activityId = `shift-end-${activityData.shiftId}`;

          // Try to update existing activity
          if (activityModule.updateActivity) {
            await activityModule.updateActivity({
              id: activityId,
              state: {
                shiftId: activityData.shiftId,
                endTime: new Date(activityData.endTime).toISOString(),
                employeeName: activityData.employeeName || 'Shift',
                location: activityData.location || 'Not specified',
                status: 'ending-soon',
              },
              contentState: {
                shiftId: activityData.shiftId,
                endTime: new Date(activityData.endTime).toISOString(),
                employeeName: activityData.employeeName || 'Shift',
                location: activityData.location || 'Not specified',
                status: 'ending-soon',
              },
            });

            console.log('✓ Live Activity updated:', activityId);

            return {
              success: true,
              activityId,
              message: 'Shift reminder updated via Live Activity',
            };
          }

          // Fallback to creating new activity
          if (activityModule.startActivity) {
            const newActivityId = await activityModule.startActivity({
              id: activityId,
              name: 'ShiftEndReminderActivity',
              initialState: {
                shiftId: activityData.shiftId,
                endTime: new Date(activityData.endTime).toISOString(),
                employeeName: activityData.employeeName || 'Shift',
                location: activityData.location || 'Not specified',
                status: 'ending-soon',
              },
              contentState: {
                shiftId: activityData.shiftId,
                endTime: new Date(activityData.endTime).toISOString(),
                employeeName: activityData.employeeName || 'Shift',
                location: activityData.location || 'Not specified',
                status: 'ending-soon',
              },
              dismissalPolicy: {
                default: 3 * 60, // 3 minutes in seconds
                critical: 30, // 30 seconds for critical
              },
            });

            console.log('✓ Live Activity created:', newActivityId);

            return {
              success: true,
              activityId: newActivityId,
              message: 'End shift reminder started via Live Activity',
            };
          }
        }
      } catch (liveActivityError) {
        console.warn('Live Activity update failed, falling back to notifications:', liveActivityError);
      }
    }

    // Fallback: Send notification
    const timeUntilEnd = activityData.endTime - Date.now();
    const triggerSeconds = Math.max(1, Math.floor(timeUntilEnd / 1000) - 900); // 15 minutes before end

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Shift Ending Soon',
        body: `Your shift at ${activityData.location || 'your workplace'} will end in 15 minutes`,
        data: {
          shiftId: activityData.shiftId,
          type: 'shift-end-reminder',
          endTime: activityData.endTime.toString(),
        },
        sound: 'default',
        badge: 1,
      },
      trigger: {
        seconds: triggerSeconds,
      },
    });

    console.log('✓ End shift reminder notification scheduled:', notificationId);

    return {
      success: true,
      notificationId,
      message: 'End shift reminder scheduled via notification',
    };
  } catch (error) {
    console.error('Failed to end shift reminder:', error);
    return {
      success: false,
      message: `Failed to end shift reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Cancel a specific Live Activity or notification
 */
export async function cancelShiftReminder(
  shiftId: string,
  type: 'start' | 'end' = 'start'
): Promise<{ success: boolean; message: string }> {
  try {
    // Try to dismiss Live Activity on iOS
    if (Platform.OS === 'ios') {
      try {
        const activityModule = await getActivityModule();
        
        if (activityModule?.dismissActivity) {
          const activityId = `shift-${type}-${shiftId}`;
          await activityModule.dismissActivity({
            id: activityId,
            dismissalPolicy: {
              default: 0,
              critical: 0,
            },
          });

          console.log('✓ Live Activity dismissed:', activityId);
          return {
            success: true,
            message: 'Shift reminder cancelled via Live Activity',
          };
        }
      } catch (error) {
        console.warn('Failed to dismiss Live Activity:', error);
      }
    }

    // Fallback: Cancel scheduled notifications
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const relevantNotifications = allNotifications.filter(
      (notif) => notif.content.data?.shiftId === shiftId
    );

    for (const notif of relevantNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

    console.log(`✓ Cancelled ${relevantNotifications.length} notifications for shift ${shiftId}`);

    return {
      success: true,
      message: `Shift reminder cancelled (${relevantNotifications.length} notifications removed)`,
    };
  } catch (error) {
    console.error('Failed to cancel shift reminder:', error);
    return {
      success: false,
      message: `Failed to cancel shift reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get all active shift reminders
 */
export async function getActiveShiftReminders(): Promise<{
  notifications: Notifications.NotificationRequest[];
  total: number;
}> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    const shiftNotifications = notifications.filter(
      (notif) => notif.content.data?.type?.includes('shift')
    );

    console.log(`✓ Retrieved ${shiftNotifications.length} active shift reminders`);

    return {
      notifications: shiftNotifications,
      total: shiftNotifications.length,
    };
  } catch (error) {
    console.error('Failed to get active shift reminders:', error);
    return {
      notifications: [],
      total: 0,
    };
  }
}

/**
 * Initialize Live Activity support
 * Should be called during app startup
 */
export async function initializeLiveActivitySupport(): Promise<{
  liveActivitySupported: boolean;
  notificationsSupported: boolean;
  message: string;
}> {
  try {
    let liveActivitySupported = false;
    let notificationsSupported = false;

    // Check Live Activity support (iOS 16.1+)
    if (Platform.OS === 'ios') {
      try {
        const activityModule = await getActivityModule();
        liveActivitySupported = Boolean(activityModule?.startActivity);
      } catch {
        liveActivitySupported = false;
      }
    }

    // Check notifications support
    try {
      const permissionStatus = await Notifications.getPermissionsAsync();
      notificationsSupported = true;
    } catch {
      notificationsSupported = false;
    }

    // Configure notifications as fallback
    if (notificationsSupported) {
      await configureNotifications();
    }

    const message = `Live Activity: ${liveActivitySupported ? 'Supported' : 'Not Supported'} | Notifications: ${notificationsSupported ? 'Supported' : 'Not Supported'}`;
    console.log(`✓ ${message}`);

    return {
      liveActivitySupported,
      notificationsSupported,
      message,
    };
  } catch (error) {
    console.error('Failed to initialize Live Activity support:', error);
    return {
      liveActivitySupported: false,
      notificationsSupported: false,
      message: `Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
