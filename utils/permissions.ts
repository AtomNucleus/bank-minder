/**
 * Permissions utility module for requesting camera and notification permissions
 */

/**
 * Request camera permission from the user
 * @returns Promise that resolves to true if permission is granted, false otherwise
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    // Stop all tracks to release the camera
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission denied or unavailable:', error);
    return false;
  }
}

/**
 * Request notification permission from the user
 * @returns Promise that resolves to the permission status
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications are not supported in this browser');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  return Notification.permission;
}

/**
 * Check if camera permission is already granted
 * @returns Promise that resolves to true if permission is granted
 */
export async function isCameraPermissionGranted(): Promise<boolean> {
  try {
    const result = await navigator.permissions.query({ name: 'camera' });
    return result.state === 'granted';
  } catch (error) {
    console.warn('Unable to query camera permission:', error);
    return false;
  }
}

/**
 * Check if notification permission is already granted
 * @returns true if permission is granted
 */
export function isNotificationPermissionGranted(): boolean {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Request both camera and notification permissions
 * @returns Promise that resolves to an object with both permission statuses
 */
export async function requestAllPermissions(): Promise<{
  camera: boolean;
  notification: NotificationPermission;
}> {
  const [cameraGranted, notificationPermission] = await Promise.all([
    requestCameraPermission(),
    requestNotificationPermission(),
  ]);

  return {
    camera: cameraGranted,
    notification: notificationPermission,
  };
}
