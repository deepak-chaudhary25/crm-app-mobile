import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/auth';
import { authApi } from '../services/api';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

const REMEMBER_ME_KEY = 'REMEMBERED_EMAIL';

export const LoginScreen = () => {
    const navigation = useNavigation<any>();
    const { colors, isDark } = useAppTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        const loadRememberedEmail = async () => {
            try {
                const savedEmail = await AsyncStorage.getItem(REMEMBER_ME_KEY);
                if (savedEmail) {
                    setEmail(savedEmail);
                    setRememberMe(true);
                }
            } catch (error) {
                console.error('Failed to load remembered email', error);
            }
        };
        loadRememberedEmail();
    }, []);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            const success = await authService.login(email.trim(), password);
            if (success) {
                // Handle Remember Me
                if (rememberMe) {
                    await AsyncStorage.setItem(REMEMBER_ME_KEY, email.trim());
                } else {
                    await AsyncStorage.removeItem(REMEMBER_ME_KEY);
                }

                // Navigate to MainTabs
                navigation.replace('MainTabs');
            } else {
                throw new Error('Login failed');
            }
        } catch (error: any) {
            console.error('Login Failed', error);
            Alert.alert('Login Failed', error.message || 'Invalid credentials or network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerContainer}>
                        <Image
                            source={require('../assets/images/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={[styles.title, { color: colors.textPrimary }]}>CRM App</Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Welcome Back</Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                            Sign in to continue
                        </Text>

                        <View style={styles.form}>
                            <Input
                                label="Email"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <Input
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                rightIcon={showPassword ? "eye-off" : "eye"}
                                onRightIconPress={() => setShowPassword(!showPassword)}
                            />

                            <View style={styles.rememberMeContainer}>
                                <Checkbox
                                    value={rememberMe}
                                    onValueChange={setRememberMe}
                                    label="Remember Me"
                                />
                            </View>

                            <Button
                                title="Login"
                                onPress={handleLogin}
                                loading={loading}
                                style={styles.button}
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // center content
        justifyContent: 'center',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: scale(24),
        paddingVertical: verticalScale(40),
        justifyContent: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: verticalScale(40),
    },
    logo: {
        width: moderateScale(60),
        height: moderateScale(60),
        marginBottom: verticalScale(12),
    },
    title: {
        fontSize: moderateScale(20),
        fontWeight: '700',
    },
    card: {
        borderRadius: moderateScale(16),
        padding: moderateScale(24),
    },
    cardTitle: {
        fontSize: moderateScale(24),
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: verticalScale(8),
    },
    cardSubtitle: {
        fontSize: moderateScale(14),
        textAlign: 'center',
        marginBottom: verticalScale(32),
    },
    form: {
        width: '100%',
    },
    rememberMeContainer: {
        //marginBottom: verticalScale(5),
        //marginTop: verticalScale(5),
    },
    button: {
        marginTop: verticalScale(5),
    },
});
