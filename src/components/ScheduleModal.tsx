
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { Button } from './Button';

interface ScheduleModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (date: Date, notes: string) => void;
    leadName?: string;
}

export const ScheduleModal = ({ visible, onClose, onSave, leadName }: ScheduleModalProps) => {
    const { colors, isDark } = useAppTheme();
    const [date, setDate] = useState(new Date());
    const [open, setOpen] = useState(false); // Controls the Date Picker modal

    // Reset state when opened
    useEffect(() => {
        if (visible) {
            setDate(new Date());
        }
    }, [visible]);

    const handleSave = () => {
        if (!date) {
            Alert.alert('Required', 'Please select a date and time.');
            return;
        }
        onSave(date, '');
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>
                            Schedule with <Text style={{ color: colors.primary }}>{leadName || 'Lead'}</Text>
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Icon name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        {/* 1. Select Date & Time */}
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Date & Time</Text>

                        <TouchableOpacity
                            style={[styles.dateButton, { borderColor: colors.border, backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                            onPress={() => setOpen(true)}
                        >
                            <Icon name="calendar-outline" size={20} color={colors.primary} />
                            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                                {date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <Icon name="chevron-down" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <DatePicker
                            modal
                            open={open}
                            date={date}
                            onConfirm={(date) => {
                                setOpen(false);
                                setDate(date);
                            }}
                            onCancel={() => {
                                setOpen(false);
                            }}
                            minimumDate={new Date()}
                            theme={isDark ? 'dark' : 'light'}
                        />

                        {/* Save Button */}
                        <Button
                            title="Confirm Schedule"
                            onPress={handleSave}
                            style={{ marginTop: 30 }}
                        />

                    </View>
                </View>
            </KeyboardAvoidingView>
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    content: {
        // paddingBottom: 24
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'space-between'
    },
    dateText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '500'
    },
    textInput: {
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        height: 100,
        textAlignVertical: 'top',
        fontSize: 16,
    },
});
