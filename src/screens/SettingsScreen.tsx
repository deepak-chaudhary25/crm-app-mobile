
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';
import { authService } from '../services/auth';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { useNavigation, CommonActions } from '@react-navigation/native';

export const SettingsScreen = () => {
    const { colors, themeMode, setThemeMode } = useAppTheme();
    const navigation = useNavigation();
    const [themeModalVisible, setThemeModalVisible] = useState(false);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await authService.logout();
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            })
                        );
                    },
                },
            ]
        );
    };

    const SettingItem = ({ icon, label, onPress, isDestructive = false, value }: any) => (
        <TouchableOpacity
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={onPress}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDestructive ? colors.error + '20' : colors.inputBackground }]}>
                    <Icon
                        name={icon}
                        size={20}
                        color={isDestructive ? colors.error : colors.primary}
                    />
                </View>
                <Text style={[styles.itemText, { color: isDestructive ? colors.error : colors.textPrimary }]}>
                    {label}
                </Text>
            </View>
            <View style={styles.itemRight}>
                {value && <Text style={[styles.itemValue, { color: colors.textSecondary }]}>{value}</Text>}
                <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    const getThemeLabel = (mode: string) => {
        switch (mode) {
            case 'light': return 'Light Mode';
            case 'dark': return 'Dark Mode';
            case 'system': return 'System Default';
            default: return 'System Default';
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <SettingItem icon="person-outline" label="Account Profile" onPress={() => { }} />
                    <SettingItem
                        icon="color-palette-outline"
                        label="Appearance"
                        onPress={() => setThemeModalVisible(true)}
                        value={getThemeLabel(themeMode)}
                    />
                    <SettingItem icon="notifications-outline" label="Notifications" onPress={() => { }} />
                    {/* <SettingItem icon="lock-closed-outline" label="Security" onPress={() => { }} /> */}
                    {/* <SettingItem icon="globe-outline" label="Language" onPress={() => { }} /> */}
                </View>

                <View style={[styles.section, { backgroundColor: colors.card, marginTop: 24 }]}>
                    <SettingItem icon="help-circle-outline" label="Help & Support" onPress={() => { }} />
                    <SettingItem icon="information-circle-outline" label="About App" onPress={() => { }} />
                </View>

                <View style={[styles.section, { backgroundColor: colors.card, marginTop: 24 }]}>
                    <SettingItem
                        icon="log-out-outline"
                        label="Logout"
                        onPress={handleLogout}
                        isDestructive
                    />
                </View>

                <Text style={[styles.version, { color: colors.textSecondary }]}>
                    Version 1.0.0
                </Text>
            </ScrollView>

            {/* Theme Selection Modal */}
            <Modal
                transparent
                visible={themeModalVisible}
                animationType="fade"
                onRequestClose={() => setThemeModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setThemeModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Choose Theme</Text>

                        {['system', 'light', 'dark'].map((mode) => (
                            <TouchableOpacity
                                key={mode}
                                style={[styles.modalOption, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    setThemeMode(mode as any);
                                    setThemeModalVisible(false);
                                }}
                            >
                                <Text style={[
                                    styles.modalOptionText,
                                    { color: themeMode === mode ? colors.primary : colors.textPrimary, fontWeight: themeMode === mode ? '700' : '400' }
                                ]}>
                                    {getThemeLabel(mode)}
                                </Text>
                                {themeMode === mode && <Icon name="checkmark" size={20} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(16),
    },
    headerTitle: {
        fontSize: moderateScale(24),
        fontWeight: '700',
    },
    content: {
        padding: scale(20),
    },
    section: {
        borderRadius: moderateScale(12),
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: scale(16),
        borderBottomWidth: 1,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemValue: {
        fontSize: moderateScale(14),
        marginRight: scale(8),
    },
    iconContainer: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    itemText: {
        fontSize: moderateScale(16),
        fontWeight: '500',
    },
    version: {
        textAlign: 'center',
        marginTop: verticalScale(32),
        fontSize: moderateScale(14),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: scale(40),
    },
    modalContent: {
        borderRadius: moderateScale(16),
        padding: scale(20),
    },
    modalTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        marginBottom: verticalScale(16),
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: verticalScale(16),
        borderBottomWidth: 1,
    },
    modalOptionText: {
        fontSize: moderateScale(16),
    },
    // New Profile Styles
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(32),
    },
    avatar: {
        width: moderateScale(64),
        height: moderateScale(64),
        borderRadius: moderateScale(32),
        marginRight: scale(16),
    },
    avatarPlaceholder: {
        width: moderateScale(64),
        height: moderateScale(64),
        borderRadius: moderateScale(32),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(16),
    },
    profileInfo: {
        flex: 1,
    },
    name: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        marginBottom: verticalScale(4),
    },
    role: {
        fontSize: moderateScale(14),
    },
    userId: {
        fontSize: moderateScale(12),
        opacity: 0.7,
        marginTop: verticalScale(2),
    },
});
