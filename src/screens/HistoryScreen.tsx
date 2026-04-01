import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, RefreshControl, TouchableOpacity, Linking, Alert, TouchableWithoutFeedback, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';
import { callLogsApi, interactionLogsApi } from '../services/api';
import DatePicker from 'react-native-date-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { HistoryFilterModal } from '../components/HistoryFilterModal';
import { authService } from '../services/auth';
import { useCallHandlingContext } from '../context/CallHandlingContext';
import { EmptyState } from '../components/EmptyState';

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
    
    // Interaction Log Specific Fields
    source?: string;
}

export const HistoryScreen = () => {
    const { colors, isDark } = useAppTheme();
    const [activeTab, setActiveTab] = useState<'calls' | 'interactions'>('calls');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    // Filters
    const [answeredFilter, setAnsweredFilter] = useState<'all' | 'yes' | 'no'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
    const [isAnsweredDropdownOpen, setIsAnsweredDropdownOpen] = useState(false);
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

    // Group / Team Filter State
    const [canViewGroup, setCanViewGroup] = useState(false);
    const [isGroupFilterModalVisible, setIsGroupFilterModalVisible] = useState(false);
    const [groupFilters, setGroupFilters] = useState<{ group: boolean; userId: string }>({ group: false, userId: '' });

    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const pageRef = useRef(1);
    const hasMoreRef = useRef(true);
    const isMoreLoadingRef = useRef(false);
    const LIMIT = 10;

    // Custom Dates
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const [appliedFromDate, setAppliedFromDate] = useState<Date>(new Date());
    const [appliedToDate, setAppliedToDate] = useState<Date>(new Date());
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    const [showCustomDateModal, setShowCustomDateModal] = useState(false);
    const [currentStats, setCurrentStats] = useState<any>(null);
    const [showStatsModal, setShowStatsModal] = useState(false);

    // Pass loadHistory as callback to refresh after feedback
    const { handleCall: performCall } = useCallHandlingContext();

    const loadHistory = async (pageNumber = 1, shouldRefresh = false) => {
        if (!shouldRefresh && (!hasMoreRef.current || isMoreLoadingRef.current)) return;
        
        if (shouldRefresh) {
            setLoading(true);
        } else {
            setIsMoreLoading(true);
            isMoreLoadingRef.current = true;
        }
        
        try {
            const params: any = { 
                limit: LIMIT,
                page: pageNumber
            };
            
            // Apply answered filter
            if (answeredFilter === 'yes') params.answered = true;
            if (answeredFilter === 'no') params.answered = false;

            // Apply date filters
            if (dateFilter && dateFilter !== 'all') {
                if (dateFilter === 'custom') {
                    const toDateStr = (d: Date) => {
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    };
                    params.dateFilter = 'custom';
                    params.fromDate = toDateStr(new Date(appliedFromDate));
                    params.toDate = toDateStr(new Date(appliedToDate));
                } else {
                    // Pass preset filter string directly to backend
                    params.dateFilter = dateFilter; // today | week | month | year
                }
            }

            // Apply group filters
            if (groupFilters.group) {
                params.group = true;
                if (groupFilters.userId) {
                    params.byUserId = groupFilters.userId;
                }
            }

            let response;
            if (activeTab === 'calls') {
                console.log('Fetching Call logs with payload:', params);
                response = await callLogsApi.getLogs(params);
                console.log('Call logs response:', response);
            } else {
                console.log('Fetching Interaction logs with payload:', params);
                response = await interactionLogsApi.getLogs(params);
                console.log('Interaction logs response:', response);
            }

            // When filtering by 'answered' on interactions (which don't have this field natively), 
            // the API handles it, but typically it applies strictly to call-logs.
            
            const newData = response?.data || (Array.isArray(response) ? response : []);
            
            if (response?.stats) {
                setCurrentStats(response.stats);
            } else if (pageNumber === 1) {
                setCurrentStats(null);
            }
            
            if (shouldRefresh) {
                setHistory(newData);
                setPage(1);
                pageRef.current = 1;
            } else {
                setHistory(prev => [...prev, ...newData]);
                setPage(pageNumber);
                pageRef.current = pageNumber;
            }
            
            const more = newData.length === LIMIT;
            setHasMore(more);
            hasMoreRef.current = more;
            
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsMoreLoading(false);
            isMoreLoadingRef.current = false;
        }
    };

    // Check user:read permission on mount
    useEffect(() => {
        const checkPermission = async () => {
            const hasGroupPermission = await authService.hasPermission('user', 'read');
            setCanViewGroup(hasGroupPermission);
        };
        checkPermission();
    }, []);

    // Re-fetch whenever filters or tab changes
    useEffect(() => {
        loadHistory(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, answeredFilter, dateFilter, appliedFromDate, appliedToDate, groupFilters]);

    useFocusEffect(
        useCallback(() => {
            loadHistory(1, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [activeTab])  // Reload when tab changes focus
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
        const lowerOutcome = (outcome || '').toLowerCase();
        if (lowerOutcome.includes('missed') || lowerOutcome.includes('dint pick') || duration === 0) {
            return { name: 'call', color: '#EF4444' }; // Red for missed/no-pickup
        }
        return { name: 'call', color: '#10B981' }; // Green for connected
    };

    const navigation = useNavigation<any>();

    // ...

    const handleTabChange = (tab: 'calls' | 'interactions') => {
        if (tab === activeTab) return;
        
        // Reset all filters
        setAnsweredFilter('all');
        setDateFilter('all');
        setGroupFilters({ group: false, userId: '' });
        setFromDate(new Date());
        setToDate(new Date());
        setAppliedFromDate(new Date());
        setAppliedToDate(new Date());
        
        // Change tab (this will trigger the useEffect to loadHistory)
        setActiveTab(tab);
    };

    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <TouchableOpacity
                style={[
                    styles.tab,
                    activeTab === 'calls' && [styles.activeTab, { backgroundColor: colors.primary }]
                ]}
                onPress={() => handleTabChange('calls')}
            >
                <Icon 
                    name="call" 
                    size={20} 
                    color={activeTab === 'calls' ? '#FFF' : colors.textSecondary} 
                />
                <Text style={[
                    styles.tabText,
                    activeTab === 'calls' ? { color: '#FFF' } : { color: colors.textSecondary }
                ]}>
                    Call Logs
                </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
                style={[
                    styles.tab,
                    activeTab === 'interactions' && [styles.activeTab, { backgroundColor: colors.primary }]
                ]}
                onPress={() => handleTabChange('interactions')}
            >
                <Icon 
                    name="chatbubbles" 
                    size={20} 
                    color={activeTab === 'interactions' ? '#FFF' : colors.textSecondary} 
                />
                <Text style={[
                    styles.tabText,
                    activeTab === 'interactions' ? { color: '#FFF' } : { color: colors.textSecondary }
                ]}>
                    Interactions
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderFilters = () => {
        const dateFilters = [
            { id: 'all', label: 'All' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Custom' }
        ];

        return (
            <TouchableWithoutFeedback onPress={() => {
                setIsAnsweredDropdownOpen(false);
                setIsDateDropdownOpen(false);
            }}>
                <View style={styles.filtersContainer}>
                    {/* Answered Filter Dropdown */}
                <View style={styles.filterGroup}>
                    <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Answered</Text>
                    <TouchableOpacity
                        style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                        onPress={() => {
                            setIsAnsweredDropdownOpen(!isAnsweredDropdownOpen);
                            setIsDateDropdownOpen(false);
                        }}
                    >
                        <Text style={[styles.dropdownText, { color: colors.textPrimary, textTransform: 'capitalize' }]}>
                            {answeredFilter}
                        </Text>
                        <Icon name={isAnsweredDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {isAnsweredDropdownOpen && (
                        <View style={[styles.dropdownList, { borderColor: colors.border, backgroundColor: colors.card }]}>
                            {['all', 'yes', 'no'].map(status => (
                                <TouchableOpacity
                                    key={status}
                                    style={[styles.dropdownItem, answeredFilter === status && { backgroundColor: colors.primary + '20' }]}
                                    onPress={() => {
                                        setAnsweredFilter(status as any);
                                        setIsAnsweredDropdownOpen(false);
                                    }}
                                >
                                    <Text style={[styles.itemTitle, { color: colors.textPrimary, textTransform: 'capitalize' }]}>{status}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Date Filter Dropdown */}
                <View style={[styles.filterGroup, { zIndex: isAnsweredDropdownOpen ? 1 : 10 }]}>
                    <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Date Range</Text>
                    <TouchableOpacity
                        style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                        onPress={() => {
                            setIsDateDropdownOpen(!isDateDropdownOpen);
                            setIsAnsweredDropdownOpen(false);
                        }}
                    >
                        <Text style={[styles.dropdownText, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                            {dateFilters.find(f => f.id === dateFilter)?.label || 'All'}
                        </Text>
                        <Icon name={isDateDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {isDateDropdownOpen && (
                        <View style={[styles.dropdownList, { borderColor: colors.border, backgroundColor: colors.card }]}>
                            {dateFilters.map(item => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.dropdownItem, dateFilter === item.id && { backgroundColor: colors.primary + '20' }]}
                                    onPress={() => {
                                        setIsDateDropdownOpen(false);
                                        if (item.id === 'custom') {
                                            setShowCustomDateModal(true);
                                            // Sync local picker state with currently applied dates when opening
                                            setFromDate(appliedFromDate);
                                            setToDate(appliedToDate);
                                        } else {
                                            setDateFilter(item.id as any);
                                        }
                                    }}
                                >
                                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Group Filter Icon (only for users with user:read) */}
                {canViewGroup && (
                    <View style={styles.filterGroupIcon}>
                        <TouchableOpacity
                            style={[
                                styles.dropdownTrigger,
                                {
                                    borderColor: (groupFilters.group || groupFilters.userId) ? colors.primary : colors.border,
                                    backgroundColor: (groupFilters.group || groupFilters.userId) ? colors.primary + '15' : colors.inputBackground,
                                    justifyContent: 'center',
                                    paddingHorizontal: scale(12),
                                }
                            ]}
                            onPress={() => setIsGroupFilterModalVisible(true)}
                        >
                            <Icon
                                name="filter"
                                size={moderateScale(18)}
                                color={(groupFilters.group || groupFilters.userId) ? colors.primary : colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Stats Icon */}
                <View style={styles.filterGroupIcon}>
                    <TouchableOpacity
                        style={[
                            styles.dropdownTrigger,
                            {
                                borderColor: currentStats ? colors.primary : colors.border,
                                backgroundColor: currentStats ? colors.primary + '15' : colors.inputBackground,
                                justifyContent: 'center',
                                paddingHorizontal: scale(12),
                            }
                        ]}
                        onPress={() => setShowStatsModal(true)}
                    >
                        <Icon
                            name="stats-chart"
                            size={moderateScale(18)}
                            color={currentStats ? colors.primary : colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </View>
            </TouchableWithoutFeedback>
        );
    };

    const handlePressItem = (item: CallLog) => {
        navigation.navigate('LeadHistory', {
            leadId: item.leadId,
            leadName: item.leadName || `Lead #${item.leadId}`,
            leadNumber: item.leadNumber || item.LeadNumber,
            logType: activeTab === 'interactions' ? 'interactions' : 'calls',
        });
    };

    const handleCall = (phoneNumber?: string, item?: CallLog) => {
        performCall(phoneNumber, {
            leadId: item?.leadId, // History item has leadId (number usually)
            name: item?.leadName,
            stageId: item?.stageId?._id
        });
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadHistory(1, true);
    };

    const handleLoadMore = () => {
        if (!isMoreLoadingRef.current && hasMoreRef.current && !loading) {
            loadHistory(pageRef.current + 1, false);
        }
    };

    const renderItem = ({ item }: { item: CallLog }) => {
        const iconInfo = getIconForOutcome(item.outcome, item.duration);
        const date = new Date(item.createdAt);

        return (
            <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => handlePressItem(item)}
                style={[
                    styles.listItem,
                    {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        shadowColor: isDark ? '#000' : '#64748B',
                    }
                ]}
            >
                <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.leadName || `Lead #${item.leadId}`}
                        </Text>
                        <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
                            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>

                    <View style={styles.itemSubHeader}>
                        <View style={styles.tagContainer}>
                            <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>#{item.leadId}</Text>
                        </View>
                        
                        {item.stageId?.name && (
                            <>
                                <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>•</Text>
                                <View style={[styles.tagContainer, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{item.stageId.name}</Text>
                                </View>
                            </>
                        )}
                        
                        {activeTab === 'calls' && (
                            <>
                                <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>•</Text>
                                <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{formatDuration(item.duration)}</Text>
                            </>
                        )}

                        <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>•</Text>
                        <Text style={[styles.callerName, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.userId?.name?.split(' ')[0] || 'Unknown'}
                        </Text>
                    </View>

                    {item.remark && activeTab === 'calls' && (
                        <View style={[styles.remarkBubble, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                            <View style={{ marginRight: scale(6) }}>
                                <Icon name="chatbubble-ellipses-outline" size={moderateScale(12)} color={colors.textSecondary} />
                            </View>
                            <Text style={[styles.itemRemark, { color: colors.textSecondary }]} numberOfLines={1}>
                                {item.remark}
                            </Text>
                        </View>
                    )}
                    
                    {activeTab === 'interactions' && (
                        <View style={[styles.remarkBubble, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                            <View style={{ marginRight: scale(6) }}>
                                <Icon name={item.source === 'whatsapp' ? 'logo-whatsapp' : 'flash-outline'} size={moderateScale(12)} color={item.source === 'whatsapp' ? '#25D366' : colors.textSecondary} />
                            </View>
                            <Text style={[styles.itemRemark, { color: colors.textSecondary }]} numberOfLines={1}>
                                {item.source ? item.source.charAt(0).toUpperCase() + item.source.slice(1) : 'Unknown'} • {item.outcome || 'No outcome recorded'}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />
            {renderTabs()}
            
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
                                    minimumDate={new Date('2025-01-01')}
                                    maximumDate={new Date()}
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
                                    minimumDate={new Date('2025-01-01')}
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
                                onPress={() => { setShowCustomDateModal(false); setDateFilter('all'); }}
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
                                    setDateFilter('custom');
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {renderFilters()}

            {history.length === 0 && !loading ? (
                <EmptyState
                    icon="time-outline"
                    title={activeTab === 'calls' ? "No Call History" : "No Interactions"}
                    description={activeTab === 'calls' ? "You haven't made any calls yet." : "No interaction logs found."}
                    actionLabel="Refresh Information"
                    onAction={() => loadHistory(1, true)}
                />
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item, index) => `${item._id || index}-${index}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() => (
                        isMoreLoading ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator color={colors.primary} />
                            </View>
                        ) : null
                    )}
                />
            )}

            {/* Group Filter Modal */}
            <HistoryFilterModal
                visible={isGroupFilterModalVisible}
                onClose={() => setIsGroupFilterModalVisible(false)}
                initialFilters={groupFilters}
                onApply={(newFilters) => {
                    setGroupFilters(newFilters);
                    setIsGroupFilterModalVisible(false);
                }}
            />

            {/* Stats Modal */}
            {showStatsModal && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, width: '85%' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(20) }}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                                {activeTab === 'calls' ? 'Call Statistics' : 'Interaction Statistics'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                                <Icon name="close" size={scale(24)} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        {activeTab === 'calls' ? (
                            <View style={{ gap: scale(16) }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: moderateScale(15) }}>Total Dials</Text>
                                    <Text style={{ color: colors.textPrimary, fontSize: moderateScale(15), fontWeight: '600' }}>{currentStats?.totalDials || 0}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: moderateScale(15) }}>Total Answered</Text>
                                    <Text style={{ color: colors.textPrimary, fontSize: moderateScale(15), fontWeight: '600' }}>{currentStats?.totalAnswered || 0}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: moderateScale(15) }}>Total Talk Time</Text>
                                    <Text style={{ color: colors.textPrimary, fontSize: moderateScale(15), fontWeight: '600' }}>{formatDuration(currentStats?.totalTalkTime || 0)}</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={{ gap: scale(16) }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: moderateScale(15) }}>Total Interactions</Text>
                                    <Text style={{ color: colors.textPrimary, fontSize: moderateScale(15), fontWeight: '600' }}>{currentStats?.totalInteractions || 0}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: moderateScale(15) }}>Unique Leads</Text>
                                    <Text style={{ color: colors.textPrimary, fontSize: moderateScale(15), fontWeight: '600' }}>{currentStats?.uniqueLeads || 0}</Text>
                                </View>
                            </View>
                        )}
                        

                    </View>
                </View>
            )}

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: scale(16),
        paddingBottom: scale(12),
        gap: scale(12),
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(10),
        borderRadius: moderateScale(12),
        backgroundColor: 'rgba(0,0,0,0.03)',
        gap: scale(8),
    },
    activeTab: {
        backgroundColor: '#0284C7',
    },
    tabText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
    },
    filtersContainer: {
        flexDirection: 'row',
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
        gap: scale(12),
        zIndex: 100,
        elevation: 10,
        alignItems: 'flex-end', // Align icon button to bottom of item (no label)
    },
    filterGroup: {
        flex: 1,
        gap: scale(8),
        zIndex: 100, // Ensure inner groups stack correctly
    },
    filterGroupLabel: {
        fontSize: moderateScale(12),
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
        borderWidth: 1,
        borderRadius: moderateScale(12),
    },
    dropdownText: {
        fontSize: moderateScale(13),
        flex: 1,
        marginRight: scale(4),
    },
    dropdownList: {
        position: 'absolute',
        top: verticalScale(70),
        left: 0,
        right: 0,
        borderWidth: 1,
        borderRadius: moderateScale(12),
        maxHeight: verticalScale(300), // Height ample to display 6 options without scroll
        overflow: 'hidden',
        elevation: 15, // Extremely high elevation for dropdowns overlaying FlatLists
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        zIndex: 1000,
    },
    filterGroupIcon: {
        gap: scale(8),
        justifyContent: 'flex-end',
    },
    dropdownItem: {
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(16),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    itemTitle: {
        fontSize: moderateScale(14),
    },
    listContent: {
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(12),
        paddingBottom: verticalScale(100),
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
    listItem: {
        flexDirection: 'row',
        padding: scale(14),
        marginBottom: verticalScale(10),
        borderRadius: moderateScale(16),
        alignItems: 'center',
        shadowOffset: { width: 0, height: verticalScale(2) },
        shadowOpacity: 0.05,
        shadowRadius: moderateScale(8),
        elevation: 1.5,
    },
    iconContainer: {
        width: moderateScale(44),
        height: moderateScale(44),
        borderRadius: moderateScale(22),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(14),
    },
    itemContent: {
        flex: 1,
        justifyContent: 'center',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(4),
    },
    itemName: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        flex: 1,
        marginRight: scale(8),
        letterSpacing: -0.2,
    },
    itemTime: {
        fontSize: moderateScale(11),
        fontWeight: '500',
    },
    itemSubHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagContainer: {
        backgroundColor: 'rgba(0,0,0,0.04)',
        paddingHorizontal: scale(6),
        paddingVertical: verticalScale(2),
        borderRadius: moderateScale(6),
    },
    itemDetail: {
        fontSize: moderateScale(12),
        fontWeight: '600',
    },
    dotSeparator: {
        fontSize: moderateScale(12),
        marginHorizontal: scale(6),
        opacity: 0.5,
    },
    callerName: {
        fontSize: moderateScale(12),
        fontWeight: '500',
        flex: 1,
    },
    remarkBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(8),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(8),
        alignSelf: 'flex-start',
        maxWidth: '100%',
    },
    itemRemark: {
        fontSize: moderateScale(12),
        fontWeight: '500',
        flexShrink: 1,
    },
});
