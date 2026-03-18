import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { usersApi } from '../services/api';
import { AssignableUser } from '../types';

interface AddLeadModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (leadData: any) => void;
    canAssign: boolean;
    stages?: any[];
}

export const AddLeadModal = ({ visible, onClose, onAdd, canAssign, stages = [] }: AddLeadModalProps) => {
    const { colors, isDark } = useAppTheme();
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [source, setSource] = useState('manual');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState('');

    const [users, setUsers] = useState<AssignableUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [errorUsers, setErrorUsers] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (visible) {
            // Reset state
            setName('');
            setNameError('');
            setPhone('');
            setPhoneError('');
            setEmail('');
            setEmailError('');
            setSource('manual');
            setSelectedUser(null);
            setReason('');
            setReasonError('');
            setSearchQuery('');
            setDropdownOpen(false);

            if (canAssign) {
                fetchUsers();
            }
        }
    }, [visible, canAssign]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const data = await usersApi.getUsers();
            setUsers(Array.isArray(data) ? data : (data?.data || []));
        } catch (err: any) {
            console.error(err);
            setErrorUsers('Failed to load users');
        } finally {
            setLoadingUsers(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedUserData = users.find(u => u._id === selectedUser);

    const validateName = (text: string) => {
        if (!text.trim()) {
            setNameError('Name is required');
            return false;
        }
        setNameError('');
        return true;
    };

    const validatePhone = (text: string) => {
        if (!text.trim()) {
            setPhoneError('Phone number is required');
            return false;
        }
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(text.trim().replace(/\D/g, ''))) {
            setPhoneError('Enter exactly 10 digits');
            return false;
        }
        setPhoneError('');
        return true;
    };

    const validateEmail = (text: string) => {
        if (text.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(text.trim())) {
                setEmailError('Enter a valid email address');
                return false;
            }
        }
        setEmailError('');
        return true;
    };

    const validateReason = (text: string) => {
        if (selectedUser && !text.trim()) {
            setReasonError('Reason is required when assigning a user');
            return false;
        }
        setReasonError('');
        return true;
    };

    const handleCreate = () => {
        const isNameValid = validateName(name);
        const isPhoneValid = validatePhone(phone);
        const isEmailValid = validateEmail(email);
        const isReasonValid = validateReason(reason);

        if (!isNameValid || !isPhoneValid || !isEmailValid || !isReasonValid) {
            return;
        }

        const leadData: any = {
            name: name.trim(),
            phone: phone.trim(),
            source,
            // Hardcoded ID for 'New' stage as requested
            stageId: '696cadcadcbcf508621922e6',
        };

        if (email.trim()) {
            leadData.email = email.trim();
        }

        if (selectedUser) {
            leadData.assignedTo = selectedUser;
            leadData.reason = reason.trim();
        }

        onAdd(leadData);
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
                                <Text style={[styles.title, { color: colors.textPrimary }]}>Add New Lead</Text>
                                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                    Create a new lead manually
                                </Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Icon name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.scrollContent}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Basic Info */}
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Name <Text style={{ color: colors.error }}>*</Text></Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: nameError ? colors.error : colors.border }]}
                                placeholder="E.g. John Doe"
                                placeholderTextColor={colors.textSecondary}
                                value={name}
                                onChangeText={text => { setName(text); if (nameError) validateName(text); }}
                                onBlur={() => validateName(name)}
                            />
                            {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}

                            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number <Text style={{ color: colors.error }}>*</Text></Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: phoneError ? colors.error : colors.border }]}
                                placeholder="E.g. 9876543210"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={text => { setPhone(text); if (phoneError) validatePhone(text); }}
                                onBlur={() => validatePhone(phone)}
                            />
                            {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

                            <Text style={[styles.label, { color: colors.textSecondary }]}>Email (Optional)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: emailError ? colors.error : colors.border }]}
                                placeholder="E.g. john@example.com"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={text => { setEmail(text); if (emailError) validateEmail(text); }}
                                onBlur={() => validateEmail(email)}
                            />
                            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

                            {/* Optional User Assignment */}
                            {canAssign && (
                                <>
                                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Assign To (Optional)</Text>
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

                                            {loadingUsers ? (
                                                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                                            ) : errorUsers ? (
                                                <Text style={{ color: colors.error, marginBottom: 10 }}>{errorUsers}</Text>
                                            ) : (
                                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                                    {/* Deselect Option */}
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.userOption,
                                                            { backgroundColor: isDark ? '#374151' : '#F9FAFB', borderColor: !selectedUser ? colors.primary : 'transparent' }
                                                        ]}
                                                        onPress={() => {
                                                            setSelectedUser(null);
                                                            setDropdownOpen(false);
                                                        }}
                                                    >
                                                        <Text style={{ color: colors.textSecondary, fontStyle: 'italic', flex: 1 }}>Unassigned (Keep to yourself / Queue)</Text>
                                                        {!selectedUser && <Icon name="checkmark" size={20} color={colors.primary} />}
                                                    </TouchableOpacity>

                                                    {filteredUsers.map(user => (
                                                        <TouchableOpacity
                                                            key={user._id}
                                                            style={[
                                                                styles.userOption,
                                                                { backgroundColor: isDark ? '#374151' : '#F9FAFB', borderColor: selectedUser === user._id ? colors.primary : 'transparent' }
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
                                                    ))}
                                                </ScrollView>
                                            )}
                                        </View>
                                    )}

                                    {/* Reason is strictly required if assigning during creation */}
                                    {selectedUser && (
                                        <>
                                            <Text style={[styles.label, { color: colors.textSecondary }]}>Reason for Assignment <Text style={{ color: colors.error }}>*</Text></Text>
                                            <TextInput
                                                style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: reasonError ? colors.error : colors.border }]}
                                                placeholder="Why are you assigning this lead immediately?"
                                                placeholderTextColor={colors.textSecondary}
                                                multiline
                                                textAlignVertical="top"
                                                value={reason}
                                                onChangeText={text => { setReason(text); if (reasonError) validateReason(text); }}
                                                onBlur={() => validateReason(reason)}
                                            />
                                            {!!reasonError && <Text style={styles.errorText}>{reasonError}</Text>}
                                        </>
                                    )}
                                </>
                            )}
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={styles.actions}>
                            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                                <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.assignBtn, { backgroundColor: colors.primary }]} onPress={handleCreate}>
                                <Text style={styles.assignBtnText}>Create Lead</Text>
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
        maxHeight: '90%',
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
        marginTop: 12,
        textTransform: 'uppercase',
    },
    input: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 14,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    textArea: {
        height: 80,
        paddingTop: 12,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 56,
        marginBottom: 8,
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
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 'auto',
        paddingTop: 16,
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
    }
});
