
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { usersApi } from '../services/api';
import { AssignableUser } from '../types';

import { Lead } from '../types';

interface AssignLeadsModalProps {
    visible: boolean;
    count: number;
    leads: Lead[];
    onClose: () => void;
    onAssign: (userId: string, reason: string) => void;
}

export const AssignLeadsModal = ({ visible, count, leads = [], onClose, onAssign }: AssignLeadsModalProps) => {
    const { colors, isDark } = useAppTheme();
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [users, setUsers] = useState<AssignableUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchUsers();
            // Reset state
            setSelectedUser(null);
            setReason('');
            setError('');
            setSearchQuery('');
            setDropdownOpen(false);
        }
    }, [visible]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await usersApi.getUsers();
            setUsers(data);
        } catch (err: any) {
            console.error(err);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedUserData = users.find(u => u._id === selectedUser);

    const handleAssign = () => {
        if (!selectedUser) {
            Alert.alert('Required', 'Please select a user to assign leads to.');
            return;
        }
        if (!reason.trim()) {
            Alert.alert('Required', 'Please enter a reason for assignment.');
            return;
        }
        onAssign(selectedUser, reason.trim());
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <View style={[styles.container, { backgroundColor: colors.card, shadowColor: colors.textPrimary }]}>
                    <View style={styles.modalContentWrapper}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                                <Icon name="person-add" size={24} color="#4F46E5" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.title, { color: colors.textPrimary }]}>Assign Leads</Text>
                                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                    Assigning <Text style={{ fontWeight: '700', color: colors.primary }}>{count}</Text> selected leads
                                </Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Icon name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Selected Leads List (Preview) */}
                        {leads.length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Selected Leads:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                    {leads.slice(0, 5).map((lead, index) => (
                                        <View key={index} style={[styles.leadChip, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                                            <Text style={[styles.leadChipText, { color: colors.textPrimary }]}>{lead.name}</Text>
                                        </View>
                                    ))}
                                    {leads.length > 5 && (
                                        <View style={[styles.leadChip, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                                            <Text style={[styles.leadChipText, { color: colors.textSecondary }]}>+{leads.length - 5} more</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        )}

                        <ScrollView
                            style={styles.scrollContent}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* User Selection Dropdown */}
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Assign To (Required)</Text>

                            <TouchableOpacity
                                style={[styles.dropdownTrigger, { borderColor: colors.border }]}
                                onPress={() => setDropdownOpen(!dropdownOpen)}
                            >
                                <View>
                                    {selectedUser ? (
                                        <>
                                            <Text style={[styles.selectedName, { color: colors.textPrimary }]}>{selectedUserData?.name}</Text>
                                            <Text style={[styles.selectedEmail, { color: colors.textSecondary }]}>{selectedUserData?.email}</Text>
                                        </>
                                    ) : (
                                        <Text style={{ color: colors.textSecondary }}>Select a user...</Text>
                                    )}
                                </View>
                                <Icon name={dropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>

                            {dropdownOpen && (
                                <View style={[styles.dropdownContent, { borderColor: colors.border }]}>
                                    {/* Search Bar */}
                                    <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        <Icon name="search" size={20} color={colors.textSecondary} />
                                        <TextInput
                                            style={[styles.searchInput, { color: colors.textPrimary }]}
                                            placeholder="Search users..."
                                            placeholderTextColor={colors.textSecondary}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                    </View>

                                    {loading ? (
                                        <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                                    ) : error ? (
                                        <Text style={{ color: colors.error, marginBottom: 10 }}>{error}</Text>
                                    ) : (
                                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                            {filteredUsers.length === 0 ? (
                                                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 10 }}>
                                                    No users found.
                                                </Text>
                                            ) : (
                                                filteredUsers.map(user => (
                                                    <TouchableOpacity
                                                        key={user._id}
                                                        style={[
                                                            styles.userOption,
                                                            {
                                                                backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                                                borderColor: selectedUser === user._id ? colors.primary : 'transparent'
                                                            }
                                                        ]}
                                                        onPress={() => {
                                                            setSelectedUser(user._id);
                                                            setDropdownOpen(false);
                                                        }}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.userName, { color: colors.textPrimary }]}>{user.name}</Text>
                                                            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
                                                        </View>
                                                        {selectedUser === user._id && <Icon name="checkmark" size={20} color={colors.primary} />}
                                                    </TouchableOpacity>
                                                ))
                                            )}
                                        </ScrollView>
                                    )}
                                </View>
                            )}

                            {/* Reason Input */}
                            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Reason (Required)</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.background,
                                    color: colors.textPrimary,
                                    borderColor: colors.border
                                }]}
                                placeholder="Why are you assigning these leads?"
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                textAlignVertical="top"
                                value={reason}
                                onChangeText={setReason}
                            />
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { borderColor: colors.border }]}
                                onPress={onClose}
                            >
                                <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.assignBtn, { backgroundColor: colors.primary }]}
                                onPress={handleAssign}
                            >
                                <Text style={styles.assignBtnText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    container: {
        borderRadius: 20,
        elevation: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        maxHeight: '80%', // Limit height
        overflow: 'hidden',
    },
    modalContentWrapper: {
        padding: 20,
        height: '100%',
    },
    scrollContent: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 14,
    },
    closeBtn: {
        marginLeft: 'auto',
        padding: 4,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        minHeight: 56,
    },
    selectedName: {
        fontWeight: '600',
        fontSize: 14,
    },
    selectedEmail: {
        fontSize: 12,
    },
    dropdownContent: {
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 16,
        padding: 8,
        overflow: 'hidden',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
    },
    userOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
    },
    userName: {
        fontWeight: '600',
        fontSize: 14,
    },
    userEmail: {
        fontSize: 12,
    },
    input: {
        height: 80,
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        fontSize: 14,
        marginBottom: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 'auto',
        paddingTop: 10,
    },
    cancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    cancelBtnText: {
        fontWeight: '600',
        fontSize: 16,
    },
    assignBtn: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    assignBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    leadChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
    },
    leadChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
