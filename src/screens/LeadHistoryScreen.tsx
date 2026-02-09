
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, RefreshControl, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';
import { callLogsApi } from '../services/api';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { useCallHandling } from '../hooks/useCallHandling';
import { CallFeedbackModal } from '../components/CallFeedbackModal';

interface CallLog {
    _id: string;
    leadId: number;
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    duration: number;
    outcome: string;
    stageId?: {
        _id: string;
        name: string;
    };
    remark?: string;
    createdAt: string;
    leadName?: string;
    LeadNumber?: string;
    leadNumber?: string;
}

export const LeadHistoryScreen = () => {
    const { colors, isDark } = useAppTheme();
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { leadId, leadName, leadNumber } = route.params;

    const [history, setHistory] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Pass loadHistory as callback to refresh after feedback
    const { handleCall: performCall, feedbackModalVisible, currentCallLog, blockingCall, handleSaveFeedback } = useCallHandling({
        onFeedbackSuccess: () => loadHistory()
    });

    // Helper: Find valid number from params or history items
    const getPhoneNumber = () => {
        if (leadNumber) return leadNumber;
        if (history.length > 0) {
            const item = history.find(h => h.LeadNumber || h.leadNumber);
            return item?.LeadNumber || item?.leadNumber;
        }
        return null;
    };



    const handleCall = () => {
        const number = getPhoneNumber();
        if (!number) {
            Alert.alert('Error', 'No phone number available');
            return;
        }
        performCall(number, {
            leadId: leadId,
            name: leadName
        });
    };

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await callLogsApi.getLeadLogs(leadId);
            setHistory(data);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [leadId]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatTime = (date: Date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const strMinutes = minutes < 10 ? '0' + minutes : minutes;
        return hours + ':' + strMinutes + ' ' + ampm;
    };

    const getIconForOutcome = (outcome: string, duration: number) => {
        const lowerOutcome = (outcome || '').toLowerCase();
        if (lowerOutcome.includes('missed') || lowerOutcome.includes('dint pick') || duration === 0) {
            return { name: 'call', color: '#EF4444' };
        }
        return { name: 'call', color: '#10B981' };
    };

    const renderItem = ({ item }: { item: CallLog }) => {
        const date = new Date(item.createdAt);

        return (
            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.textPrimary }]}>
                {/* 1. Header: Stage Name | Date Time */}
                <View style={[styles.headerRow, { marginBottom: 8, justifyContent: 'space-between' }]}>
                    <View style={[styles.stageBadge, { backgroundColor: isDark ? '#374151' : '#F3F4F6', marginLeft: 0 }]}>
                        <Text style={[styles.stageText, { color: colors.textPrimary }]}>
                            {item.stageId?.name || 'Unknown Stage'}
                        </Text>
                    </View>
                    <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                        {date.toLocaleDateString()} • {formatTime(date)}
                    </Text>
                </View>

                {/* 2. Details: Duration | Caller (Moved outcome to own row) */}
                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Duration</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDuration(item.duration)}</Text>
                    </View>
                    {/* Caller */}
                    <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Caller</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.userId?.name || 'Unknown'}</Text>
                    </View>
                </View>

                {/* 3. Outcome (Full Width) */}
                <View style={{ marginTop: 12 }}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Outcome</Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.outcome}</Text>
                </View>

                {/* 4. Remark (Full Width) */}
                {item.remark && (
                    <View style={{ marginTop: 12 }}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Remark</Text>
                        <View style={[styles.remarkBox, { backgroundColor: isDark ? '#374151' : '#F3F4F6', marginTop: 4 }]}>
                            <Text style={[styles.remarkText, { color: colors.textPrimary }]}>{item.remark}</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Icon name="arrow-back" size={moderateScale(24)} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                            {leadName || 'Lead History'}
                        </Text>
                        {getPhoneNumber() && (
                            <Text style={[styles.timestamp, { color: colors.textSecondary, marginTop: 2 }]}>
                                {getPhoneNumber()}
                            </Text>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.callBtn, { backgroundColor: '#E0F2FE' }]}
                    onPress={handleCall}
                >
                    <Icon name="call" size={moderateScale(20)} color="#0284C7" />
                </TouchableOpacity>
            </View>

            {history.length === 0 && !loading ? (
                <View style={styles.emptyContainer}>
                    <Icon name="time-outline" size={moderateScale(64)} color={colors.textSecondary + '40'} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No history found for this lead.</Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadHistory} colors={[colors.primary]} />
                    }
                />
            )}

            <CallFeedbackModal
                visible={feedbackModalVisible}
                callLog={currentCallLog}
                leadName={blockingCall?.leadName || leadName}
                currentStageId={blockingCall?.stageId}
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
    listContent: {
        padding: scale(16),
    },
    card: {
        borderRadius: moderateScale(16),
        padding: scale(16),
        marginBottom: verticalScale(12),
        shadowOffset: { width: 0, height: verticalScale(2) },
        shadowOpacity: 0.05,
        shadowRadius: moderateScale(8),
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    iconBox: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    title: {
        fontSize: moderateScale(16),
        fontWeight: '700',
    },
    timestamp: {
        fontSize: moderateScale(12),
        marginTop: verticalScale(2),
    },
    stageBadge: {
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
    },
    stageText: {
        fontSize: moderateScale(11),
        fontWeight: '700',
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(4),
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        fontSize: moderateScale(11),
        marginBottom: verticalScale(2),
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    detailValue: {
        fontSize: moderateScale(14),
        fontWeight: '500',
    },
    remarkBox: {
        padding: scale(12),
        borderRadius: moderateScale(8),
        marginTop: verticalScale(12),
    },
    remarkText: {
        fontSize: moderateScale(14),
        fontStyle: 'italic',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: verticalScale(100),
    },
    emptyText: {
        marginTop: verticalScale(16),
        fontSize: moderateScale(16),
    },
    callBtn: {
        padding: scale(8),
        borderRadius: moderateScale(20),
        marginLeft: scale(8),
    },
});
