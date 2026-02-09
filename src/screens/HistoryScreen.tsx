
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, RefreshControl, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';
import { callLogsApi } from '../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
    leadNumber?: string; // Add lowercase variant
}

export const HistoryScreen = () => {
    const { colors, isDark } = useAppTheme();
    const [history, setHistory] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Pass loadHistory as callback to refresh after feedback
    const { handleCall: performCall, feedbackModalVisible, currentCallLog, blockingCall, handleSaveFeedback } = useCallHandling({
        onFeedbackSuccess: () => loadHistory()
    });

    const loadHistory = async () => {
        setLoading(true);
        try {
            const response = await callLogsApi.getLogs({ limit: 50 }); // Fetch first 50 for now
            if (response && response.data) {
                setHistory(response.data);
            }
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [])
    );

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    // Helper to determine icon based on outcome/duration
    // Since API doesn't give explicit 'type' like 'CALL' or 'WHATSAPP' anymore (it sends only call logs),
    // we assume everything here is a Call.
    const getIconForOutcome = (outcome: string, duration: number) => {
        const lowerOutcome = outcome.toLowerCase();
        if (lowerOutcome.includes('missed') || lowerOutcome.includes('dint pick') || duration === 0) {
            return { name: 'call', color: '#EF4444' }; // Red for missed/no-pickup
        }
        return { name: 'call', color: '#10B981' }; // Green for connected
    };

    const navigation = useNavigation<any>();

    // ...

    const handlePressItem = (item: CallLog) => {
        navigation.navigate('LeadHistory', {
            leadId: item.leadId,
            leadName: item.leadName || `Lead #${item.leadId}`
        });
    };

    const handleCall = (phoneNumber?: string, item?: CallLog) => {
        performCall(phoneNumber, {
            leadId: item?.leadId, // History item has leadId (number usually)
            name: item?.leadName,
            stageId: item?.stageId?._id
        });
    };

    const renderItem = ({ item }: { item: CallLog }) => {
        const iconInfo = getIconForOutcome(item.outcome, item.duration);
        const date = new Date(item.createdAt);

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handlePressItem(item)}
                style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.textPrimary }]}
            >
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.leadName, { color: colors.textPrimary }]}>
                            {item.leadName || `Lead #${item.leadId}`}
                        </Text>
                        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                            {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>

                    {/* Call Button */}
                    <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: '#E0F2FE' }]}
                        onPress={() => handleCall(item.leadNumber || item.LeadNumber, item)}
                    >
                        <Icon name="call" size={moderateScale(20)} color="#0284C7" />
                    </TouchableOpacity>
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lead No</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>#{item.leadId}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Duration</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDuration(item.duration)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Caller</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.userId?.name || 'Unknown'}</Text>
                    </View>
                </View>

                {item.remark && (
                    <View style={[styles.remarkBox, { backgroundColor: isDark ? '#374151' : '#F3F4F6', marginTop: 12 }]}>
                        <Text style={[styles.remarkText, { color: colors.textPrimary }]}>"{item.remark}"</Text>
                    </View>
                )}

            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={[styles.header, { backgroundColor: colors.background }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Call History</Text>
            <TouchableOpacity onPress={loadHistory} style={styles.refreshBtn}>
                <Icon name="refresh" size={moderateScale(24)} color={colors.primary} />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />
            {renderHeader()}

            {history.length === 0 && !loading ? (
                <View style={styles.emptyContainer}>
                    <Icon name="time-outline" size={moderateScale(64)} color={colors.textSecondary + '40'} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No call history found.</Text>
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
                leadName={blockingCall?.leadName || 'Unknown Lead'}
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(16),
    },
    headerTitle: {
        fontSize: moderateScale(28),
        fontWeight: '800',
    },
    refreshBtn: {
        padding: scale(8),
    },
    listContent: {
        padding: scale(16),
        paddingBottom: verticalScale(80),
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
    leadName: {
        fontSize: moderateScale(16),
        fontWeight: '700',
    },
    leadNumber: {
        fontSize: moderateScale(13),
        fontWeight: '500',
        marginTop: verticalScale(2),
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
    callBtn: {
        padding: scale(8),
        borderRadius: moderateScale(20),
        marginLeft: scale(8),
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
    }
});
