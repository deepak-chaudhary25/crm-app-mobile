
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, FlatList, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';
import { historyService, Interaction } from '../services/history';
import { callLogsApi, schedulesApi, leadsApi, usersApi, pcatApi } from '../services/api';
import { authService } from '../services/auth';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { ScheduleModal } from '../components/ScheduleModal';
import { useCallHandlingContext } from '../context/CallHandlingContext';
import { Linking, Alert, ToastAndroid, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

export const LeadDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { colors, isDark } = useAppTheme();

    // Handle both full object (navigation) and ID-only (deep link)
    const initialLead = route.params?.lead;
    const leadId = route.params?.leadId || initialLead?.id || initialLead?._id || initialLead?.leadId;

    // We keep initialLead for instant rendering, but always try to fetch fresh data
    const [lead, setLead] = useState<any>(initialLead || null);
    const [loading, setLoading] = useState(true); // Always true initially to ensure fetch
    const [error, setError] = useState('');

    const { handleCall: performCall } = useCallHandlingContext();

    const [modalVisible, setModalVisible] = useState(false);

    // PCAT Exam Registration
    const [ongoingExam, setOngoingExam] = useState<any>(null);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerName, setRegisterName] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerNumber, setRegisterNumber] = useState('');

    useEffect(() => {
        if (leadId) {
            fetchLeadDetails();
        } else if (!initialLead) {
            // Nothing to show, go back
            navigation.goBack();
        }
        // Fetch ongoing PCAT exam
        fetchOngoingExam();
    }, [leadId]);

    const fetchOngoingExam = async () => {
        try {
            const exam = await pcatApi.getOngoingExam();
            if (exam && exam._id) {
                setOngoingExam(exam);
            }
        } catch (err) {
            // No ongoing exam or error — button stays disabled
            setOngoingExam(null);
        }
    };

    const openRegisterModal = () => {
        // Pre-fill from lead data
        setRegisterName(lead?.name || '');
        setRegisterEmail(lead?.email || '');
        setRegisterNumber(lead?.phoneNumber || '');
        setShowRegisterModal(true);
    };

    const handleRegister = async () => {
        if (!registerName.trim() || !registerNumber.trim()) {
            Alert.alert('Missing Info', 'Name and Phone number are required.');
            return;
        }
        setRegisterLoading(true);
        try {
            await pcatApi.registerUser({
                examId: ongoingExam._id,
                name: registerName.trim(),
                email: registerEmail.trim(),
                number: registerNumber.trim(),
            });
            setShowRegisterModal(false);
            Alert.alert('Success', 'Registered successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Registration failed');
        } finally {
            setRegisterLoading(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const getInitialsColor = (name: string) => {
        const colors = ['#FEF3C7', '#DBEAFE', '#F3F4F6', '#FEE2E2', '#E0E7FF', '#D1FAE5'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const fetchLeadDetails = async () => {
        try {
            const data = await leadsApi.getLead(leadId);


            // Fetch users to resolve assignedTo name, same as LeadScreen
            let assignedName = data.assignedTo?.name || data.assignedTo;
            try {
                const hasUserPermission = await authService.hasPermission('user', 'read');

                // data.assignedTo might be an object or a string depending on backend population
                const assignedToId = typeof data.assignedTo === 'object' ? data.assignedTo?._id || data.assignedTo?.id : data.assignedTo;

                if (hasUserPermission && typeof assignedToId === 'string') {
                    const res = await usersApi.getUsers();
                    // React native APIs sometimes double-wrap in data, or the response IS the array
                    const usersList = Array.isArray(res) ? res : (res?.data?.users || res?.data || []);

                    const assignedUser = usersList.find((u: any) => u._id === assignedToId || u.id === assignedToId);
                    if (assignedUser) {
                        assignedName = assignedUser.name;
                    }
                }
            } catch (userErr) {
                console.warn('Failed to fetch user list for assigned name', userErr);
            }

            // Flatten/map the data just like LeadScreen so the UI works identically
            const flatLead = {
                ...data, // Spread raw data first so it doesn't overwrite our mapped fields
                id: data._id,
                _id: data._id,
                leadId: data.leadId?.toString(),
                name: data.name,
                assignedTo: assignedName || 'Unassigned',
                status: data.stageId?.name || data.status || 'New',
                score: data.healthScore || 0,
                phoneNumber: data.phone,
                email: data.email,
                initials: getInitials(data.name),
                initialsColor: getInitialsColor(data.name),
            };
            setLead(flatLead);
        } catch (err: any) {
            console.error('Failed to fetch lead details', err);
            setError(err.message || 'Failed to load lead details');
            if (!lead) {
                Alert.alert('Error', 'Could not load lead details');
                navigation.goBack();
            }
        } finally {
            setLoading(false);
        }
    };

    // IMPORTANT: All hooks must be called before these conditional returns.
    // Ensure no additional use... calls exist below this point.

    if (loading && !lead) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (!lead) {
        return null; // Should have gone back or showing loading
    }

    const handleCall = () => {
        performCall(lead.phoneNumber, {
            ...lead,
            // Ensure we pass the numeric ID correctly if it exists in route params under different keys
            leadId: lead.leadId || lead.id,
            stageId: lead.stageId?._id || lead.stageId // Correctly use the _id instead of the mapped name
        });
    };

    const handleWhatsApp = async () => {
        if (!lead.phoneNumber) {
            Alert.alert('Error', 'No phone number available');
            return;
        }

        const text = 'Hello';
        const url = `whatsapp://send?phone=${lead.phoneNumber}&text=${text}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                // Fallback to web if app is not installed
                await Linking.openURL(`https://wa.me/${lead.phoneNumber}?text=${text}`);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not open WhatsApp');
        }
    };

    const handleSchedule = () => {
        setModalVisible(true);
    };

    const handleViewHistory = () => {
        navigation.navigate('LeadHistory', {
            leadId: lead.leadId || lead.id || lead._id,
            leadName: lead.name,
            leadNumber: lead.phoneNumber
        });
    };

    const handleSaveSchedule = async (date: Date, notes: string) => {
        try {
            const idToUse = lead.leadId || lead.id || lead._id;
            const numericId = typeof idToUse === 'string' ? parseInt(idToUse, 10) : idToUse;

            if (!numericId || isNaN(numericId)) {
                throw new Error('Invalid Lead ID');
            }

            await schedulesApi.createSchedule({
                leadId: numericId,
                scheduledAt: date.toISOString(),
            });
            setModalVisible(false);
            Alert.alert('Success', 'Schedule created successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create schedule');
        }
    };





    const handleCopyEmail = () => {
        if (lead.email) {
            Clipboard.setString(lead.email);
            if (Platform.OS === 'android') {
                ToastAndroid.show('Email copied to clipboard', ToastAndroid.SHORT);
            } else {
                Alert.alert('Copied', 'Email copied to clipboard');
            }
        }
    };

    const InfoRow = ({ icon, label, value, onCopy }: { icon: string, label: string, value: string, onCopy?: () => void }) => (
        <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                <Icon name={icon} size={moderateScale(20)} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
            </View>
            {onCopy && value !== 'N/A' && (
                <TouchableOpacity onPress={onCopy} style={{ padding: scale(8) }}>
                    <Icon name="copy-outline" size={moderateScale(18)} color={colors.primary} />
                </TouchableOpacity>
            )}
        </View>
    );



    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-back" size={moderateScale(24)} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Lead Details</Text>
                <TouchableOpacity>
                    <Icon name="ellipsis-vertical" size={moderateScale(24)} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Profile Summary (Always Visible) */}
            <View style={styles.profileSummary}>
                <View style={[styles.avatarContainer, { backgroundColor: lead.initialsColor || '#E0E7FF' }]}>
                    {lead.initials ? (
                        <Text style={styles.initials}>{lead.initials}</Text>
                    ) : (
                        <Icon name="person" size={moderateScale(32)} color="#4F46E5" />
                    )}
                </View>
                <View>
                    <Text style={[styles.name, { color: colors.textPrimary }]}>{lead.name}</Text>
                    <Text style={[styles.status, { color: colors.primary }]}>{lead.status}</Text>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#38BDF820' : '#E0F2FE' }]} onPress={handleCall}>
                    <Icon name="call" size={moderateScale(24)} color={isDark ? '#38BDF8' : '#0284C7'} />
                    <Text style={[styles.actionText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#4ADE8020' : '#DCFCE7' }]} onPress={handleWhatsApp}>
                    <Icon name="logo-whatsapp" size={moderateScale(24)} color={isDark ? '#4ADE80' : '#16A34A'} />
                    <Text style={[styles.actionText, { color: isDark ? '#4ADE80' : '#16A34A' }]}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#C084FC20' : '#F3E8FF' }]} onPress={handleSchedule}>
                    <Icon name="calendar" size={moderateScale(24)} color={isDark ? '#C084FC' : '#9333EA'} />
                    <Text style={[styles.actionText, { color: isDark ? '#C084FC' : '#9333EA' }]}>Schedule</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#FB923C20' : '#FFEDD5' }]} onPress={handleViewHistory}>
                    <Icon name="time-outline" size={moderateScale(24)} color={isDark ? '#FB923C' : '#EA580C'} />
                    <Text style={[styles.actionText, { color: isDark ? '#FB923C' : '#EA580C' }]}>History</Text>
                </TouchableOpacity>


            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Contact Info */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: colors.textPrimary }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact Information</Text>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <InfoRow icon="call" label="Phone" value={lead.phoneNumber || 'N/A'} />
                    <InfoRow icon="mail" label="Email" value={lead.email || 'N/A'} onCopy={handleCopyEmail} />
                    {/* Company Removed */}
                    <InfoRow icon="person" label="Assigned To" value={lead.assignedTo} />
                </View>
            </ScrollView>

            {/* Register for Exam - Bottom Button */}
            <TouchableOpacity
                style={[
                    styles.bottomRegisterBtn,
                    { backgroundColor: ongoingExam ? colors.primary : (isDark ? '#374151' : '#D1D5DB') },
                    !ongoingExam && { opacity: 0.5 }
                ]}
                onPress={openRegisterModal}
                disabled={!ongoingExam}
            >
                <Icon name="school-outline" size={moderateScale(20)} color="#FFF" />
                <Text style={styles.bottomRegisterText}>
                    {ongoingExam ? 'Register for Exam' : 'No Exam Available'}
                </Text>
            </TouchableOpacity>

            <ScheduleModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleSaveSchedule}
                leadName={lead.name}
            />

            {/* PCAT Registration Modal */}
            <Modal
                visible={showRegisterModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRegisterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.registerModal, { backgroundColor: colors.card }]}>
                        <View style={styles.registerHeader}>
                            <Text style={[styles.registerTitle, { color: colors.textPrimary }]}>Register for Exam</Text>
                            <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                                <Icon name="close" size={moderateScale(24)} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {ongoingExam?.title && (
                            <View style={[styles.examBadge, { backgroundColor: isDark ? '#374151' : '#F0F9FF' }]}>
                                <Icon name="school" size={moderateScale(16)} color={colors.primary} />
                                <Text style={[styles.examBadgeText, { color: colors.primary }]} numberOfLines={2}>{ongoingExam.title}</Text>
                            </View>
                        )}

                        <View style={{ gap: verticalScale(14) }}>
                            <View>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name *</Text>
                                <TextInput
                                    style={[styles.registerInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                                    value={registerName}
                                    onChangeText={setRegisterName}
                                    placeholder="Enter name"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                            <View>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
                                <TextInput
                                    style={[styles.registerInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                                    value={registerEmail}
                                    onChangeText={setRegisterEmail}
                                    placeholder="Enter email"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                            <View>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone *</Text>
                                <TextInput
                                    style={[styles.registerInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                                    value={registerNumber}
                                    onChangeText={setRegisterNumber}
                                    placeholder="Enter phone number"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.registerBtn, { backgroundColor: colors.primary }, registerLoading && { opacity: 0.7 }]}
                            onPress={handleRegister}
                            disabled={registerLoading}
                        >
                            {registerLoading ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.registerBtnText}>Register</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingBottom: verticalScale(12),
    },
    backBtn: {
        padding: scale(4),
    },
    headerTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
    },
    profileSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(20),
        marginBottom: verticalScale(16),
    },
    avatarContainer: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(16),
    },
    initials: {
        fontSize: moderateScale(24),
        fontWeight: '700',
        color: '#4F46E5',
    },
    name: {
        fontSize: moderateScale(20),
        fontWeight: '700',
    },
    status: {
        fontSize: moderateScale(14),
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        marginBottom: 0,
    },
    tab: {
        flex: 1,
        paddingVertical: verticalScale(12),
        alignItems: 'center',
    },
    tabText: {
        fontWeight: '600',
        fontSize: moderateScale(14),
    },
    scrollContent: {
        padding: scale(20),
    },
    sectionCard: {
        borderRadius: moderateScale(16),
        padding: scale(16),
        marginBottom: verticalScale(20),
        shadowOffset: { width: 0, height: verticalScale(2) },
        shadowOpacity: 0.05,
        shadowRadius: moderateScale(8),
        elevation: 2,
    },
    sectionTitle: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        marginBottom: verticalScale(12),
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: verticalScale(12),
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    iconBox: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(10),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    infoLabel: {
        fontSize: moderateScale(12),
        marginBottom: verticalScale(2),
    },
    infoValue: {
        fontSize: moderateScale(14),
        fontWeight: '500',
    },
    reminderItem: {
        flexDirection: 'row',
        marginBottom: verticalScale(16),
    },
    reminderDot: {
        width: moderateScale(10),
        height: moderateScale(10),
        borderRadius: moderateScale(5),
        marginTop: verticalScale(6),
        marginRight: scale(10),
    },
    reminderDate: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        marginBottom: verticalScale(2),
    },
    reminderNote: {
        fontSize: moderateScale(12),
    },
    historyContainer: {
        paddingTop: verticalScale(8),
    },
    historyItem: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    historyLeft: {
        width: scale(30),
        alignItems: 'center',
    },
    line: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: '#E5E7EB',
        zIndex: -1,
    },
    dot: {
        width: moderateScale(12),
        height: moderateScale(12),
        borderRadius: moderateScale(6),
        marginTop: verticalScale(18),
    },
    historyCard: {
        flex: 1,
        marginLeft: scale(8),
        marginBottom: verticalScale(16),
        padding: scale(12),
        borderRadius: moderateScale(12),
        borderWidth: 1,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(4),
    },
    historyType: {
        fontWeight: '700',
        fontSize: moderateScale(13),
    },
    historyTime: {
        fontSize: moderateScale(11),
    },
    historyDuration: {
        fontSize: moderateScale(12),
        marginBottom: verticalScale(4),
    },
    remarkBox: {
        padding: scale(8),
        borderRadius: moderateScale(6),
        marginTop: verticalScale(4),
    },
    remarkText: {
        fontSize: moderateScale(13),
        fontStyle: 'italic',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: verticalScale(20),
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: scale(16),
        marginBottom: verticalScale(16),
    },
    actionBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: moderateScale(70),
        height: moderateScale(70),
        borderRadius: moderateScale(12),
        gap: verticalScale(4),
    },
    actionText: {
        fontSize: moderateScale(11),
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerModal: {
        width: '88%',
        borderRadius: moderateScale(16),
        padding: scale(20),
        elevation: 5,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    registerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    registerTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
    },
    examBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        padding: scale(10),
        borderRadius: moderateScale(10),
        marginBottom: verticalScale(16),
    },
    examBadgeText: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        flex: 1,
    },
    inputLabel: {
        fontSize: moderateScale(12),
        fontWeight: '600',
        marginBottom: verticalScale(4),
        textTransform: 'uppercase',
    },
    registerInput: {
        borderWidth: 1,
        borderRadius: moderateScale(10),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
        fontSize: moderateScale(14),
    },
    registerBtn: {
        marginTop: verticalScale(20),
        paddingVertical: verticalScale(14),
        borderRadius: moderateScale(12),
        alignItems: 'center',
    },
    registerBtnText: {
        color: '#FFF',
        fontSize: moderateScale(15),
        fontWeight: '700',
    },
    bottomRegisterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        marginHorizontal: scale(16),
        marginBottom: verticalScale(12),
        paddingVertical: verticalScale(14),
        borderRadius: moderateScale(12),
    },
    bottomRegisterText: {
        color: '#FFF',
        fontSize: moderateScale(15),
        fontWeight: '700',
    },
});
