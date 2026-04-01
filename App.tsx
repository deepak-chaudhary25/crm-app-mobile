
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { CallHandlingProvider } from './src/context/CallHandlingContext';

function App(): React.JSX.Element {
  useEffect(() => {
    return notifee.onForegroundEvent(({ type, detail }) => {
      switch (type) {
        case EventType.PRESS:
          const data = detail.notification?.data;
          if (data?.url) {
            let url = data.url as string;
            if (url.includes('{leadId}') && data.leadId) {
              url = url.replace('{leadId}', data.leadId as string);
            }
            Linking.openURL(url).catch(err => console.error('Deep Link Error:', err));
          }
          break;
      }
    });
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <CallHandlingProvider>
          <AppNavigator />
        </CallHandlingProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default App;
