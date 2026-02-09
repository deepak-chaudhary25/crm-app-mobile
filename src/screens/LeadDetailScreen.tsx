
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';
import { historyService, Interaction } from '../services/history';
import { callLogsApi, schedulesApi } from '../services/api';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { ScheduleModal } from '../components/ScheduleModal';
import { CallFeedbackModal } from '../components/CallFeedbackModal';
import { useCallHandling } from '../hooks/useCallHandling';
import { Linking, Alert } from 'react-native';

export const LeadDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { colors, isDark } = useAppTheme();
    const { lead } = route.params;

    const { handleCall: performCall, feedbackModalVisible, currentCallLog, blockingCall, handleSaveFeedback } = useCallHandling();

    const [modalVisible, setModalVisible] = useState(false);

    const handleCall = () => {
        performCall(lead.phoneNumber, {
            ...lead,
            // Ensure we pass the numeric ID correctly if it exists in route params under different keys
            leadId: lead.leadId || lead.id,
            stageId: lead.status // We might need to map status name to ID if we don't have the ID. 
            // BUT, for feedback, we might need stageId. 
            // If lead object here is "flat", we might not have stageId. 
            // We can try to assume it keeps current stage if undefined.
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



    useEffect(() => {
        // loadData(); // No longer needed if we removed history/reminders
    }, []);

    const InfoRow = ({ icon, label, value }: { icon: string, label: string, value: string }) => (
        <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                <Icon name={icon} size={moderateScale(20)} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
            </View>
        </View>
    );



    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E0F2FE' }]} onPress={handleCall}>
                    <Icon name="call" size={moderateScale(24)} color="#0284C7" />
                    <Text style={[styles.actionText, { color: '#0284C7' }]}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }]} onPress={handleWhatsApp}>
                    <Icon name="logo-whatsapp" size={moderateScale(24)} color="#16A34A" />
                    <Text style={[styles.actionText, { color: '#16A34A' }]}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3E8FF' }]} onPress={handleSchedule}>
                    <Icon name="calendar" size={moderateScale(24)} color="#9333EA" />
                    <Text style={[styles.actionText, { color: '#9333EA' }]}>Schedule</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Contact Info */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: colors.textPrimary }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact Information</Text>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <InfoRow icon="call" label="Phone" value={lead.phoneNumber || 'N/A'} />
                    <InfoRow icon="mail" label="Email" value={lead.email || 'N/A'} />
                    {/* Company Removed */}
                    <InfoRow icon="person" label="Assigned To" value={lead.assignedTo} />
                </View>
            </ScrollView>

            <ScheduleModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleSaveSchedule}
                leadName={lead.name}
            />

            <CallFeedbackModal
                visible={feedbackModalVisible}
                callLog={currentCallLog}
                leadName={blockingCall?.leadName || lead.name}
                currentStageId={blockingCall?.stageId} // If flat lead doesn't have stageId, this might be issue. 
                // However, the modal allows selecting stage.
                onSave={handleSaveFeedback}
            />
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
        paddingVertical: verticalScale(12),
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
        paddingHorizontal: scale(20),
        marginBottom: verticalScale(16),
    },
    actionBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: moderateScale(80),
        height: moderateScale(70),
        borderRadius: moderateScale(12),
        gap: verticalScale(4),
    },
    actionText: {
        fontSize: moderateScale(12),
        fontWeight: '600',
    },
});
