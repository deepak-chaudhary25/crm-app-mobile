
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
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            const trackingNumber = await AsyncStorage.getItem('active_call_number');
            if (trackingNumber) {
                // Guard: skip if call was initiated very recently (< 5s ago)
                // This prevents premature checks when the user switches apps during a call
                const callStartStr = await AsyncStorage.getItem('call_start_time');
                if (callStartStr) {
                    const elapsed = Date.now() - parseInt(callStartStr, 10);
                    if (elapsed < 5000) {
                        console.log('[CallHandler] App active but call started <5s ago, skipping check');
                        appState.current = nextAppState;
                        return;
                    }
                }
                await checkLastCall(trackingNumber);
            }
        }
        appState.current = nextAppState;
    };

    const checkLastCall = async (targetNumber: string) => {
        setTimeout(async () => {
            const log = await callLogService.getLastCall(targetNumber);

            if (log) {
                // Check if we just processed this number recently (within last 10 seconds)
                if (lastProcessedCall.current &&
                    lastProcessedCall.current.phoneNumber === log.phoneNumber &&
                    (Date.now() - lastProcessedCall.current.timestamp < 10000)) {
                    return;
                }

                // Call ended — clean up tracking and show modal
                await AsyncStorage.removeItem('active_call_number');
                await AsyncStorage.removeItem('call_start_time');

                // Ensure blockingCall is set, otherwise try to recover it from storage
                if (!blockingCall) {
                    const pending = await historyService.getPendingFeedback();
                    if (pending) {
                        setBlockingCall(pending);
                    } else {
                        console.warn('Could not recover blockingCall in checkLastCall.');
                    }
                }
                setCurrentCallLog(log);
                setFeedbackModalVisible(true);
            } else {
                // No call log found — call may still be ongoing or was cancelled
                // Only clear if enough time has passed since call was started (>30s = likely a cancel)
                const callStartStr = await AsyncStorage.getItem('call_start_time');
                const elapsed = callStartStr ? Date.now() - parseInt(callStartStr, 10) : 0;

                if (elapsed > 30000) {
                    // Enough time passed but no call log — likely a cancelled/failed call
                    console.log('[CallHandler] No call log found after 30s+, clearing pending state');
                    await AsyncStorage.removeItem('active_call_number');
                    await AsyncStorage.removeItem('call_start_time');
                    await historyService.clearPendingFeedback();
                    setBlockingCall(null);
                } else {
                    // Call might still be ongoing — do NOT clear anything
                    console.log('[CallHandler] No call log yet, call may still be ongoing. Keeping tracking alive.');
                }
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
                // No call log found on app restart/focus
                // Clear the pending state since it was likely a cancelled attempt
                await historyService.clearPendingFeedback();
                setBlockingCall(null);
            }
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
        await AsyncStorage.setItem('call_start_time', Date.now().toString());

        Linking.openURL(`tel:${phoneNumber}`).catch(() => {
            Alert.alert('Error', 'Unable to open dialer');
            historyService.clearPendingFeedback();
            AsyncStorage.removeItem('active_call_number');
            AsyncStorage.removeItem('call_start_time');
            setBlockingCall(null);
            onFeedbackSuccessRef.current = undefined;
        });
    };

    const handleSaveFeedback = async (outcome: string, remarks: string, selectedStageId?: string, scheduleDate?: Date) => {

        // Recover blockingCall if missing (e.g. app restart)
        let activeBlockingCall = blockingCall;
        if (!activeBlockingCall) {
            console.warn('Missing blockingCall in handleSaveFeedback, attempting recovery...');
            const pending = await historyService.getPendingFeedback();
            if (pending) {
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

        const blockingCallToUse = activeBlockingCall;

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

                const response = await callLogsApi.createLog(payload);

                if (scheduleDate) {
                    const { schedulesApi } = require('../services/api');
                    await schedulesApi.createSchedule({
                        leadId: blockingCallToUse.leadIdNumeric,
                        scheduledAt: scheduleDate.toISOString(),
                    });
                }

                // --- AUTO-COMPLETE SCHEDULE IF CALL WAS TRIGGERED FROM A FOLLOWUP TASK ---
                if (blockingCallToUse.scheduleId) {
                    try {
                        const { schedulesApi } = require('../services/api');
                        await schedulesApi.completeSchedule(blockingCallToUse.scheduleId);
                    } catch (taskErr) {
                        console.error('Failed to auto-complete task:', taskErr);
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

            // Also ensure call tracking is cleared
            await AsyncStorage.removeItem('active_call_number');
            await AsyncStorage.removeItem('call_start_time');
            setBlockingCall(null);
            setFeedbackModalVisible(false);

            // Execute the success callback (e.g., refresh lead list)
            if (onFeedbackSuccessRef.current) {
                onFeedbackSuccessRef.current();
                onFeedbackSuccessRef.current = undefined;
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
