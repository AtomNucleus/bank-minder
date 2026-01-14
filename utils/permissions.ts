import { Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

/**
 * Request camera and notifications permissions
 * Handles platform-specific permission requests for Android and iOS
 */
export const requestAllPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      return await requestAndroidPermissions();
    } else if (Platform.OS === 'ios') {
      return await requestIOSPermissions();
    }
    return true;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
};

/**
 * Request Android-specific permissions
 */
const requestAndroidPermissions = async (): Promise<boolean> => {
  try {
    const cameraResult = await request(PERMISSIONS.ANDROID.CAMERA);
    const notificationResult = await request(
      PERMISSIONS.ANDROID.POST_NOTIFICATIONS
    );

    const cameraGranted = cameraResult === RESULTS.GRANTED;
    const notificationGranted = notificationResult === RESULTS.GRANTED;

    return cameraGranted && notificationGranted;
  } catch (error) {
    console.error('Error requesting Android permissions:', error);
    return false;
  }
};

/**
 * Request iOS-specific permissions
 */
const requestIOSPermissions = async (): Promise<boolean> => {
  try {
    const cameraResult = await request(PERMISSIONS.IOS.CAMERA);
    const notificationResult = await request(PERMISSIONS.IOS.NOTIFICATIONS);

    const cameraGranted = cameraResult === RESULTS.GRANTED;
    const notificationGranted = notificationResult === RESULTS.GRANTED;

    return cameraGranted && notificationGranted;
  } catch (error) {
    console.error('Error requesting iOS permissions:', error);
    return false;
  }
};
