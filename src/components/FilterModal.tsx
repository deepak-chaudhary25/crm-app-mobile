import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { Button } from './Button';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: any) => void;
    users: any[];
    initialFilters: any;
    canViewUsers?: boolean;
}

const DATE_PRESETS = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom' },
];

export const FilterModal = ({ visible, onClose, onApply, users, initialFilters, canViewUsers = false }: FilterModalProps) => {
    const { colors, isDark } = useAppTheme();

    const [assignedTo, setAssignedTo] = useState('');
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');

    // Date filter state
    const [datePreset, setDatePreset] = useState<string>('all');
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    // Boolean filters
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [isScheduler, setIsScheduler] = useState<boolean | null>(null);

    useEffect(() => {
        if (visible) {
            setAssignedTo(initialFilters.assignedTo || '');

            // Restore date filter state
            if (initialFilters.dateFilter) {
                setDatePreset(initialFilters.dateFilter);
            } else if (initialFilters.fromDate || initialFilters.toDate) {
                setDatePreset('custom');
            } else {
                setDatePreset('all');
            }

            if (initialFilters.fromDate) {
                setFromDate(new Date(initialFilters.fromDate));
            } else {
                setFromDate(new Date());
            }
            if (initialFilters.toDate) {
                setToDate(new Date(initialFilters.toDate));
            } else {
                setToDate(new Date());
            }

            setIsConnected(initialFilters.connected === 'true' || initialFilters.connected === true ? true : initialFilters.connected === 'false' || initialFilters.connected === false ? false : null);
            setIsScheduler(initialFilters.scheduler === 'true' || initialFilters.scheduler === true ? true : initialFilters.scheduler === 'false' || initialFilters.scheduler === false ? false : null);
            setIsUserDropdownOpen(false);
            setUserSearchQuery('');
        }
    }, [visible, initialFilters]);

    const formatDateStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateDisplay = (d: Date) => {
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleApply = () => {
        const filters: any = {};
        if (assignedTo) filters.assignedTo = assignedTo;

        // Date filters
        if (datePreset !== 'all') {
            if (datePreset === 'custom') {
                filters.fromDate = formatDateStr(fromDate);
                filters.toDate = formatDateStr(toDate);
                filters.dateFilter = 'custom';
            } else {
                filters.dateFilter = datePreset; // today | week | month | year
            }
        }

        if (isConnected !== null) filters.connected = isConnected;
        if (isScheduler !== null) filters.scheduler = isScheduler;

        onApply(filters);
    };

    const handleClear = () => {
        setAssignedTo('');
        setDatePreset('all');
        setFromDate(new Date());
        setToDate(new Date());
        setIsConnected(null);
        setIsScheduler(null);
        setUserSearchQuery('');
    };

    const renderBooleanFilter = (label: string, value: boolean | null, onChange: (val: boolean | null) => void) => (
        <View style={styles.boolContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
            <View style={styles.boolOptions}>
                <TouchableOpacity
                    style={[styles.boolBtn, { borderColor: colors.border }, value === true && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => onChange(value === true ? null : true)}
                >
                    <Text style={[styles.boolBtnText, value === true ? { color: '#FFF' } : { color: colors.textPrimary }]}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.boolBtn, { borderColor: colors.border }, value === false && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => onChange(value === false ? null : false)}
                >
                    <Text style={[styles.boolBtnText, value === false ? { color: '#FFF' } : { color: colors.textPrimary }]}>No</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const getSelectedUserName = () => {
        if (!assignedTo) return 'All Users';
        const user = users.find(u => u._id === assignedTo);
        return user ? user.name : 'Unknown User';
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Filters</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Users Dropdown */}
                        {canViewUsers && (
                            <>
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Assigned To</Text>

                                <TouchableOpacity
                                    style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                                    onPress={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                >
                                    <Text style={[styles.dropdownText, { color: assignedTo ? colors.textPrimary : colors.textSecondary }]}>
                                        {getSelectedUserName()}
                                    </Text>
                                    <Icon name={isUserDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                                </TouchableOpacity>

                                {isUserDropdownOpen && (
                                    <View style={[styles.dropdownList, { borderColor: colors.border, backgroundColor: colors.card }]}>
                                        {/* Search Input */}
                                        <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
                                            <View style={{ marginRight: 8 }}>
                                                <Icon name="search" size={20} color={colors.textSecondary} />
                                            </View>
                                            <TextInput
                                                style={[styles.searchInput, { color: colors.textPrimary }]}
                                                placeholder="Search user..."
                                                placeholderTextColor={colors.textSecondary}
                                                value={userSearchQuery}
                                                onChangeText={setUserSearchQuery}
                                            />
                                        </View>

                                        <ScrollView nestedScrollEnabled={true} style={{ maxHeight: verticalScale(200) }}>
                                            <TouchableOpacity
                                                style={[styles.dropdownItem, !assignedTo && { backgroundColor: colors.primary + '20' }]}
                                                onPress={() => {
                                                    setAssignedTo('');
                                                    setIsUserDropdownOpen(false);
                                                }}
                                            >
                                                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>All Users</Text>
                                            </TouchableOpacity>
                                            {filteredUsers.map(user => (
                                                <TouchableOpacity
                                                    key={user._id}
                                                    style={[styles.dropdownItem, assignedTo === user._id && { backgroundColor: colors.primary + '20' }]}
                                                    onPress={() => {
                                                        setAssignedTo(user._id);
                                                        setIsUserDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{user.name}</Text>
                                                    <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{user.email}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {filteredUsers.length === 0 && (
                                                <View style={{ padding: 16, alignItems: 'center' }}>
                                                    <Text style={{ color: colors.textSecondary }}>No users found</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </>
                        )}

                        {/* Date Range - Horizontal Chips */}
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: verticalScale(16) }]}>Date Range</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.dateChipContainer}
                        >
                            {DATE_PRESETS.map(preset => {
                                const isActive = datePreset === preset.id;
                                return (
                                    <TouchableOpacity
                                        key={preset.id}
                                        style={[
                                            styles.dateChip,
                                            {
                                                backgroundColor: isActive ? colors.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                                                borderColor: isActive ? colors.primary : colors.border,
                                            }
                                        ]}
                                        onPress={() => setDatePreset(preset.id)}
                                    >
                                        <Text style={[
                                            styles.dateChipText,
                                            { color: isActive ? '#FFF' : colors.textPrimary }
                                        ]}>
                                            {preset.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Custom Date Pickers (only shown when 'custom' is selected) */}
                        {datePreset === 'custom' && (
                            <View style={styles.customDateContainer}>
                                <View style={styles.datePickerRow}>
                                    <View style={{ flex: 1, marginRight: scale(8) }}>
                                        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>From</Text>
                                        <TouchableOpacity
                                            style={[styles.dateButton, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#F9FAFB' }]}
                                            onPress={() => setShowFromPicker(true)}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Icon name="calendar-outline" size={16} color={colors.primary} />
                                                <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
                                                    {formatDateDisplay(fromDate)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: scale(8) }}>
                                        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>To</Text>
                                        <TouchableOpacity
                                            style={[styles.dateButton, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#F9FAFB' }]}
                                            onPress={() => setShowToPicker(true)}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Icon name="calendar-outline" size={16} color={colors.primary} />
                                                <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
                                                    {formatDateDisplay(toDate)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <DatePicker
                                    modal
                                    mode="date"
                                    open={showFromPicker}
                                    date={fromDate}
                                    maximumDate={new Date()}
                                    onConfirm={(date) => {
                                        setShowFromPicker(false);
                                        setFromDate(date);
                                    }}
                                    onCancel={() => setShowFromPicker(false)}
                                    theme={isDark ? 'dark' : 'light'}
                                />
                                <DatePicker
                                    modal
                                    mode="date"
                                    open={showToPicker}
                                    date={toDate}
                                    maximumDate={new Date()}
                                    onConfirm={(date) => {
                                        setShowToPicker(false);
                                        setToDate(date);
                                    }}
                                    onCancel={() => setShowToPicker(false)}
                                    theme={isDark ? 'dark' : 'light'}
                                />
                            </View>
                        )}

                        {/* Boolean Filters */}
                        <View style={{ marginTop: verticalScale(16) }}>
                            {renderBooleanFilter("Connected", isConnected, setIsConnected)}
                            {renderBooleanFilter("Scheduler", isScheduler, setIsScheduler)}
                        </View>

                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                            <Text style={[styles.clearText, { color: colors.textSecondary }]}>Clear All</Text>
                        </TouchableOpacity>
                        <Button title="Apply" onPress={handleApply} style={{ width: '60%' }} />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: moderateScale(24),
        borderTopRightRadius: moderateScale(24),
        padding: scale(20),
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(20),
    },
    title: {
        fontSize: moderateScale(20),
        fontWeight: '700',
    },
    scrollContent: {
        marginBottom: verticalScale(20),
    },
    sectionTitle: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        marginBottom: verticalScale(10),
    },
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(12),
        borderWidth: 1,
        borderRadius: moderateScale(8),
        marginBottom: verticalScale(8),
    },
    dropdownText: {
        fontSize: moderateScale(16),
    },
    dropdownList: {
        borderWidth: 1,
        borderRadius: moderateScale(8),
        marginBottom: verticalScale(16),
        overflow: 'hidden',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    searchInput: {
        flex: 1,
        fontSize: moderateScale(14),
        padding: 0,
        height: verticalScale(30),
    },
    dropdownItem: {
        padding: scale(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    },
    itemTitle: {
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
    itemSubtitle: {
        fontSize: moderateScale(12),
        marginTop: verticalScale(2),
    },
    // Date chip styles
    dateChipContainer: {
        paddingBottom: verticalScale(12),
        gap: scale(8),
    },
    dateChip: {
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(20),
        borderWidth: 1,
    },
    dateChipText: {
        fontSize: moderateScale(13),
        fontWeight: '600',
    },
    // Custom date picker styles
    customDateContainer: {
        marginBottom: verticalScale(8),
    },
    datePickerRow: {
        flexDirection: 'row',
        gap: scale(12),
    },
    dateLabel: {
        fontSize: moderateScale(12),
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: verticalScale(6),
    },
    dateButton: {
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(12),
        borderWidth: 1,
        borderRadius: moderateScale(10),
    },
    dateButtonText: {
        fontSize: moderateScale(14),
        fontWeight: '500',
        marginLeft: scale(8),
    },
    // Boolean filter styles
    boolContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(12),
        paddingVertical: verticalScale(4),
    },
    label: {
        fontSize: moderateScale(16),
        fontWeight: '500',
    },
    boolOptions: {
        flexDirection: 'row',
    },
    boolBtn: {
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(6),
        borderRadius: moderateScale(8),
        borderWidth: 1,
        marginLeft: scale(8),
    },
    boolBtnText: {
        fontSize: moderateScale(14),
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: verticalScale(16),
        borderTopWidth: 1,
    },
    clearBtn: {
        padding: scale(10),
    },
    clearText: {
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
});
