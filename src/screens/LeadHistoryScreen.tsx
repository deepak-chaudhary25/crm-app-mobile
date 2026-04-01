
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, RefreshControl, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';
import { callLogsApi, interactionLogsApi } from '../services/api';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { useCallHandlingContext } from '../context/CallHandlingContext';

interface CallLog {
    _id: string;
    leadId: number;
    userId?: { _id: string; name: string; email: string };
    duration: number;
    outcome: string;
    remark?: string;
    stageId?: { _id: string; name: string };
    startedAt?: string;
    createdAt: string;
    leadName?: string;
    LeadNumber?: string;
    leadNumber?: string;
}

interface InteractionLog {
    _id: string;
    leadId: number;
    userId?: { _id: string; name: string; email: string };
    source: string;
    outcome: string;
    stageId?: { _id: string; name: string };
    interactionAt: string;
    createdAt: string;
    leadName?: string;
    leadNumber?: string;
}

export const LeadHistoryScreen = () => {
    const { colors, isDark } = useAppTheme();
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { leadId, leadName, leadNumber, logType = 'calls' } = route.params;

    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [interactionLogs, setInteractionLogs] = useState<InteractionLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const pageRef = useRef(1);
    const hasMoreRef = useRef(true);
    const isMoreLoadingRef = useRef(false);
    const LIMIT = 10;
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string>(leadName || '');
    const [displayPhone, setDisplayPhone] = useState<string>(leadNumber || '');

    const { handleCall: performCall } = useCallHandlingContext();

    const getPhoneNumber = () => {
        if (leadNumber) return leadNumber;
        const fromCalls = callLogs.find(h => h.LeadNumber || h.leadNumber);
        return fromCalls?.LeadNumber || fromCalls?.leadNumber;
    };

    const handleCall = (phoneNumber?: string) => {
        const number = phoneNumber || displayPhone;
        if (!number) { Alert.alert('Error', 'No phone number available'); return; }
        performCall(number, { leadId, name: displayName });
    };

    const loadHistory = async (pageNumber = 1, shouldRefresh = false) => {
        if (!shouldRefresh && (!hasMoreRef.current || isMoreLoadingRef.current)) return;
        
        if (shouldRefresh) {
            setLoading(true);
        } else {
            setIsMoreLoading(true);
            isMoreLoadingRef.current = true;
        }

        try {
            const params = {
                page: pageNumber,
                limit: LIMIT
            };

            if (logType === 'interactions') {

                const data = await interactionLogsApi.getByLeadId(leadId, params);

                const newData: InteractionLog[] = Array.isArray(data) ? data : data?.data || [];
                
                if (shouldRefresh) {
                    setInteractionLogs(newData);
                    setPage(1);
                    pageRef.current = 1;
                } else {
                    setInteractionLogs(prev => [...prev, ...newData]);
                    setPage(pageNumber);
                    pageRef.current = pageNumber;
                }
                
                const more = newData.length === LIMIT;
                setHasMore(more);
                hasMoreRef.current = more;
                
                if (shouldRefresh && newData.length > 0) {
                    setDisplayName(newData[0].leadName || leadName || '');
                    setDisplayPhone(newData[0].leadNumber || leadNumber || '');
                }
            } else {

                const data = await callLogsApi.getLeadLogs(leadId, params);

                const newData: CallLog[] = Array.isArray(data) ? data : data?.data || [];
                
                if (shouldRefresh) {
                    setCallLogs(newData);
                    setPage(1);
                    pageRef.current = 1;
                } else {
                    setCallLogs(prev => [...prev, ...newData]);
                    setPage(pageNumber);
                    pageRef.current = pageNumber;
                }
                
                const more = newData.length === LIMIT;
                setHasMore(more);
                hasMoreRef.current = more;
                
                if (shouldRefresh && newData.length > 0) {
                    setDisplayName(newData[0].leadName || leadName || '');
                    setDisplayPhone(newData[0].leadNumber || newData[0].LeadNumber || leadNumber || '');
                }
            }
        } catch (error) {
            console.error('Failed to load lead log history', error);
        } finally {
            setLoading(false);
            setIsMoreLoading(false);
            isMoreLoadingRef.current = false;
        }
    };

    useEffect(() => { loadHistory(1, true); }, [leadId, logType]);

    const onRefresh = () => {
        loadHistory(1, true);
    };

    const handleLoadMore = () => {
        if (!isMoreLoadingRef.current && hasMoreRef.current && !loading) {
            loadHistory(pageRef.current + 1, false);
        }
    };

    const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    // ── Call Log Card ─────────────────────────────────────────────
    const renderCallItem = ({ item }: { item: CallLog }) => {
        const isExpanded = expandedId === item._id;
        const missed = (item.outcome || '').toLowerCase().includes('missed') || item.duration === 0;
        const iconColor = missed ? '#EF4444' : '#10B981';

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleExpand(item._id)}
                style={[styles.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', shadowColor: isDark ? '#000' : '#64748B' }]}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                        <Icon name="call" size={moderateScale(18)} color={iconColor} />
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.outcome || 'Call'}
                        </Text>
                        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                            {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <Icon name="time-outline" size={moderateScale(12)} color={colors.textSecondary} />
                        <Text style={[styles.badgeText, { color: colors.textSecondary }]}> {formatDuration(item.duration)}</Text>
                    </View>
                    <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={moderateScale(20)} color={colors.textSecondary} />
                </View>

                {isExpanded && (
                    <View style={[styles.expandedContent, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Stage</Text>
                                <View style={[styles.stageBadge, { backgroundColor: isDark ? '#374151' : '#F1F5F9' }]}>
                                    <Text style={[styles.stageText, { color: colors.textPrimary }]}>{item.stageId?.name || '—'}</Text>
                                </View>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Agent</Text>
                                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.userId?.name || '—'}</Text>
                            </View>
                        </View>
                        {item.remark ? (
                            <View style={{ marginTop: verticalScale(12) }}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Remark</Text>
                                <View style={[styles.remarkBubble, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                                    <Icon name="chatbubble-ellipses-outline" size={moderateScale(14)} color={colors.textSecondary} />
                                    <Text style={[styles.remarkText, { color: colors.textPrimary }]}> {item.remark}</Text>
                                </View>
                            </View>
                        ) : null}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // ── Interaction Log Card ──────────────────────────────────────
    const renderInteractionItem = ({ item }: { item: InteractionLog }) => {
        const isExpanded = expandedId === item._id;

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleExpand(item._id)}
                style={[styles.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', shadowColor: isDark ? '#000' : '#64748B' }]}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: '#8B5CF615' }]}>
                        <Icon name="chatbubbles-outline" size={moderateScale(18)} color="#8B5CF6" />
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.outcome || 'Interaction'}
                        </Text>
                        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                            {formatDate(item.interactionAt)} • {formatTime(item.interactionAt)}
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#8B5CF615' }]}>
                        <Text style={[styles.badgeText, { color: '#8B5CF6' }]}>{item.source || '—'}</Text>
                    </View>
                    <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={moderateScale(20)} color={colors.textSecondary} />
                </View>

                {isExpanded && (
                    <View style={[styles.expandedContent, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Stage</Text>
                                <View style={[styles.stageBadge, { backgroundColor: isDark ? '#374151' : '#F1F5F9' }]}>
                                    <Text style={[styles.stageText, { color: colors.textPrimary }]}>{item.stageId?.name || '—'}</Text>
                                </View>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Agent</Text>
                                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.userId?.name || '—'}</Text>
                            </View>
                        </View>
                        <View style={{ marginTop: verticalScale(8) }}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Source</Text>
                            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.source || '—'}</Text>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const isInteractions = logType === 'interactions';
    const data = isInteractions ? interactionLogs : callLogs;
    const isEmpty = data.length === 0 && !loading;

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
                            {displayName || `Lead #${leadId}`}
                        </Text>
                        {displayPhone ? (
                            <Text style={[styles.timestamp, { color: colors.textSecondary, marginTop: 2 }]}>
                                {displayPhone}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {displayPhone && (
                    <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#E0F2FE' }]} onPress={() => handleCall()}>
                        <Icon name="call" size={moderateScale(20)} color="#0284C7" />
                    </TouchableOpacity>
                )}
            </View>

            {isEmpty ? (
                <View style={styles.emptyContainer}>
                    <Icon
                        name={isInteractions ? 'chatbubbles-outline' : 'time-outline'}
                        size={moderateScale(64)}
                        color={colors.textSecondary + '40'}
                    />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        No {isInteractions ? 'interactions' : 'call history'} found for this lead.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={data as any[]}
                    keyExtractor={(item, index) => `${item._id || index}-${index}`}
                    renderItem={isInteractions
                        ? renderInteractionItem as any
                        : renderCallItem as any
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() => (
                        isMoreLoading ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator color={colors.primary} />
                            </View>
                        ) : null
                    )}
                    refreshControl={<RefreshControl refreshing={loading && data.length === 0} onRefresh={onRefresh} colors={[colors.primary]} />}
                />
            )}

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(12),
    },
    backBtn: { padding: scale(4) },
    headerTitle: { fontSize: moderateScale(18), fontWeight: '700' },
    listContent: { padding: scale(16), paddingBottom: verticalScale(40) },
    card: {
        borderRadius: moderateScale(16),
        padding: scale(14),
        marginBottom: verticalScale(12),
        shadowOffset: { width: 0, height: verticalScale(2) },
        shadowOpacity: 0.05,
        shadowRadius: moderateScale(8),
        elevation: 1.5,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    headerContent: { flex: 1 },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
        marginRight: scale(8),
    },
    badgeText: { fontSize: moderateScale(11), fontWeight: '600' },
    expandedContent: {
        marginTop: verticalScale(12),
        paddingTop: verticalScale(12),
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    title: { fontSize: moderateScale(15), fontWeight: '700' },
    timestamp: { fontSize: moderateScale(12), fontWeight: '500', marginTop: verticalScale(2) },
    stageBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(6),
    },
    stageText: { fontSize: moderateScale(11), fontWeight: '700' },
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(4) },
    detailItem: { flex: 1 },
    detailLabel: { fontSize: moderateScale(11), marginBottom: verticalScale(4), textTransform: 'uppercase', fontWeight: '700' },
    detailValue: { fontSize: moderateScale(14), fontWeight: '600' },
    remarkBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(10),
        borderRadius: moderateScale(8),
        marginTop: verticalScale(4),
    },
    remarkText: { fontSize: moderateScale(13), fontWeight: '500', flex: 1 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { marginTop: verticalScale(16), fontSize: moderateScale(16) },
    callBtn: { padding: scale(8), borderRadius: moderateScale(20) },
});
