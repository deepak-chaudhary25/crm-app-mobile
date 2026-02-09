import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { historyService, Interaction } from '../services/history';
import { callLogService, CallLogEntry } from '../services/callLog';
import { authService } from '../services/auth';
import { callLogsApi } from '../services/api';

interface UseCallHandlingProps {
    onFeedbackSuccess?: () => void;
}

export const useCallHandling = ({ onFeedbackSuccess }: UseCallHandlingProps = {}) => {
    const appState = useRef(AppState.currentState);
    const lastProcessedCall = useRef<{ phoneNumber: string; timestamp: number } | null>(null);
    const [blockingCall, setBlockingCall] = useState<any>(null);
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [currentCallLog, setCurrentCallLog] = useState<CallLogEntry | null>(null);
    const [loading, setLoading] = useState(false);

    // Initial Checks
    useEffect(() => {
        checkBlockingState();

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, []);

    useFocusEffect(
        useCallback(() => {
            checkBlockingState();
        }, [])
    );

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            const trackingNumber = await AsyncStorage.getItem('active_call_number');
            if (trackingNumber) {
                await checkLastCall(trackingNumber);
            }
        }
        appState.current = nextAppState;
    };

    const checkLastCall = async (targetNumber: string) => {
        setTimeout(async () => {
            const log = await callLogService.getLastCall(targetNumber);
            await AsyncStorage.removeItem('active_call_number');

            if (log) {
                // Check if we just processed this number recently (within last 10 seconds)
                if (lastProcessedCall.current &&
                    lastProcessedCall.current.phoneNumber === log.phoneNumber &&
                    (Date.now() - lastProcessedCall.current.timestamp < 10000)) {
                    return;
                }

                setCurrentCallLog(log);
                setFeedbackModalVisible(true);
            }
        }, 1500);
    };


    const checkBlockingState = async () => {
        const pending = await historyService.getPendingFeedback();
        if (pending) {
            setBlockingCall(pending);
            const log = await callLogService.getLastCall(pending.phoneNumber);
            if (log) {
                setCurrentCallLog(log);
                setFeedbackModalVisible(true);
            } else {
                // Fallback
                setCurrentCallLog({
                    phoneNumber: pending.phoneNumber,
                    callType: 'UNKNOWN',
                    duration: 0,
                    timestamp: pending.timestamp,
                    dateTime: new Date(pending.timestamp).toISOString()
                });
                setFeedbackModalVisible(true);
            }
        }
    };



    const handleCall = async (phoneNumber?: string, lead?: any) => {
        const pending = await historyService.getPendingFeedback();
        if (pending) {
            Alert.alert(
                'Action Blocked',
                `You must complete the feedback for your call with ${pending.leadName} before making a new call.`,
                [
                    { text: 'Complete Now', onPress: () => checkBlockingState() },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
            return;
        }

        if (!phoneNumber) {
            Alert.alert('No Number', 'This lead does not have a phone number.');
            return;
        }

        let leadIdNumeric = lead?.leadId || lead?.id; // Handle various ID shapes
        if (typeof leadIdNumeric === 'string') {
            leadIdNumeric = parseInt(leadIdNumeric, 10);
        }

        const stageId = lead?.stageId?._id || lead?.stageId; // Handle object or string
        const leadName = lead?.name || lead?.leadName || 'Unknown Lead';
        const leadId = lead?._id || lead?.id || 'unknown';

        await historyService.setPendingFeedback(
            leadId,
            leadName,
            phoneNumber,
            leadIdNumeric,
            stageId
        );

        setBlockingCall({
            leadName,
            phoneNumber,
            leadIdNumeric,
            stageId,
            leadId
        });

        await AsyncStorage.setItem('active_call_number', phoneNumber);

        Linking.openURL(`tel:${phoneNumber}`).catch(() => {
            Alert.alert('Error', 'Unable to open dialer');
            historyService.clearPendingFeedback();
            AsyncStorage.removeItem('active_call_number');
            setBlockingCall(null);
        });
    };

    const handleSaveFeedback = async (outcome: string, remarks: string, selectedStageId?: string) => {
        if (!blockingCall || !currentCallLog) return;

        setLoading(true);
        try {
            const user = await authService.getUser();
            const userId = user?.userId;
            const finalStageId = selectedStageId || blockingCall.stageId || '';

            if (userId && blockingCall.leadIdNumeric) {
                let startedAtIso = new Date().toISOString();
                if (currentCallLog.dateTime) {
                    startedAtIso = currentCallLog.dateTime;
                } else if (currentCallLog.timestamp) {
                    startedAtIso = new Date(Number(currentCallLog.timestamp)).toISOString();
                }

                await callLogsApi.createLog({
                    leadId: blockingCall.leadIdNumeric,
                    userId: userId,
                    duration: currentCallLog.duration,
                    outcome: outcome,
                    stageId: finalStageId,
                    remark: remarks,
                    startedAt: startedAtIso
                });

                Alert.alert('Success', 'Call log created successfully.');
            }

            const interaction: Interaction = {
                id: Date.now().toString(),
                leadId: blockingCall.leadId,
                leadName: blockingCall.leadName,
                type: 'CALL',
                duration: currentCallLog.duration,
                status: outcome + ' | ' + currentCallLog.callType,
                remarks: remarks,
                timestamp: currentCallLog.timestamp,
                date: new Date().toISOString()
            };

            await historyService.addInteraction(interaction);
            await historyService.clearPendingFeedback();

            // Mark this number as processed to prevent checkLastCall from reopening modal
            lastProcessedCall.current = {
                phoneNumber: blockingCall.phoneNumber,
                timestamp: Date.now()
            };

            // Also ensure active_call_number is cleared
            await AsyncStorage.removeItem('active_call_number');

            setBlockingCall(null);
            setFeedbackModalVisible(false);

            if (onFeedbackSuccess) {
                onFeedbackSuccess();
            }

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit call log');
        } finally {
            setLoading(false);
        }
    };

    return {
        handleCall,
        handleSaveFeedback,
        feedbackModalVisible,
        setFeedbackModalVisible,
        currentCallLog,
        blockingCall,
        loading
    };
};
