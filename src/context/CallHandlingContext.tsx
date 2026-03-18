
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { historyService, Interaction } from '../services/history';
import { callLogService, CallLogEntry } from '../services/callLog';
import { authService } from '../services/auth';
import { callLogsApi } from '../services/api';
import { CallFeedbackModal } from '../components/CallFeedbackModal';

interface CallHandlingContextType {
    handleCall: (phoneNumber?: string, lead?: any, onSuccess?: () => void, scheduleId?: string) => Promise<void>;
    feedbackModalVisible: boolean;
    currentCallLog: CallLogEntry | null;
    blockingCall: any;
    loading: boolean;
    setFeedbackModalVisible: (visible: boolean) => void;
    handleSaveFeedback: (outcome: string, remarks: string, selectedStageId?: string, scheduleDate?: Date) => Promise<void>;
}

const CallHandlingContext = createContext<CallHandlingContextType | undefined>(undefined);

export const CallHandlingProvider = ({ children }: { children: React.ReactNode }) => {
    const appState = useRef(AppState.currentState);
    const lastProcessedCall = useRef<{ phoneNumber: string; timestamp: number } | null>(null);
    const [blockingCall, setBlockingCall] = useState<any>(null);
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [currentCallLog, setCurrentCallLog] = useState<CallLogEntry | null>(null);
    const [loading, setLoading] = useState(false);

    // Ref to store the success callback for the CURRENT active call
    const onFeedbackSuccessRef = useRef<(() => void) | undefined>(undefined);

    // Initial Checks
    useEffect(() => {
        checkBlockingState();

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, []);

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        console.log('CallHandlingProvider: handleAppStateChange', { nextAppState, current: appState.current });

        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            const trackingNumber = await AsyncStorage.getItem('active_call_number');
            console.log('App became active. Tracking number:', trackingNumber);
            if (trackingNumber) {
                await checkLastCall(trackingNumber);
            }
        }
        appState.current = nextAppState;
    };

    const checkLastCall = async (targetNumber: string) => {
        console.log('checkLastCall triggered for:', targetNumber);
        setTimeout(async () => {
            const log = await callLogService.getLastCall(targetNumber);
            await AsyncStorage.removeItem('active_call_number');
            console.log('callLogService.getLastCall result:', log);

            if (log) {
                // Check if we just processed this number recently (within last 10 seconds)
                if (lastProcessedCall.current &&
                    lastProcessedCall.current.phoneNumber === log.phoneNumber &&
                    (Date.now() - lastProcessedCall.current.timestamp < 10000)) {
                    console.log('Skipping checkLastCall, already processed recently', lastProcessedCall.current);
                    return;
                }

                // Ensure blockingCall is set, otherwise try to recover it from storage
                if (!blockingCall) {
                    const pending = await historyService.getPendingFeedback();
                    if (pending) {
                        console.log('Recovered blockingCall from storage in checkLastCall');
                        setBlockingCall(pending);
                    } else {
                        console.warn('Could not recover blockingCall in checkLastCall. Proceeding without context might fail save.');
                    }
                }

                console.log('Setting currentCallLog and opening modal from checkLastCall');
                setCurrentCallLog(log);
                setFeedbackModalVisible(true);
            } else {
                console.log('No call log found for tracking number. Assuming call cancelled.');
                // User cancelled the call, so we must unblock them immediately
                await historyService.clearPendingFeedback();
                setBlockingCall(null);
            }
        }, 1500);
    };

    const checkBlockingState = async () => {
        console.log('checkBlockingState called');
        const pending = await historyService.getPendingFeedback();
        console.log('Pending feedback:', pending);

        if (pending) {
            setBlockingCall(pending);
            const log = await callLogService.getLastCall(pending.phoneNumber);
            console.log('Blocking call log found:', log);

            if (log) {
                // Determine if the call was actually connected or at least dialed
                // Some phones log 0 duration for missed/cancelled. 
                // User wants "actual call has been placed (call dialed)"
                // A cancelled call usually doesn't appear in logs or appears with 0 duration.
                // If getLastCall returned a log, it exists in history. 
                // We should respect that.

                setCurrentCallLog(log);
                setFeedbackModalVisible(true);
            } else {
                // If strictly requiring actual call log, we should NOT show modal if log is missing.
                // This handles cases where user pressed 'call' but cancelled immediately before dialer registered it.
                console.log('No call log found in device history. Assuming call was not placed or cancelled.');

                // Clear the pending state since it was likely a cancelled attempt
                // user can try calling again.
                await historyService.clearPendingFeedback();
                setBlockingCall(null);
            }
        } else {
            console.log('No pending feedback found');
        }
    };

    const handleCall = async (phoneNumber?: string, lead?: any, onSuccess?: () => void, scheduleId?: string) => {
        // Store the callback for later use when feedback is saved
        onFeedbackSuccessRef.current = onSuccess;

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

        let leadIdNumeric = lead?.leadId || lead?.id;
        if (typeof leadIdNumeric === 'string') {
            leadIdNumeric = parseInt(leadIdNumeric, 10);
        }

        const stageId = lead?.stageId?._id || lead?.stageId;
        const leadName = lead?.name || lead?.leadName || 'Unknown Lead';
        const leadId = lead?._id || lead?.id || 'unknown';

        await historyService.setPendingFeedback(
            leadId,
            leadName,
            phoneNumber,
            leadIdNumeric,
            stageId,
            scheduleId
        );

        setBlockingCall({
            leadName,
            phoneNumber,
            leadIdNumeric,
            stageId,
            leadId,
            scheduleId
        });

        await AsyncStorage.setItem('active_call_number', phoneNumber);

        Linking.openURL(`tel:${phoneNumber}`).catch(() => {
            Alert.alert('Error', 'Unable to open dialer');
            historyService.clearPendingFeedback();
            AsyncStorage.removeItem('active_call_number');
            setBlockingCall(null);
            onFeedbackSuccessRef.current = undefined; // Clear callback on failure
        });
    };

    const handleSaveFeedback = async (outcome: string, remarks: string, selectedStageId?: string, scheduleDate?: Date) => {
        console.log('handleSaveFeedback called', { outcome, remarks, selectedStageId, hasSchedule: !!scheduleDate, blockingCallState: !!blockingCall, currentCallLogState: !!currentCallLog });

        // Recover blockingCall if missing (e.g. app restart)
        let activeBlockingCall = blockingCall;
        if (!activeBlockingCall) {
            console.warn('Missing blockingCall in handleSaveFeedback, attempting recovery...');
            const pending = await historyService.getPendingFeedback();
            if (pending) {
                console.log('Recovered blockingCall from storage');
                activeBlockingCall = pending;
                setBlockingCall(pending);
            }
        }

        if (!activeBlockingCall || !currentCallLog) {
            console.error('Missing blockingCall or currentCallLog even after recovery attempt', { activeBlockingCall, currentCallLog });
            Alert.alert('Error', 'Could not save feedback: Call context lost.');
            setFeedbackModalVisible(false);
            return;
        }

        const blockingCallToUse = activeBlockingCall; // Use local variable for safety

        setLoading(true);
        try {
            const user = await authService.getUser();
            const userId = user?.userId;
            const finalStageId = selectedStageId || blockingCallToUse.stageId || '';

            if (userId && blockingCallToUse.leadIdNumeric) {
                let startedAtIso = new Date().toISOString();
                if (currentCallLog.timestamp) {
                    startedAtIso = new Date(Number(currentCallLog.timestamp)).toISOString();
                } else if (currentCallLog.dateTime) {
                    try {
                        startedAtIso = new Date(currentCallLog.dateTime).toISOString();
                    } catch (e) {
                        console.warn('Failed to parse dateTime', currentCallLog.dateTime);
                    }
                }

                const payload = {
                    leadId: blockingCallToUse.leadIdNumeric,
                    userId,
                    duration: currentCallLog.duration,
                    outcome,
                    stageId: finalStageId,
                    remark: remarks,
                    startedAt: startedAtIso
                };

                console.log('🚀 [Call Log Payload]', JSON.stringify(payload, null, 2));

                const response = await callLogsApi.createLog(payload);

                console.log('Call log created successfully. Response:', JSON.stringify(response, null, 2));

                if (scheduleDate) {
                    const { schedulesApi } = require('../services/api'); // Lazy import to avoid circular dependency
                    await schedulesApi.createSchedule({
                        leadId: blockingCallToUse.leadIdNumeric,
                        scheduledAt: scheduleDate.toISOString(),
                    });
                    console.log('Follow-up schedule created successfully.');
                }

                // --- AUTO-COMPLETE SCHEDULE IF CALL WAS TRIGGERED FROM A FOLLOWUP TASK ---
                if (blockingCallToUse.scheduleId) {
                    try {
                        const { schedulesApi } = require('../services/api');
                        await schedulesApi.completeSchedule(blockingCallToUse.scheduleId);
                        console.log(`Task ${blockingCallToUse.scheduleId} marked as complete.`);
                    } catch (taskErr) {
                        console.error('Failed to auto-complete task:', taskErr);
                        // We do not block the success alert since the call log itself was saved.
                    }
                }

                Alert.alert('Success', 'Call log & feedback saved successfully.');
            } else {
                console.warn('Skipping createLog: Missing userId or leadIdNumeric', { userId, leadIdNumeric: blockingCallToUse.leadIdNumeric });
            }

            const interaction: Interaction = {
                id: Date.now().toString(),
                leadId: blockingCallToUse.leadId,
                leadName: blockingCallToUse.leadName,
                type: 'CALL',
                duration: currentCallLog.duration,
                status: outcome + ' | ' + currentCallLog.callType,
                remarks: remarks,
                timestamp: currentCallLog.timestamp,
                date: new Date().toISOString()
            };

            await historyService.addInteraction(interaction);
            await historyService.clearPendingFeedback();

            // Mark this number as processed
            lastProcessedCall.current = {
                phoneNumber: blockingCallToUse.phoneNumber,
                timestamp: Date.now()
            };

            // Also ensure active_call_number is cleared
            await AsyncStorage.removeItem('active_call_number');

            console.log('Closing modal and clearing blocking call');
            setBlockingCall(null);
            setFeedbackModalVisible(false);

            // Execute the success callback (e.g., refresh lead list)
            if (onFeedbackSuccessRef.current) {
                console.log('Calling onFeedbackSuccess callback');
                onFeedbackSuccessRef.current();
                onFeedbackSuccessRef.current = undefined; // Reset after usage
            }

        } catch (error: any) {
            console.error('Error in handleSaveFeedback:', error);
            Alert.alert('Error', error.message || 'Failed to submit call log');
        } finally {
            setLoading(false);
        }
    };

    return (
        <CallHandlingContext.Provider value={{
            handleCall,
            feedbackModalVisible,
            currentCallLog,
            blockingCall,
            loading,
            setFeedbackModalVisible,
            handleSaveFeedback
        }}>
            {children}
            {/* Global Modal Instance */}
            <CallFeedbackModal
                visible={feedbackModalVisible}
                callLog={currentCallLog}
                leadName={blockingCall?.leadName || 'Unknown Lead'}
                currentStageId={blockingCall?.stageId}
                onSave={handleSaveFeedback}
            />
        </CallHandlingContext.Provider>
    );
};

export const useCallHandlingContext = () => {
    const context = useContext(CallHandlingContext);
    if (!context) {
        throw new Error('useCallHandlingContext must be used within a CallHandlingProvider');
    }
    return context;
};
