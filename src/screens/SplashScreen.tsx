
import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import { useAppTheme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/auth';
import { moderateScale } from '../utils/responsive';

export const SplashScreen = () => {
    const navigation = useNavigation<any>();
    const { colors, isDark } = useAppTheme();

    useEffect(() => {
        const checkAuth = async () => {
            // Add minimum delay to show logo
            await new Promise(resolve => setTimeout(() => resolve(true), 2000));

            const token = await authService.getToken();
            if (token) {
                navigation.replace('MainTabs');
            } else {
                navigation.replace('Login');
            }
        };

        checkAuth();
    }, [navigation]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar
                backgroundColor={colors.background}
                barStyle={isDark ? 'light-content' : 'dark-content'}
            />
            <View style={styles.logoContainer}>
                <Image
                    source={require('../assets/images/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        width: moderateScale(200),
        height: moderateScale(200),
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: '100%',
        height: '100%',
    },
});
