import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatePicker from 'react-native-date-picker';
import { useFocusEffect } from '@react-navigation/native';
import { schedulesApi } from '../services/api';
import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { useCallHandlingContext } from '../context/CallHandlingContext';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

export const FollowupScreen = ({ navigation }: any) => {
    const { colors, isDark } = useAppTheme();
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const pageRef = useRef(1);
    const hasMoreRef = useRef(true);
    const isMoreLoadingRef = useRef(false);
    const LIMIT = 10;
    const { handleCall: performCall } = useCallHandlingContext();

    // Filters
    const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'overdue' | 'today' | 'custom'>('all');
    
    
    // Custom Dates
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const [appliedFromDate, setAppliedFromDate] = useState<Date>(new Date());
    const [appliedToDate, setAppliedToDate] = useState<Date>(new Date());
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    const [showCustomDateModal, setShowCustomDateModal] = useState(false);

    const fetchSchedules = useCallback(async (pageNumber = 1, shouldRefresh = false) => {
        if (!shouldRefresh && (!hasMoreRef.current || isMoreLoadingRef.current)) return;
        if (shouldRefresh) {
            setLoading(true);
        } else {
            setIsMoreLoading(true);
            isMoreLoadingRef.current = true;
        }

        try {
            const params: any = {
                page: pageNumber,
                limit: LIMIT
            };
            
            if (activeFilter === 'upcoming' || activeFilter === 'overdue') {
                params.status = activeFilter;
            } else if (activeFilter === 'today') {
                params.dateFilter = 'today';
            } else if (activeFilter === 'custom') {
                const toDateStr = (d: Date) => {
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    };
                params.dateFilter = 'custom';
                params.from = toDateStr(new Date(appliedFromDate));
                params.to = toDateStr(new Date(appliedToDate));
            }

            console.log('Fetching Schedules with payload:', params);
            const data = await schedulesApi.getSchedules(params);
            console.log('Schedules response:', data);

            const newData = Array.isArray(data) ? data : (data.data || []);
            
            if (shouldRefresh) {
                setSchedules(newData);
                setPage(1);
                pageRef.current = 1;
            } else {
                setSchedules(prev => [...prev, ...newData]);
                setPage(pageNumber);
                pageRef.current = pageNumber;
            }
            
            const more = newData.length === LIMIT;
            setHasMore(more);
            hasMoreRef.current = more;
        } catch (error) {
            console.error('Failed to fetch schedules:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsMoreLoading(false);
            isMoreLoadingRef.current = false;
        }
    }, [activeFilter, appliedFromDate, appliedToDate]);

    useFocusEffect(
        useCallback(() => {
            fetchSchedules(1, true);
        }, [fetchSchedules])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchSchedules(1, true);
    };

    const handleLoadMore = () => {
        if (!isMoreLoadingRef.current && hasMoreRef.current && !loading) {
            fetchSchedules(pageRef.current + 1, false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => {
                navigation.navigate('LeadHistory', { 
                    leadId: item.leadId, 
                    leadName: item.leadName || `Lead #${item.leadId}`, 
                    leadNumber: item.leadNumber 
                });
            }}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
            <View style={styles.cardHeader}>
                <View style={styles.leadIdContainer}>
                    <Icon name="person-outline" size={16} color={colors.primary} />
                    <Text style={[styles.leadIdText, { color: colors.primary }]}>{item.leadName || `Lead #${item.leadId}`}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[
                        styles.statusBadge, 
                        { backgroundColor: item.status === 'overdue' ? '#FEE2E2' : '#E0F2FE' }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: item.status === 'overdue' ? '#EF4444' : '#0EA5E9' }
                        ]}>{item.status?.toUpperCase() || 'UNKNOWN'}</Text>
                    </View>
                </View>
            </View>
            
            <View style={styles.messageContainer}>
                <Text style={[styles.messageText, { color: colors.textPrimary }]}>{item.message}</Text>
            </View>

            <View style={[styles.cardFooter, { justifyContent: 'space-between' }]}>
                <View style={styles.footerDateContainer}>
                    <Icon name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                        {new Date(item.scheduledAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>

                {item.stageName && (
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: isDark ? '#8B5CF620' : '#EDE9FE' }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: isDark ? '#A78BFA' : '#7C3AED' }
                        ]}>{item.stageName.toUpperCase()}</Text>
                    </View>
                )}

                {item.leadNumber && (
                    <TouchableOpacity 
                        style={[styles.callButton, { backgroundColor: isDark ? '#38BDF820' : '#E0F2FE' }]}
                        onPress={(e) => {
                            e.stopPropagation(); // Prevent card tap
                            performCall(
                                item.leadNumber, 
                                { leadId: item.leadId, name: item.leadName || `Lead #${item.leadId}` },
                                undefined,
                                item._id
                            );
                        }}
                    >
                        <Icon name="call" size={16} color={isDark ? '#38BDF8' : '#0284C7'} />
                        <Text style={[styles.callButtonText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>Call</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    // Filter Buttons UI
    const FILTERS: { id: typeof activeFilter, label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'upcoming', label: 'Upcoming' },
        { id: 'overdue', label: 'Overdue' },
        { id: 'today', label: 'Today' },
        { id: 'custom', label: 'Custom' }
    ];

    const renderFilters = () => (
        <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, { paddingRight: 32 }]}>
                {FILTERS.map(filter => {
                    const isActive = activeFilter === filter.id;
                    return (
                        <TouchableOpacity
                            key={filter.id}
                            style={[
                                styles.filterChip,
                                isActive ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
                            ]}
                            onPress={() => {
                                if (filter.id === 'custom') {
                                    setShowCustomDateModal(true);
                                    // Sync local picker state with currently applied dates when opening
                                    setFromDate(appliedFromDate);
                                    setToDate(appliedToDate);
                                } else {
                                    setActiveFilter(filter.id);
                                }
                            }}
                        >
                            <Text style={[
                                styles.filterChipText,
                                isActive ? { color: '#FFF' } : { color: colors.textPrimary }
                            ]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Replaced Custom Pickers inline with Modal below */}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <View style={styles.headerRow}>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Tasks</Text>
                </View>
            </View>

            {/* Custom Date Modal */}
            {showCustomDateModal && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Custom Range</Text>
                        
                        <View style={styles.datePickerRow}>
                            <View style={styles.datePickerWrapper}>
                                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>From</Text>
                                <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border }]} onPress={() => setShowFromPicker(true)}>
                                    <Text style={{ color: colors.textPrimary }}>{fromDate.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                                <DatePicker
                                    modal
                                    mode="date"
                                    open={showFromPicker}
                                    date={fromDate}
                                    minimumDate={new Date('2024-01-01')}
                                    maximumDate={toDate || new Date()}
                                    onConfirm={(date) => {
                                        setShowFromPicker(false);
                                        setFromDate(date);
                                    }}
                                    onCancel={() => setShowFromPicker(false)}
                                    theme={isDark ? 'dark' : 'light'}
                                />
                            </View>
                            <View style={styles.datePickerWrapper}>
                                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>To</Text>
                                <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border }]} onPress={() => setShowToPicker(true)}>
                                    <Text style={{ color: colors.textPrimary }}>{toDate.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                                <DatePicker
                                    modal
                                    mode="date"
                                    open={showToPicker}
                                    date={toDate}
                                    minimumDate={fromDate}
                                    maximumDate={new Date()}
                                    onConfirm={(date) => {
                                        setShowToPicker(false);
                                        setToDate(date);
                                    }}
                                    onCancel={() => setShowToPicker(false)}
                                    theme={isDark ? 'dark' : 'light'}
                                />
                            </View>
                        </View>
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalActionBtn, { borderColor: colors.border, borderWidth: 1 }]} 
                                onPress={() => { setShowCustomDateModal(false); setActiveFilter('all'); }}
                            >
                                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalActionBtn, { backgroundColor: colors.primary }]} 
                                onPress={() => {
                                    if (fromDate > toDate) {
                                        Alert.alert('Invalid Range', 'The "From" date cannot be after the "To" date.');
                                        return;
                                    }
                                    setAppliedFromDate(fromDate);
                                    setAppliedToDate(toDate);
                                    setShowCustomDateModal(false);
                                    setActiveFilter('custom');
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {renderFilters()}

            {loading && !refreshing ? (
                <View style={{ padding: 16 }}>
                    {[1, 2, 3].map(key => (
                        <View key={key} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, height: 100, opacity: 0.5 }]} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={schedules}
                    keyExtractor={(item, index) => `${item._id || index}-${index}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
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
                    refreshControl={
                        <RefreshControl 
                            refreshing={loading && schedules.length === 0} 
                            onRefresh={onRefresh} 
                            tintColor={colors.primary} 
                            colors={[colors.primary]}
                        />
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <EmptyState 
                                title="No Scheduled Follow-ups" 
                                description="You don't have any follow-ups for the selected filters." 
                                icon="calendar-outline" 
                            />
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: scale(16),
        paddingBottom: verticalScale(8),
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: verticalScale(48),
    },
    headerTitle: {
        fontSize: moderateScale(28),
        fontWeight: '800',
    },
    filtersContainer: {
        height: 50,
        justifyContent: 'center',
        paddingHorizontal: 16,
        marginTop: 8,
    },
    filterGroupLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    datePickerRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 16,
    },
    datePickerWrapper: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    dateButton: {
        height: 40,
        borderWidth: 1,
        borderRadius: 8,
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    modalContent: {
        width: '85%',
        borderRadius: 16,
        padding: 24,
        elevation: 5,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 24,
        gap: 12,
    },
    modalActionBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    listContainer: {
        padding: 16,
        flexGrow: 1,
    },
    card: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        elevation: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    leadIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    leadIdText: {
        fontWeight: '700',
        fontSize: 14,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    messageContainer: {
        marginBottom: 12,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '500',
    },
    callButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    callButtonText: {
        fontSize: 12,
        fontWeight: '600',
    }
});
