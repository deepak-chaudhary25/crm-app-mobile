import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { stagesApi } from '../services/api';
import { Stage } from '../types';

interface ManualCallLogModalProps {
    visible: boolean;
    leadName: string;
    currentStageId?: string;
    onClose: () => void;
    onSave: (source: string, outcome: string, stageId?: string, scheduleDate?: Date) => void;
}

export const ManualCallLogModal = ({ visible, leadName, currentStageId, onClose, onSave }: ManualCallLogModalProps) => {
    const { colors, isDark } = useAppTheme();
    const [logSource, setLogSource] = useState('call');
    const [outcome, setOutcome] = useState('');
    const [otherSource, setOtherSource] = useState('');
    const [statsStageId, setStatsStageId] = useState<string | undefined>(currentStageId);

    const LOG_SOURCES = [
        { id: 'call', name: 'Call', icon: 'call' },
        { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp' },
        { id: 'meeting', name: 'Meeting', icon: 'people' },
        { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' }
    ];

    // Scheduling
    const [scheduleDate, setScheduleDate] = useState<Date | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    // Stages
    const [stages, setStages] = useState<Stage[]>([]);
    const [showStageDropdown, setShowStageDropdown] = useState(false);
    const [loadingStages, setLoadingStages] = useState(false);

    React.useEffect(() => {
        if (visible) {
            fetchStages();
            setStatsStageId(currentStageId);
            setLogSource('call');
            setOtherSource('');
            setOutcome('');
            setScheduleDate(null);
            setShowStageDropdown(false);
        }
    }, [visible, currentStageId]);

    const fetchStages = async () => {
        setLoadingStages(true);
        try {
            const data = await stagesApi.getStages();
            setStages(data);
        } catch (error) {
            console.error('Failed to load stages', error);
        } finally {
            setLoadingStages(false);
        }
    };

    const selectedStage = stages.find(s => s._id === statsStageId);
    const isJunkOrLost = selectedStage?.name?.toLowerCase().includes('junk') || selectedStage?.name?.toLowerCase().includes('lost');

    const handleSave = () => {
        if (logSource === 'other' && !otherSource.trim()) {
            Alert.alert('Required', 'Please specify the interaction type.');
            return;
        }

        if (!outcome.trim()) {
            Alert.alert('Required', 'Please enter a call outcome.');
            return;
        }

        if (!isJunkOrLost && !scheduleDate) {
            Alert.alert('Required', 'Please schedule a follow-up date/time.');
            return;
        }

        const finalSource = logSource === 'other' ? otherSource.trim() : logSource;
        onSave(finalSource, outcome, statsStageId, isJunkOrLost ? undefined : (scheduleDate || undefined));
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
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.container, { backgroundColor: colors.card, shadowColor: colors.textPrimary }]}>

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                                <Icon name="document-text" size={24} color="#4F46E5" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.title, { color: colors.textPrimary }]}>Manual Log</Text>
                                <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {leadName}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Icon name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formContainer}>
                            {/* Source Selection */}
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Interaction Type *</Text>
                            <View style={styles.sourceRow}>
                                {LOG_SOURCES.map(src => {
                                    const isSelected = logSource === src.id;
                                    return (
                                        <TouchableOpacity
                                            key={src.id}
                                            style={[
                                                styles.sourceCard,
                                                { backgroundColor: isSelected ? colors.primary + '20' : colors.background, borderColor: isSelected ? colors.primary : colors.border }
                                            ]}
                                            onPress={() => setLogSource(src.id)}
                                        >
                                            <Icon name={src.icon} size={20} color={isSelected ? colors.primary : colors.textSecondary} />
                                            <Text style={[styles.sourceText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                                                {src.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {logSource === 'other' && (
                                <View style={{ marginBottom: 16 }}>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border, marginBottom: 0 }]}
                                        placeholder="Specify interaction type..."
                                        placeholderTextColor={colors.textSecondary}
                                        value={otherSource}
                                        onChangeText={setOtherSource}
                                    />
                                </View>
                            )}

                            {/* Stage Selection */}
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Lead Stage *</Text>
                            <View>
                                <TouchableOpacity
                                    style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
                                    onPress={() => setShowStageDropdown(!showStageDropdown)}
                                >
                                    <Text style={{ color: selectedStage ? colors.textPrimary : colors.textSecondary }}>
                                        {selectedStage ? selectedStage.name : 'Select Stage...'}
                                    </Text>
                                    <Icon name={showStageDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                                </TouchableOpacity>

                                {showStageDropdown && (
                                    <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                            {stages.map(stage => (
                                                <TouchableOpacity
                                                    key={stage._id}
                                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                                    onPress={() => {
                                                        setStatsStageId(stage._id);
                                                        setShowStageDropdown(false);
                                                    }}
                                                >
                                                    <Text style={{ color: colors.textPrimary, fontSize: 16, flex: 1, marginRight: 8 }}>{stage.name}</Text>
                                                    {statsStageId === stage._id && <Icon name="checkmark" size={18} color={colors.primary} />}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Follow-up Schedule (Hidden if Junk or Lost) */}
                            {!isJunkOrLost && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Schedule Follow-up *</Text>
                                    <TouchableOpacity
                                        style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.background, marginBottom: 0 }]}
                                        onPress={() => setPickerOpen(true)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ marginRight: 8 }}>
                                                <Icon name="calendar-outline" size={18} color={scheduleDate ? colors.primary : colors.textSecondary} />
                                            </View>
                                            <Text style={{ color: scheduleDate ? colors.textPrimary : colors.textSecondary, fontSize: 14 }}>
                                                {scheduleDate ? scheduleDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Select Date & Time...'}
                                            </Text>
                                        </View>
                                        <Icon name="chevron-down" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>

                                    <DatePicker
                                        modal
                                        open={pickerOpen}
                                        date={scheduleDate || new Date()}
                                        onConfirm={(date) => {
                                            setPickerOpen(false);
                                            setScheduleDate(date);
                                        }}
                                        onCancel={() => {
                                            setPickerOpen(false);
                                        }}
                                        minimumDate={new Date()}
                                        theme={isDark ? 'dark' : 'light'}
                                    />
                                </View>
                            )}

                            {/* Outcome Input */}
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Outcome / Remarks *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border, height: 80, paddingTop: 12 }]}
                                placeholder="What was the outcome of this interaction?"
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                textAlignVertical="top"
                                value={outcome}
                                onChangeText={setOutcome}
                            />
                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                                <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                                <Text style={styles.saveBtnText}>Save Log</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </ScrollView>
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
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
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
        padding: 8,
    },
    formContainer: {
        padding: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    sourceRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    sourceCard: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    sourceText: {
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 14,
        marginBottom: 16,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    dropdownList: {
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    actions: {
        flexDirection: 'row',
        padding: 20,
        paddingTop: 0,
        gap: 12,
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
    saveBtn: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    }
});
