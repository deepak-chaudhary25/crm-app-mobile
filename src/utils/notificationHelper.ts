import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';

class NotificationHelper {
    constructor() {
        this.init();
    }

    async init() {
        await this.createChannel();
        await this.requestPermission();
    }

    async createChannel() {
        if (Platform.OS === 'android') {
            await notifee.createChannel({
                id: 'lead-reminders',
                name: 'Lead Reminders',
                importance: AndroidImportance.HIGH,
                sound: 'default',
                vibration: true,
            });
        }
    }

    async requestPermission() {
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            await notifee.requestPermission();
        } else if (Platform.OS === 'ios') {
            await notifee.requestPermission();
        }
    }

    async displayNotification(title: string, body: string, data?: any) {
        // Ensure channel exists
        await this.createChannel();

        // Display a notification
        await notifee.displayNotification({
            title: title,
            body: body,
            data: data,
            android: {
                channelId: 'lead-reminders',
                pressAction: {
                    id: 'default',
                },
                importance: AndroidImportance.HIGH,
                smallIcon: 'ic_launcher', // fallback
            },
            ios: {
                foregroundPresentationOptions: {
                    badge: true,
                    sound: true,
                    banner: true,
                },
            }
        });
    }
}

export const notificationHelper = new NotificationHelper();
