import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { CallLogEntry } from '../services/callLog';
import { stagesApi } from '../services/api';
import { Stage } from '../types';

interface CallFeedbackModalProps {
    visible: boolean;
    callLog: CallLogEntry | null;
    leadName: string;
    currentStageId?: string;
    onSave: (outcome: string, remarks: string, stageId?: string) => void;
    // Note: No onClose because it's mandatory (or handled by parent logic to be blocking)
}

export const CallFeedbackModal = ({ visible, callLog, leadName, currentStageId, onSave }: CallFeedbackModalProps) => {
    const { colors, isDark } = useAppTheme();
    const [outcome, setOutcome] = useState('');
    const [remarks, setRemarks] = useState('');
    const [statsStageId, setStatsStageId] = useState<string | undefined>(currentStageId);

    // Stages
    const [stages, setStages] = useState<Stage[]>([]);
    const [showStageDropdown, setShowStageDropdown] = useState(false);
    const [loadingStages, setLoadingStages] = useState(false);

    React.useEffect(() => {
        if (visible) {
            fetchStages();
            setStatsStageId(currentStageId); // Reset to current on open
            setOutcome('');
            setRemarks('');
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

    const handleSave = () => {
        if (!outcome.trim()) {
            Alert.alert('Required', 'Please enter a call outcome.');
            return;
        }
        if (!remarks.trim()) {
            Alert.alert('Required', 'Please enter a remark to continue.');
            return;
        }
        onSave(outcome, remarks, statsStageId);
        setOutcome('');
        setRemarks(''); // Reset for next time
    };

    if (!visible || !callLog) return null;

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const selectedStage = stages.find(s => s._id === statsStageId);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
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
                            <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                                <Icon name="call" size={24} color="#2563EB" />
                            </View>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>Call Summary</Text>
                        </View>

                        {/* Details */}
                        <View style={[styles.detailsContainer, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                            <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                                Lead: <Text style={{ fontWeight: '700' }}>{leadName}</Text>
                            </Text>
                            <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                                Duration: <Text style={{ fontWeight: '700' }}>{formatDuration(callLog.duration)}</Text>
                            </Text>
                            <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                                Status: <Text style={{ fontWeight: '700', color: callLog.callType === 'MISSED' ? '#EF4444' : '#10B981' }}>{callLog.callType}</Text>
                            </Text>
                            <Text style={[styles.detailText, { color: colors.textSecondary, fontSize: 12, marginTop: 4 }]}>
                                {new Date(callLog.timestamp).toLocaleString()}
                            </Text>
                        </View>

                        {/* Stage Selection */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Lead Stage</Text>
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
                                    <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
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

                        {/* Outcome Input */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Outcome (Required)</Text>
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: colors.background,
                                color: colors.textPrimary,
                                borderColor: colors.border,
                                height: 44 // Reduced from 50
                            }]}
                            placeholder="e.g. Interested, Callback, etc."
                            placeholderTextColor={colors.textSecondary}
                            value={outcome}
                            onChangeText={setOutcome}
                        />

                        {/* Remarks Input */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Remarks (Required)</Text>
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: colors.background,
                                color: colors.textPrimary,
                                borderColor: colors.border
                            }]}
                            placeholder="What happened on the call?"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            textAlignVertical="top"
                            value={remarks}
                            onChangeText={setRemarks}
                        />

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveBtnText}>Save & Verify</Text>
                        </TouchableOpacity>

                        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                            You cannot make another call until this is saved.
                        </Text>

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
        padding: 16, // Reduced from 20
        elevation: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16, // Reduced from 20
    },
    iconContainer: {
        width: 36, // Reduced from 40
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 18, // Reduced from 20
        fontWeight: '800',
    },
    detailsContainer: {
        borderRadius: 12,
        padding: 12, // Reduced from 16
        marginBottom: 16, // Reduced from 20
    },
    detailText: {
        fontSize: 14, // Reduced from 15
        marginBottom: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6, // Reduced from 8
        textTransform: 'uppercase',
    },
    input: {
        height: 80, // Reduced from 100
        borderRadius: 12,
        borderWidth: 1,
        padding: 10, // Reduced from 12
        fontSize: 14,
        marginBottom: 16, // Reduced from 20
    },
    saveBtn: {
        height: 48, // Reduced from 50
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    helperText: {
        textAlign: 'center',
        fontSize: 11,
        fontStyle: 'italic',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10, // Reduced from 12
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 4,
        minHeight: 44, // Reduced from 50
    },
    dropdownList: {
        marginTop: 4,
        marginBottom: 12,
        borderWidth: 1,
        borderRadius: 12,
        padding: 4,
        maxHeight: 200, // Reduced max height
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12, // Reduced from 14
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    }
});
