import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, BackHandler, FlatList, Modal } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { Button } from './Button';
import { stagesApi, ivrApi, schedulesApi } from '../services/api';
import { Stage } from '../types';

export interface IVREventData {
    callId: string;
    leadId: string | number;
    duration: number | string;
}

interface IVRFeedbackModalProps {
    visible: boolean;
    data: IVREventData | null;
    onSave: (outcome: string, remarks: string, stageId?: string, scheduleDate?: Date, fallbackDurationSecs?: number, fallbackStatus?: string) => Promise<void>;
    onCancel?: () => void;
}

export const IVRFeedbackModal = ({ visible, data, onSave, onCancel }: IVRFeedbackModalProps) => {
    const { colors, isDark } = useAppTheme();
    const [outcome, setOutcome] = useState('');
    const [remarks, setRemarks] = useState('');
    const [stageId, setStageId] = useState<string | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);

    // Fallback Manual Call Details (when socket drops)
    const [manualDuration, setManualDuration] = useState('');
    const [manualStatus, setManualStatus] = useState('OUTGOING');

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
            setStageId(undefined);
            setOutcome('');
            setRemarks('');
            setScheduleDate(null);
            setManualDuration('');
            setManualStatus('OUTGOING');

            if (onCancel) {
                const backAction = () => {
                    onCancel();
                    return true;
                };
                const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
                return () => backHandler.remove();
            }
        }
    }, [visible, onCancel]);

    const fetchStages = async () => {
        setLoadingStages(true);
        try {
            const stagesData = await stagesApi.getStages();
            setStages(stagesData);
        } catch (error) {
            console.error('Failed to load stages', error);
        } finally {
            setLoadingStages(false);
        }
    };

    const prevData = React.useRef(data);
    if (data) prevData.current = data;
    const displayData = data || prevData.current;

    const selectedStage = stages.find(s => s._id === stageId);
    const isJunkOrLost = selectedStage?.name?.toLowerCase().includes('junk') || selectedStage?.name?.toLowerCase().includes('lost');

    const handleSave = async () => {
        if (!stageId) {
            Alert.alert('Required', 'Please select a stage.');
            return;
        }
        if (!outcome.trim()) {
            Alert.alert('Required', 'Please enter a call outcome.');
            return;
        }
        if (!remarks.trim()) {
            Alert.alert('Required', 'Please enter a remark to continue.');
            return;
        }
        if (!isJunkOrLost && !scheduleDate) {
            Alert.alert('Required', 'Please schedule a follow-up date/time.');
            return;
        }

        let fallbackDurationSecs = 0;
        let fallbackStatus = 'OUTGOING';

        // Triggers fallback UI parsing if server missed socket
        if (!displayData?.callId) {
            fallbackStatus = manualStatus;
            if (manualStatus === 'OUTGOING') {
                if (!manualDuration.trim() || isNaN(Number(manualDuration))) {
                    Alert.alert('Required', 'Please enter an estimated call duration in minutes (or 0).');
                    return;
                }
                fallbackDurationSecs = Math.max(0, parseInt(manualDuration, 10)) * 60;
            }
        }

        setIsSaving(true);
        try {
            await onSave(outcome, remarks, stageId, isJunkOrLost ? undefined : (scheduleDate || undefined), fallbackDurationSecs, fallbackStatus);
            // Context handles the success alerts and toasts, so just structurally reset
            setOutcome('');
            setRemarks('');
            setScheduleDate(null);
            setManualDuration('');
        } catch (e: any) {
            console.error('Save failed', e);
        } finally {
            setIsSaving(false);
        }
    };

    // We must return null when data is missing so we don't crash on invalid references.
    if (!visible || !displayData) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onCancel}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                >
                    <View style={[styles.container, { backgroundColor: colors.card, shadowColor: colors.textPrimary }]}>

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                                <Icon name="headset-outline" size={24} color="#DC2626" />
                            </View>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>IVR Feedback</Text>
                        </View>

                        <Text style={styles.strictWarn}>
                            Mandatory feedback. You cannot dismiss this window until submitted.
                        </Text>

                        {/* Details */}
                        <View style={[styles.detailsContainer, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                            <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                                Lead ID: <Text style={{ fontWeight: '700' }}>{displayData.leadId}</Text>
                            </Text>
                            
                            {displayData.callId ? (
                                <>
                                    <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                                        Call ID: <Text style={{ fontWeight: '700' }}>{displayData.callId}</Text>
                                    </Text>
                                    <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                                        Duration: <Text style={{ fontWeight: '700' }}>{displayData.duration}s</Text>
                                    </Text>
                                </>
                            ) : (
                                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                                    <Text style={[styles.detailText, { color: '#EF4444', fontSize: 12, marginBottom: 8, fontWeight: '700' }]}>
                                        ⚠️ Server Sync Missed. Please map manually:
                                    </Text>
                                    
                                    <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
                                        <Text style={[styles.detailText, { flex: 1, color: colors.textPrimary, fontWeight: '500' }]}>Did they answer?</Text>
                                        <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                                            <TouchableOpacity 
                                                style={[styles.statusTab, manualStatus === 'OUTGOING' && { backgroundColor: '#10B981' }]} 
                                                onPress={() => setManualStatus('OUTGOING')}
                                            >
                                                <Text style={{ color: manualStatus === 'OUTGOING' ? '#fff' : colors.textPrimary, fontSize: 12, fontWeight: 'bold' }}>Yes</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.statusTab, manualStatus === 'MISSED' && { backgroundColor: '#EF4444' }]}
                                                onPress={() => setManualStatus('MISSED')}
                                            >
                                                <Text style={{ color: manualStatus === 'MISSED' ? '#fff' : colors.textPrimary, fontSize: 12, fontWeight: 'bold' }}>No</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {manualStatus === 'OUTGOING' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={[styles.detailText, { flex: 1, color: colors.textPrimary, fontWeight: '500' }]}>Est. Duration (Mins)</Text>
                                            <TextInput 
                                                style={[styles.input, { height: 36, marginBottom: 0, width: 80, textAlign: 'center', backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]} 
                                                keyboardType="numeric" 
                                                placeholder="0"
                                                placeholderTextColor={colors.textSecondary}
                                                value={manualDuration}
                                                onChangeText={setManualDuration}
                                                maxLength={3}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Stage Selection */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Lead Stage (Required)</Text>
                        <View style={{zIndex: 1000}}>
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
                                                    setStageId(stage._id);
                                                    setShowStageDropdown(false);
                                                }}
                                            >
                                                <Text style={{ color: colors.textPrimary, fontSize: 16, flex: 1, marginRight: 8 }}>{stage.name}</Text>
                                                {stageId === stage._id && <Icon name="checkmark" size={18} color={colors.primary} />}
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Follow-up Schedule (Hidden if Junk or Lost) */}
                        {!isJunkOrLost && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Schedule Follow-up (Required)</Text>
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
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Outcome (Required)</Text>
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: colors.background,
                                color: colors.textPrimary,
                                borderColor: colors.border,
                                height: 44 
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
                        <Button
                            title="Submit Call Log"
                            onPress={handleSave}
                            loading={isSaving}
                            style={{ backgroundColor: '#DC2626', marginBottom: 10 }}
                        />

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)', // Darker overlay for strict mode
        justifyContent: 'center',
        padding: 20,
    },
    container: {
        borderRadius: 20,
        padding: 16, 
        elevation: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8, 
    },
    strictWarn: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    iconContainer: {
        width: 36, 
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 18, 
        fontWeight: '800',
    },
    detailsContainer: {
        borderRadius: 12,
        padding: 12, 
        marginBottom: 16, 
    },
    detailText: {
        fontSize: 14, 
        marginBottom: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6, 
        textTransform: 'uppercase',
    },
    input: {
        height: 80, 
        borderRadius: 12,
        borderWidth: 1,
        padding: 10, 
        fontSize: 14,
        marginBottom: 16, 
    },
    saveBtn: {
        height: 48, 
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
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10, 
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        minHeight: 44, 
    },
    dropdownList: {
        marginTop: 4,
        marginBottom: 12,
        borderWidth: 1,
        borderRadius: 12,
        padding: 4,
        maxHeight: 200, 
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12, 
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    statusTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
