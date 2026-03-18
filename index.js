/**
 * @format
 */

import { AppRegistry, Linking } from 'react-native';
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
            console.log('🔗 [Notification] Opening Background Deep Link:', url);
            // In Android, opening a URL from background using Linking might need special config 
            // but react-navigation deep links usually handle it on cold initialURL or Linking event.
            // When app starts from cold state due to notification click, it usually passes through Linking.
            Linking.openURL(url).catch(() => { });
        }
    }
});

AppRegistry.registerComponent(appName, () => App);
