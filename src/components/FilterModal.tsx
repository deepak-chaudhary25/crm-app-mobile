import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform, TextInput } from 'react-native';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { Input } from './Input';
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

export const FilterModal = ({ visible, onClose, onApply, users, initialFilters, canViewUsers = false }: FilterModalProps) => {
    const { colors, isDark } = useAppTheme();

    const [assignedTo, setAssignedTo] = useState('');
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [isScheduler, setIsScheduler] = useState<boolean | null>(null);

    useEffect(() => {
        if (visible) {
            setAssignedTo(initialFilters.assignedTo || '');
            setFromDate(initialFilters.fromDate || '');
            setToDate(initialFilters.toDate || '');
            setIsConnected(initialFilters.connected === 'true' ? true : initialFilters.connected === 'false' ? false : null);
            setIsScheduler(initialFilters.scheduler === 'true' ? true : initialFilters.scheduler === 'false' ? false : null);
            setIsScheduler(initialFilters.scheduler === 'true' ? true : initialFilters.scheduler === 'false' ? false : null);
            setIsUserDropdownOpen(false);
            setUserSearchQuery('');
        }
    }, [visible, initialFilters]);

    const handleApply = () => {
        const filters: any = {};
        if (assignedTo) filters.assignedTo = assignedTo;
        if (fromDate) filters.fromDate = fromDate;
        if (toDate) filters.toDate = toDate;
        if (isConnected !== null) filters.connected = isConnected;
        if (isScheduler !== null) filters.scheduler = isScheduler;

        onApply(filters);
    };

    const handleClear = () => {
        setAssignedTo('');
        setFromDate('');
        setToDate('');
        setIsConnected(null);
        setIsScheduler(null);
        setUserSearchQuery('');
    };

    const renderBooleanFilter = (label: string, value: boolean | null, onChange: (val: boolean | null) => void) => (
        <View style={styles.boolContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
            <View style={styles.boolOptions}>
                <TouchableOpacity
                    style={[styles.boolBtn, value === true && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => onChange(value === true ? null : true)}
                >
                    <Text style={[styles.boolBtnText, value === true ? { color: '#FFF' } : { color: colors.textPrimary }]}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.boolBtn, value === false && { backgroundColor: colors.primary, borderColor: colors.primary }]}
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

                        {/* Date Range */}
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: verticalScale(16) }]}>Date Range</Text>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: scale(8) }}>
                                <Input
                                    label="From (YYYY-MM-DD)"
                                    value={fromDate}
                                    onChangeText={setFromDate}
                                    placeholder="2026-01-01"
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: scale(8) }}>
                                <Input
                                    label="To (YYYY-MM-DD)"
                                    value={toDate}
                                    onChangeText={setToDate}
                                    placeholder="2026-01-31"
                                />
                            </View>
                        </View>

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
                        <Button title="Apply Filters" onPress={handleApply} style={{ width: '60%' }} />
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
    userScroll: {
        marginBottom: verticalScale(8),
    },
    userChip: {
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(20),
        marginRight: scale(8),
    },
    userChipText: {
        fontSize: moderateScale(14),
        fontWeight: '500',
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
        // maxHeight: verticalScale(200), // Moved to internal ScrollView
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
        padding: 0, // Reset default padding
        height: verticalScale(30),
    },
    dropdownItem: {
        padding: scale(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc', // fallback
    },
    itemTitle: {
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
    itemSubtitle: {
        fontSize: moderateScale(12),
        marginTop: verticalScale(2),
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
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
        borderColor: '#E5E7EB',
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
