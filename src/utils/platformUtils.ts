/**
 * platformUtils.ts
 *
 * Cross-platform utility helpers to abstract Android-specific APIs.
 * Always import showToast from here — never use ToastAndroid directly.
 */
import { Platform, ToastAndroid, Alert } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

/**
 * Cross-platform toast message.
 * - Android: native ToastAndroid
 * - iOS: Alert with empty title (closest equivalent without a 3rd-party library)
 */
export const showToast = (message: string, duration: 'SHORT' | 'LONG' = 'SHORT'): void => {
    if (Platform.OS === 'android') {
        ToastAndroid.show(
            message,
            duration === 'SHORT' ? ToastAndroid.SHORT : ToastAndroid.LONG
        );
    } else {
        // iOS has no native toast — show a non-blocking alert
        Alert.alert('', message, [{ text: 'OK' }]);
    }
};
