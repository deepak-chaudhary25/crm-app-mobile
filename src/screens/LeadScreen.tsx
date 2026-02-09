
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, StatusBar, Alert, Linking, ActivityIndicator, TextInput, LayoutAnimation, Platform, UIManager, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';
import { LeadCard } from '../components/LeadCard';

import { SkeletonLeadCard } from '../components/SkeletonLeadCard';
import { Loader } from '../components/Loader';
import { EmptyState } from '../components/EmptyState';
import { ScheduleModal } from '../components/ScheduleModal';
import { Button } from '../components/Button';
import { CallFeedbackModal } from '../components/CallFeedbackModal';
import { useCallHandling } from '../hooks/useCallHandling';
import { leadsApi, callLogsApi, stagesApi, usersApi, schedulesApi } from '../services/api';
import { AssignLeadsModal } from '../components/AssignLeadsModal';
import { authService } from '../services/auth';
import { callLogService, CallLogEntry } from '../services/callLog';
import { historyService, Interaction } from '../services/history';
import { socketService } from '../services/socket';
import { notificationHelper } from '../utils/notificationHelper'; // Added import
import { FilterModal } from '../components/FilterModal';
import { Lead } from '../types';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// const FILTERS removed - using dynamic stages

export const LeadScreen = () => {
    const { colors, isDark } = useAppTheme();
    const navigation = useNavigation<any>();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

    // Filter State
    const [stages, setStages] = useState<any[]>([]);
    const [activeStageId, setActiveStageId] = useState<string | null>(null); // null means "All"
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState<any>({});
    const [users, setUsers] = useState<any[]>([]);

    // API State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);


    // Call Tracking State - Replaced by Hook
    const { handleCall: performCall, feedbackModalVisible, currentCallLog, blockingCall, handleSaveFeedback } = useCallHandling({
        onFeedbackSuccess: () => fetchLeads(1, true)
    });



    // Schedule Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [canAssign, setCanAssign] = useState(false);

    // Bulk Assignment State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [assignModalVisible, setAssignModalVisible] = useState(false);

    useEffect(() => {
        fetchStages();
        fetchUsers();
        fetchLeads(1, true); // Initial Fetch
        const initPermissions = async () => {
            const hasCallLogPermission = await callLogService.requestPermission();
            if (hasCallLogPermission) {
                // Only ask for notification permission if call log flow is done/interacted with
                // Or just chain them sequentially
                await notificationHelper.requestPermission();
            } else {
                await notificationHelper.requestPermission();
            }
        };
        initPermissions();


        checkPermissions();

        // Socket Connection
        socketService.connect();

        // Note: Event handling is now centralized in socket.ts to avoid duplicates
        // and ensure consistent behavior (Alert + Notification)

        return () => {
            socketService.disconnect();
        };
    }, []);

    // Debounce Search
    useEffect(() => {
        if (typingTimeout) clearTimeout(typingTimeout);

        const timeout = setTimeout(() => {
            fetchLeads(1, true);
        }, 500);

        setTypingTimeout(timeout);

        return () => clearTimeout(timeout);
    }, [searchQuery, activeStageId]); // filters dependency added manually in handleApply

    const checkPermissions = async () => {
        const hasPermission = await authService.hasPermission('leads', 'assign');
        setCanAssign(hasPermission);
    };

    const [canViewUsers, setCanViewUsers] = useState(false); // Added state

    // ... (existing code)

    const fetchUsers = async () => {
        const hasPermission = await authService.hasPermission('user', 'read');
        setCanViewUsers(hasPermission);

        if (hasPermission) {
            try {
                const data = await usersApi.getUsers();
                setUsers(data);
            } catch (error) {
                console.error('Failed to fetch users', error);
            }
        }
    };

    const toggleSelection = (id: string) => {
        if (selectedLeads.includes(id)) {
            setSelectedLeads(prev => prev.filter(lid => lid !== id));
        } else {
            setSelectedLeads(prev => [...prev, id]);
        }
    };

    const handleCancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedLeads([]);
    };

    const handleAssignLeads = async (userId: string, reason: string) => {
        try {
            // Call the API
            await leadsApi.bulkAssign(selectedLeads, userId, reason);
            console.log(`Assigned ${selectedLeads.length} leads to ${userId} for: ${reason}`);

            Alert.alert('Success', `Assigned ${selectedLeads.length} leads successfully!`);

            setAssignModalVisible(false);
            handleCancelSelection();
            // Refresh leads to show updated assignment
            fetchLeads(1, true);
        } catch (error: any) {
            console.error('Assignment failed:', error);
            Alert.alert('Error', error.message || 'Failed to assign leads');
        }
    };

    /* useFocusEffect
        useCallback(() => {
            checkBlockingState();
        }, [])
    ); */ // Hook handles focusing check

    // checkBlockingState, handleAppStateChange, checkLastCall REMOVED (handled by hook)

    const fetchStages = async () => {
        try {
            const data = await stagesApi.getStages();
            // Sort by order if available, or just keep as is
            const sorted = data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setStages(sorted);
        } catch (error) {
            console.error('Failed to fetch stages', error);
        }
    };

    const fetchLeads = async (pageNumber = 1, shouldRefresh = false) => {
        if (shouldRefresh) {
            setLoading(true);
            setPage(1);
        } else {
            setLoadingMore(true);
        }

        try {
            const stageParams = activeStageId ? { stageId: activeStageId } : {};
            const searchParams = searchQuery ? { search: searchQuery } : {};

            // Combine all params
            const params = {
                page: pageNumber,
                limit: 10,
                ...stageParams,
                ...searchParams,
                ...filters
            };

            const response = await leadsApi.getLeads(params);
            const newLeads = response.data;

            if (shouldRefresh) {
                setLeads(newLeads);
            } else {
                setLeads(prev => [...prev, ...newLeads]);
            }

            // Check if we reached the end
            if (newLeads.length < 10) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (!shouldRefresh) {
                setPage(pageNumber);
            }

        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.message || 'Failed to fetch leads');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            fetchLeads(page + 1, false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchLeads(1, true);
    };

    const handleApplyFilters = (newFilters: any) => {
        setFilters(newFilters);
        setIsFilterModalVisible(false);
        // We need to trigger fetch with new filters. 
        // Since state update is async, we can pass it directly or use a timeout/effect.
        // It's cleaner to just call fetchLeads with the new filters merged into what it uses.
        // But fetchLeads reads from state 'filters'. 
        // So we will cheat slightly and pass it validation, or rely on useEffect if we added filters to dep array.
        // But adding filters to dep array might cause double renders.
        // Let's modify fetchLeads to accept overrides or just wait for re-render if we put it in useEffect?
        // Actually, just calling fetchLeads here might use stale state. 
        // Better:

        // We will execute this logic:
        setLoading(true); // Optimistic loading
        setTimeout(() => {
            // In next tick, state should be updated? No, standard React batching.
            // Actually, the useEffect on [filters] is safest if we want to ensure state is sync.
            // BUT, we already have manual calls.

            // Let's refactor `fetchLeads` to OPTIONALLY take filterOverrides.
            // OR, just set the state and add `filters` to the useEffect dependency array?
            // If we add `filters` to the existing useEffect deps [searchQuery, activeStageId], it handles it automatically!
        }, 0);
    };

    // Better approach:
    // We already have a useEffect listening to [searchQuery, activeStageId].
    // Let's add `filters` to it.
    useEffect(() => {
        if (loading) return; // Prevent double fetch on mount if caused by initial state
        const timeout = setTimeout(() => {
            fetchLeads(1, true);
        }, 100); // Short debounce
        return () => clearTimeout(timeout);
    }, [filters]); // Trigger when filters change


    // Legacy logic removed

    const handleCall = async (phoneNumber?: string, lead?: any) => {
        performCall(phoneNumber, lead);
    };

    // handleSaveFeedback REMOVED (handled by hook)
    // ---------------------------

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

    const handleWhatsApp = async (phoneNumber?: string, lead?: any) => {
        // Also check blocking state for WhatsApp? Optional, but strict blocking says YES.
        // For now let's apply blocking to Calls only as requested, 
        // BUT user effectively is "working" on a lead.
        // Let's keep it simple: Calls block.

        if (!phoneNumber) {
            Alert.alert('No Number', 'This lead does not have a phone number.');
            return;
        }
        let cleanNumber = phoneNumber.replace(/\D/g, '');
        if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

        const url = `whatsapp://send?phone=${cleanNumber}`;
        Linking.openURL(url).catch(() => {
            Linking.openURL(`https://wa.me/${cleanNumber}`).catch(() =>
                Alert.alert('Error', 'WhatsApp is not installed.')
            );
        });

        // We could also record this interaction automatically
        const interaction: Interaction = {
            id: Date.now().toString(),
            leadId: lead.leadId || lead._id,
            leadName: lead.name,
            type: 'WHATSAPP',
            timestamp: Date.now(),
            date: new Date().toISOString(),
            remarks: 'Opened WhatsApp'
        };
        historyService.addInteraction(interaction);
    };

    const handleOpenSchedule = (lead: any) => {
        setSelectedLead(lead);
        setModalVisible(true);
    };

    const handleSaveSchedule = async (date: Date, notes: string) => {
        try {
            // API Call
            await schedulesApi.createSchedule({
                leadId: Number(selectedLead.leadId), // Ensure number
                scheduledAt: date.toISOString()
            });

            setModalVisible(false);
            Alert.alert('Success', 'Meeting scheduled successfully!');

            // Record interaction locally (optional, for history view)
            historyService.addInteraction({
                id: Date.now().toString(),
                leadId: selectedLead.leadId || selectedLead._id,
                leadName: selectedLead.name,
                type: 'MEETING',
                remarks: `Scheduled: ${notes}`,
                timestamp: Date.now(),
                date: date.toISOString()
            });

        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.message || 'Failed to save schedule');
        }
    };

    const handleDetail = (lead: any) => {
        const flatLead = {
            id: lead._id,
            leadId: lead.leadId?.toString(),
            name: lead.name,
            assignedTo: lead.assignedTo?.name || 'Unassigned',
            status: lead.stageId?.name || 'New',
            score: lead.healthScore || 0,
            phoneNumber: lead.phone,
            email: lead.email,
            initials: getInitials(lead.name),
            initialsColor: getInitialsColor(lead.name)
        };
        navigation.navigate('LeadDetail', { lead: flatLead });
    };

    const renderHeader = () => (
        <View style={[styles.header, { backgroundColor: colors.background }]}>
            {!isSearchVisible ? (
                // Normal Header with Title & Icons
                <View style={styles.headerRow}>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>All Leads</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setIsSearchVisible(true)}>
                            <Icon name="search" size={moderateScale(24)} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setIsFilterModalVisible(true)}>
                            <View>
                                <Icon name="filter" size={moderateScale(24)} color={colors.primary} />
                                {Object.keys(filters).length > 0 && (
                                    <View style={{
                                        position: 'absolute', top: -5, right: -5,
                                        width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error
                                    }} />
                                )}
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={handleRefresh}>
                            <Icon name="refresh" size={moderateScale(24)} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                // Search Mode Header
                <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Icon name="search" size={moderateScale(20)} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Search people..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    <TouchableOpacity onPress={() => {
                        setSearchQuery('');
                        setIsSearchVisible(false);
                    }}>
                        <Icon name="close" size={moderateScale(24)} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderFilters = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
        >
            {/* All Option */}
            <TouchableOpacity
                style={[
                    styles.chip,
                    activeStageId === null ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
                ]}
                onPress={() => setActiveStageId(null)}
            >
                <Text style={[
                    styles.chipText,
                    activeStageId === null ? { color: '#FFF' } : { color: colors.textPrimary }
                ]}>
                    All
                </Text>
            </TouchableOpacity>

            {/* Stage Options */}
            {stages.map((stage) => {
                const isActive = activeStageId === stage._id;
                return (
                    <TouchableOpacity
                        key={stage._id}
                        style={[
                            styles.chip,
                            isActive ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
                        ]}
                        onPress={() => setActiveStageId(stage._id)}
                    >
                        <Text style={[
                            styles.chipText,
                            isActive ? { color: '#FFF' } : { color: colors.textPrimary }
                        ]}>
                            {stage.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />
            {renderHeader()}


            <View style={styles.content}>
                <View style={{ height: verticalScale(50) }}>
                    {renderFilters()}
                </View>

                {loading && leads.length === 0 ? (
                    <View style={{ flex: 1, paddingTop: verticalScale(8), paddingHorizontal: scale(16) }}>
                        {[1, 2, 3, 4].map(key => (
                            <SkeletonLeadCard key={key} />
                        ))}
                    </View>
                ) : leads.length === 0 ? (
                    <View style={{ paddingHorizontal: scale(16) }}>
                        <EmptyState
                            icon={searchQuery ? 'search-outline' : 'people-outline'}
                            title={searchQuery ? 'No Results Found' : 'No Leads Found'}
                            description={searchQuery
                                ? `We couldn't find any leads matching "${searchQuery}".\nTry a different search term.`
                                : activeStageId
                                    ? `You don't have any leads in this stage.`
                                    : "You haven't added any leads yet."}
                            actionLabel={!searchQuery && !activeStageId ? "Refresh" : undefined}
                            onAction={() => fetchLeads(1, true)}
                        />
                    </View>
                ) : (
                    <FlatList
                        data={leads}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <LeadCard
                                name={item.name}
                                leadId={`#${item.leadId}`} // Add # prefix
                                assignedTo={item.assignedTo?.name || 'Unassigned'}
                                status={item.stageId?.name as any || 'New'}
                                score={item.healthScore || 0}
                                initials={getInitials(item.name)}
                                initialsColor={getInitialsColor(item.name)}
                                phoneNumber={item.phone}
                                email={item.email}
                                selectable={isSelectionMode}
                                isSelected={selectedLeads.includes(item._id)}
                                onToggleSelection={() => toggleSelection(item._id)}
                                onPressWhatsApp={() => handleWhatsApp(item.phone, item)}
                                onPressCall={() => handleCall(item.phone, item)}
                                onPressSchedule={() => handleOpenSchedule(item)}
                                onPressDetail={() => handleDetail(item)}
                                source={item.source}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} /> : null}
                    />
                )}
            </View>



            {/* FABS */}
            {/* FABS & ACTION BAR */}
            {
                !isSelectionMode ? (
                    canAssign && (
                        <TouchableOpacity
                            style={[styles.fab, { backgroundColor: colors.fab }]}
                            onPress={() => setIsSelectionMode(true)}
                        >
                            <Icon name="person-add" size={20} color={colors.fabIcon} />
                            <Text style={styles.fabText}>Assign</Text>
                        </TouchableOpacity>
                    )
                ) : (
                    <View style={[styles.selectionBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={handleCancelSelection}
                        >
                            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>

                        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                            {selectedLeads.length} Selected
                        </Text>

                        <Button
                            title="Assign"
                            onPress={() => {
                                if (selectedLeads.length === 0) {
                                    Alert.alert('Select Leads', 'Please select at least one lead to assign.');
                                    return;
                                }
                                setAssignModalVisible(true);
                            }}
                            style={{ width: 120, paddingVertical: 10 }}
                        />
                    </View>
                )
            }

            <AssignLeadsModal
                visible={assignModalVisible}
                count={selectedLeads.length}
                leads={leads.filter(l => selectedLeads.includes(l._id))}
                onClose={() => setAssignModalVisible(false)}
                onAssign={handleAssignLeads}
            />

            <ScheduleModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleSaveSchedule}
                leadName={selectedLead?.name}
            />

            <CallFeedbackModal
                visible={feedbackModalVisible}
                callLog={currentCallLog}
                leadName={blockingCall?.leadName || 'Unknown Lead'}
                currentStageId={blockingCall?.stageId}
                onSave={handleSaveFeedback}
            />

            <FilterModal
                visible={isFilterModalVisible}
                onClose={() => setIsFilterModalVisible(false)}
                onApply={(newFilters) => {
                    setFilters(newFilters);
                    setIsFilterModalVisible(false);
                }}
                users={users}
                initialFilters={filters}
                canViewUsers={canViewUsers}
            />
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        // paddingHorizontal: scale(16), // REMOVED to allow full-width scroll
    },
    header: {
        paddingHorizontal: scale(16),
        paddingTop: verticalScale(16),
        paddingBottom: 0,
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: verticalScale(48),
        borderRadius: moderateScale(12),
        paddingHorizontal: scale(12),
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        marginLeft: scale(8),
        fontSize: moderateScale(16),
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBtn: {
        marginLeft: scale(16),
    },
    filterContainer: {
        paddingTop: verticalScale(4),
        paddingBottom: verticalScale(8),
        paddingHorizontal: scale(16),
    },
    chip: {
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(10),
        borderRadius: moderateScale(20),
        marginRight: scale(10),
        minHeight: verticalScale(36),
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipText: {
        fontWeight: '600',
        fontSize: moderateScale(14),
    },
    listContent: {
        paddingHorizontal: scale(16), // ADDED
        paddingBottom: verticalScale(80),
    },
    fab: {
        position: 'absolute',
        bottom: verticalScale(20),
        right: scale(20),
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(14),
        borderRadius: moderateScale(28),
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: verticalScale(4) },
        shadowOpacity: 0.3,
        shadowRadius: moderateScale(8),
        elevation: 6,
    },
    fabText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: moderateScale(16),
        marginLeft: scale(8),
    },
    devTokenContainer: {
        padding: scale(16),
        marginHorizontal: scale(16),
        marginBottom: verticalScale(8),
        borderRadius: moderateScale(12),
    },
    devLabel: {
        fontSize: moderateScale(12),
        fontWeight: '700',
        marginBottom: verticalScale(8),
        textTransform: 'uppercase',
    },
    tokenInput: {
        height: verticalScale(40),
        borderWidth: 1,
        borderRadius: moderateScale(8),
        paddingHorizontal: scale(12),
        marginBottom: verticalScale(8),
    },
    selectionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: scale(16),
        paddingBottom: Platform.OS === 'ios' ? verticalScale(34) : verticalScale(16), // Safe area for iOS
        borderTopWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: verticalScale(-2) },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(4),
        elevation: 10,
    },
    cancelBtn: {
        padding: scale(8),
    },
    cancelText: {
        fontSize: moderateScale(16),
        fontWeight: '600',
    }
});
