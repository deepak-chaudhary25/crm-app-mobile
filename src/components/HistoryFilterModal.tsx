import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, Platform } from 'react-native';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { usersApi } from '../services/api';

interface HistoryFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: { group: boolean; userId: string }) => void;
    initialFilters: { group: boolean; userId: string };
}

export const HistoryFilterModal = ({ visible, onClose, onApply, initialFilters }: HistoryFilterModalProps) => {
    const { colors } = useAppTheme();
    
    const [isGroup, setIsGroup] = useState(false);
    const [userId, setUserId] = useState('');
    
    const [users, setUsers] = useState<any[]>([]);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');

    useEffect(() => {
        if (visible) {
            setIsGroup(initialFilters.group || false);
            setUserId(initialFilters.userId || '');
            setIsUserDropdownOpen(false);
            setUserSearchQuery('');
            fetchUsers();
        }
    }, [visible, initialFilters]);

    const fetchUsers = async () => {
        try {
            const data = await usersApi.getUsers();
            setUsers(Array.isArray(data) ? data : (data?.data || []));
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const handleApply = () => {
        onApply({
            group: isGroup,
            userId: isGroup ? userId : '' // Only pass userId if group is true
        });
    };

    const handleClear = () => {
        setIsGroup(false);
        setUserId('');
        // We can immediately apply or just clear state
    };

    const getSelectedUserName = () => {
        if (!userId) return 'All Users in Group';
        const user = users.find(u => u._id === userId);
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
                        
                        {/* Group Toggle */}
                        <View style={styles.switchContainer}>
                            <View>
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 4 }]}>Group View</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: moderateScale(12) }}>View logs for all employees in your group</Text>
                            </View>
                            <Switch
                                value={isGroup}
                                onValueChange={(val) => {
                                    setIsGroup(val);
                                    if (!val) setUserId(''); // Clear user selection if group is turned off
                                }}
                                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                thumbColor={isGroup ? colors.primary : '#f4f3f4'}
                            />
                        </View>

                        {/* Users Dropdown (Only show if Group is enabled) */}
                        {isGroup && (
                            <View style={{ marginTop: verticalScale(16) }}>
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Filter by User</Text>

                                <TouchableOpacity
                                    style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                                    onPress={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                >
                                    <Text style={[styles.dropdownText, { color: userId ? colors.textPrimary : colors.textSecondary }]}>
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

                                        <ScrollView nestedScrollEnabled={true} style={{ maxHeight: verticalScale(180) }}>
                                            <TouchableOpacity
                                                style={[styles.dropdownItem, !userId && { backgroundColor: colors.primary + '20' }]}
                                                onPress={() => {
                                                    setUserId('');
                                                    setIsUserDropdownOpen(false);
                                                }}
                                            >
                                                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>All Users in Group</Text>
                                            </TouchableOpacity>

                                            {filteredUsers.map(user => (
                                                <TouchableOpacity
                                                    key={user._id}
                                                    style={[styles.dropdownItem, userId === user._id && { backgroundColor: colors.primary + '20' }]}
                                                    onPress={() => {
                                                        setUserId(user._id);
                                                        setIsUserDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{user.name}</Text>
                                                    {user.email && (
                                                        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{user.email}</Text>
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                            
                                            {filteredUsers.length === 0 && (
                                                <View style={{ padding: scale(16), alignItems: 'center' }}>
                                                    <Text style={{ color: colors.textSecondary }}>No users found</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                            <Text style={[styles.clearText, { color: colors.textSecondary }]}>Clear All</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.applyBtn, { backgroundColor: colors.primary }]} 
                            onPress={handleApply}
                        >
                            <Text style={styles.applyText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: moderateScale(24),
        borderTopRightRadius: moderateScale(24),
        maxHeight: '80%',
        paddingBottom: Platform.OS === 'ios' ? verticalScale(34) : verticalScale(24),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: scale(20),
        paddingBottom: scale(16),
    },
    title: {
        fontSize: moderateScale(20),
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: scale(20),
    },
    sectionTitle: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        marginBottom: verticalScale(12),
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: verticalScale(12),
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(12),
        borderWidth: 1,
        borderRadius: moderateScale(12),
    },
    dropdownText: {
        fontSize: moderateScale(14),
    },
    dropdownList: {
        marginTop: verticalScale(8),
        borderWidth: 1,
        borderRadius: moderateScale(12),
        overflow: 'hidden',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    searchInput: {
        flex: 1,
        paddingVertical: verticalScale(12),
        fontSize: moderateScale(14),
    },
    dropdownItem: {
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(16),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    itemTitle: {
        fontSize: moderateScale(14),
        fontWeight: '500',
    },
    itemSubtitle: {
        fontSize: moderateScale(12),
        marginTop: verticalScale(2),
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingTop: verticalScale(16),
        marginTop: verticalScale(16),
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    clearBtn: {
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(16),
    },
    clearText: {
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
    applyBtn: {
        flex: 1,
        marginLeft: scale(16),
        paddingVertical: verticalScale(14),
        borderRadius: moderateScale(12),
        alignItems: 'center',
    },
    applyText: {
        color: '#FFF',
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
});
