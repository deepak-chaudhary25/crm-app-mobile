
import { PermissionsAndroid, Platform } from 'react-native';
import CallLog from 'react-native-call-log';

export interface CallLogEntry {
    phoneNumber: string;
    callType: string; // "INCOMING", "OUTGOING", "MISSED"
    duration: number; // in seconds
    timestamp: number;
    dateTime: string;
}

export const callLogService = {
    requestPermission: async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return false;

        try {
            const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
            if (hasPermission) return true;

            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
                {
                    title: 'Call Log Access',
                    message: 'App needs access to call logs to track lead interactions.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err: any) {
            if (!err?.message?.includes('not attached to an Activity')) {
                console.warn(err);
            }
            return false;
        }
    },

    getLastCall: async (targetNumber: string): Promise<CallLogEntry | null> => {
        try {
            const hasPermission = await callLogService.requestPermission();
            if (!hasPermission) {
                return null;
            }

            // Get last 5 calls just to be safe (sometimes logs take a second to write)
            const logs = await CallLog.load(5);

            if (!logs || logs.length === 0) return null;

            // Normalize target number (remove non-digits)
            const cleanTarget = targetNumber.replace(/\D/g, '');

            // Find the most recent call matching our number
            // We check the last 2 hours to ensure even long calls are found
            const now = Date.now();
            const TWO_HOURS = 2 * 60 * 60 * 1000;

            const relevantLog = logs.find((log: any) => {
                const logTime = parseInt(log.timestamp);
                const isRecent = (now - logTime) < TWO_HOURS; // Call ended recently
                const cleanLogNumber = log.phoneNumber.replace(/\D/g, '');

                // Match last 10 digits to ignore country code differences
                const isMatch = cleanLogNumber.slice(-10) === cleanTarget.slice(-10);

                return isRecent && isMatch;
            });

            if (relevantLog) {
                return {
                    phoneNumber: relevantLog.phoneNumber,
                    callType: relevantLog.type, // "INCOMING", "OUTGOING", "MISSED"
                    duration: parseInt(String(relevantLog.duration)),
                    timestamp: parseInt(String(relevantLog.timestamp)),
                    dateTime: relevantLog.dateTime
                };
            }

            return null;

        } catch (e) {
            console.error('Failed to get call log', e);
            return null;
        }
    }
};
