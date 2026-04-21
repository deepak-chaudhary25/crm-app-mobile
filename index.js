/**
 * @format
 */

import { AppRegistry, Linking, Platform } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Handle background notification events
notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
        // User pressed the notification
        const data = detail.notification?.data;
        if (data?.url) {
            let url = data.url;
            if (url.includes('{leadId}') && data.leadId) {
                url = url.replace('{leadId}', data.leadId);
            }
            // In Android, opening a URL from background using Linking might need special config 
            // but react-navigation deep links usually handle it on cold initialURL or Linking event.
            // When app starts from cold state due to notification click, it usually passes through Linking.
            Linking.openURL(url).catch(() => { });
        }
    }
});

// Register a long-running foreground service to keep the JS engine alive (Android-only).
// iOS does not support foreground services — socket reconnection is handled via AppState events.
if (Platform.OS === 'android') {
    notifee.registerForegroundService((_notification) => {
        return new Promise(() => {
            // This promise never resolves, keeping the JS engine awake.
            // It allows socket.io to maintain connections in the background.
        });
    });
}

AppRegistry.registerComponent(appName, () => App);
