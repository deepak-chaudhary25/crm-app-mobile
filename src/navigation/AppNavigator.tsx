
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { LeadDetailScreen } from '../screens/LeadDetailScreen';
import { LeadScreen } from '../screens/LeadScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { LeadHistoryScreen } from '../screens/LeadHistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';


import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';

export const navigationRef = createNavigationContainerRef<any>();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
    const { colors } = useAppTheme();
    const insets = useSafeAreaInsets();

    // Calculate tab bar height based on safe area
    // Base height is 60, plus the bottom inset (e.g., for home indicator or gesture nav)
    const tabBarHeight = 60 + (Platform.OS === 'ios' ? insets.bottom : insets.bottom > 0 ? insets.bottom : 10);

    // Padding bottom needs to accommodate the inset, or default to some padding
    const paddingBottom = Platform.OS === 'ios' ? insets.bottom : insets.bottom > 0 ? insets.bottom : 8;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.tabBar,
                    borderTopColor: colors.border,
                    height: tabBarHeight,
                    paddingBottom: paddingBottom,
                    paddingTop: 8,
                    // Add some elevation/shadow for Android to ensure separation if transparent nav
                    elevation: 8,
                },
                tabBarActiveTintColor: colors.tabBarActive,
                tabBarInactiveTintColor: colors.tabBarInactive,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = 'alert-circle';

                    if (route.name === 'Leads') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'History') {
                        iconName = focused ? 'time' : 'time-outline';
                    } else if (route.name === 'Home') {
                        iconName = focused ? 'grid' : 'grid-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }

                    return <Icon name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={LeadScreen} />
            <Tab.Screen name="Leads" component={LeadScreen} />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{ tabBarLabel: 'History' }}
            />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

export const AppNavigator = () => {
    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{
                    headerShown: false,
                    animation: 'fade', // Smooth transition
                }}
            >
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen
                    name="LeadDetail"
                    component={LeadDetailScreen}
                    options={{ animation: 'slide_from_right' }} // iOS style push
                />
                <Stack.Screen
                    name="LeadHistory"
                    component={LeadHistoryScreen}
                    options={{ animation: 'slide_from_right' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
