import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Linking, Alert, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { historyService, Interaction } from '../services/history';
import { callLogService, CallLogEntry } from '../services/callLog';
import { authService } from '../services/auth';
import { callLogsApi } from '../services/api';
import { CallFeedbackModal } from '../components/CallFeedbackModal';
import { IVRFeedbackModal, IVREventData } from '../components/IVRFeedbackModal';
import { socketService } from '../services/socket';

export type CallStatus = 'IDLE' | 'CALL_IN_PROGRESS' | 'CALL_COMPLETED_PENDING_FEEDBACK';
export type CallType = 'MANUAL' | 'IVR';

export interface CallState {
    status: CallStatus;
    type: CallType;
    leadId: string;
    leadIdNumeric: number;
    leadName: string;
    phoneNumber?: string;
    stageId?: string;
    scheduleId?: string;
    callId?: string;
    duration?: number;
    startTimestamp: number;
}

const CALL_STATE_KEY = '@crm_call_state';

interface CallHandlingContextType {
    handleCall: (phoneNumber?: string, lead?: any, onSuccess?: () => void, scheduleId?: string) => Promise<void>;
    callState: CallState | null;
    currentCallLog: CallLogEntry | null;
    loading: boolean;
    setCallState: (state: CallState | null) => void;
    handleSaveFeedback: (outcome: string, remarks: string, selectedStageId?: string, scheduleDate?: Date) => Promise<void>;
}

const CallHandlingContext = createContext<CallHandlingContextType | undefined>(undefined);

export const CallHandlingProvider = ({ children }: { children: React.ReactNode }) => {
    const appState = useRef(AppState.currentState);
    const evalLock = useRef(false);
    
    const [callState, setCallStateLocal] = useState<CallState | null>(null);
    const [currentCallLog, setCurrentCallLog] = useState<CallLogEntry | null>(null);
    const [loading, setLoading] = useState(false);

    const onFeedbackSuccessRef = useRef<(() => void) | undefined>(undefined);

    // Idempotent Unified State Writer
    const setCallState = useCallback(async (newState: CallState | null) => {
        setCallStateLocal(newState);
        if (newState) {
            await AsyncStorage.setItem(CALL_STATE_KEY, JSON.stringify(newState));
        } else {
            await AsyncStorage.removeItem(CALL_STATE_KEY);
            setCurrentCallLog(null);
        }
    }, []);

    // Idempotent State Evaluation Sweep
    const evaluateState = async () => {
        if (evalLock.current) return;
        evalLock.current = true;

        try {
            const stored = await AsyncStorage.getItem(CALL_STATE_KEY);
            if (!stored) {
                setCallStateLocal(null);
                return;
            }

            const parsed: any = JSON.parse(stored);
            
            // Backward compatibility: If old state had "Normal", sanitize it immediately to "MANUAL"
            if (parsed.type === 'Normal') {
                parsed.type = 'MANUAL';
            }
            
            const state: CallState = parsed;
            setCallStateLocal(state);

            if (state.status === 'CALL_IN_PROGRESS') {
                // 1. Check Manual Logs
                if (state.type === 'MANUAL' && state.phoneNumber) {
                    const latestLog = await callLogService.getLastCall(state.phoneNumber);
                    if (latestLog) {
                        const logTime = parseInt(String(latestLog.timestamp || '0'), 10);
                        // OS limits match: log must be created after startTimestamp (with 60sec grace window)
                        if (logTime > state.startTimestamp - 60000) {
                            
                            // Mathematical Flatline Detection:
                            // Android dynamically updates duration while calling. If Date.now() completely outpaces 
                            // the (logTime + duration), the duration has flatlined and the call is biologically dead.
                            const estimatedEndTime = logTime + (latestLog.duration * 1000);
                            const hasFlatlined = Date.now() > estimatedEndTime + 8000; // 8 second physical buffer

                            if (latestLog.duration > 0 && hasFlatlined) {
                                setCurrentCallLog(latestLog);
                                await setCallState({ ...state, status: 'CALL_COMPLETED_PENDING_FEEDBACK' });
                                return;
                            } else {
                                console.log('[StateMachine: Info] Call duration is zero or actively tracking real-time. Safely assuming ongoing.');
                                setCurrentCallLog(latestLog);
                            }
                        }
                    }
                }
                
                // 2. Identify Stale Trackers (>4 Hours) silently
                if (Date.now() - state.startTimestamp > 4 * 60 * 60 * 1000) {
                    console.log('[StateMachine: Warning] Stale tracker detected (>4 Hrs). Awaiting user interaction.');
                }
            }
        } catch (error) {
            console.error('[StateMachine: Error] Evaluation sweep failed', error);
        } finally {
            evalLock.current = false;
        }
    };

    useEffect(() => {
        evaluateState();

        const handleCallCompleted = async (data: any) => {
            if (data?.callId && data?.leadId) {
                const stored = await AsyncStorage.getItem(CALL_STATE_KEY);
                if (stored) {
                    const state: CallState = JSON.parse(stored);
                    // Match socket strictly against current active IVR tracking
                    if (state.status === 'CALL_IN_PROGRESS' && state.type === 'IVR') {
                        if (String(state.leadId) === String(data.leadId) || String(state.leadIdNumeric) === String(data.leadId)) {
                            console.log('[StateMachine: Receive] IVR Socket Match. CALL_IN_PROGRESS -> CALL_COMPLETED_PENDING_FEEDBACK');
                            await setCallState({ ...state, status: 'CALL_COMPLETED_PENDING_FEEDBACK', callId: data.callId, duration: data.duration });
                        }
                    }
                }
            }
        };

        socketService.on('call-completed', handleCallCompleted);
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                evaluateState();
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
            socketService.off('call-completed', handleCallCompleted);
        };
    }, []);

    const handleCall = async (phoneNumber?: string, lead?: any, onSuccess?: () => void, scheduleId?: string) => {
        // Enforce Idempotency and run sweep before gating
        await evaluateState(); 

        const currentStored = await AsyncStorage.getItem(CALL_STATE_KEY);
        if (currentStored) {
            const parsed: any = JSON.parse(currentStored);
            if (parsed.type === 'Normal') {
                parsed.type = 'MANUAL';
            }
            const state: CallState = parsed;
            
            if (state.status === 'CALL_COMPLETED_PENDING_FEEDBACK') {
                // The automated sweep just succeeded (or user previously failed to submit).
                // The definitive React Native Feedback Modal is popping up RIGHT NOW.
                // Do not overlap an ambiguous Alert over it. Just block the new phone call securely.
                return;
            }

            if (state.status === 'CALL_IN_PROGRESS') {
                // Sweep found no hard evidence of completion. We are in true uncertainty.
                Alert.alert(
                    'Unresolved Call Status',
                    `We couldn't precisely determine the status of your previous call with ${state.leadName}. What happened?`,
                    [
                        { 
                            text: 'Call completed (Submit Feedback)', 
                            onPress: () => {
                                setTimeout(() => {
                                    setCallState({ ...state, status: 'CALL_COMPLETED_PENDING_FEEDBACK' });
                                }, 300);
                            }
                        },
                        { 
                            text: 'Call was cancelled (Clear State)', 
                            style: 'destructive', 
                            onPress: () => {
                                setTimeout(() => setCallState(null), 100);
                            }
                        },
                        { text: 'Call is still ongoing', style: 'cancel' }
                    ]
                );
                return;
            }
        }

        if (!phoneNumber) {
            Alert.alert('No Number', 'This lead does not have a phone number.');
            return;
        }

        let leadIdNumeric = lead?.leadId || lead?.id;
        if (typeof leadIdNumeric === 'string') leadIdNumeric = parseInt(leadIdNumeric, 10);
        
        const stageId = lead?.stageId?._id || lead?.stageId;
        const leadName = lead?.name || lead?.leadName || 'Unknown Lead';
        const leadId = lead?._id || lead?.id || 'unknown';

        onFeedbackSuccessRef.current = onSuccess;

        const callingMethodRaw = await AsyncStorage.getItem('calling_method') || 'IVR';
        const resolvedType: CallType = callingMethodRaw === 'Normal' ? 'MANUAL' : 'IVR';

        const newState: CallState = {
            status: 'CALL_IN_PROGRESS',
            type: resolvedType,
            leadId,
            leadIdNumeric,
            leadName,
            phoneNumber,
            stageId,
            scheduleId,
            startTimestamp: Date.now()
        };

        console.log(`[StateMachine: Dispatch] IDLE -> CALL_IN_PROGRESS | Type: ${resolvedType}`);
        await setCallState(newState);

        if (resolvedType === 'IVR') {
            try {
                const { ivrApi } = require('../services/api');
                ToastAndroid.show(`Connecting IVR: ${leadName}...`, ToastAndroid.SHORT);
                await ivrApi.clickToCall({ leadId: leadIdNumeric });
            } catch (err: any) {
                console.error('[StateMachine: IVR] Failed to initiate', err);
                ToastAndroid.show(err.message || 'Failed to initiate IVR call', ToastAndroid.LONG);
                await setCallState(null); 
            }
        } else {
            Linking.openURL(`tel:${phoneNumber}`).catch(() => {
                Alert.alert('Error', 'Unable to open dialer');
                setCallState(null);
            });
        }
    };

    const handleSaveFeedback = async (outcome: string, remarks: string, selectedStageId?: string, scheduleDate?: Date, fallbackDuration?: number, fallbackStatus?: string) => {
        if (!callState) return;
        setLoading(true);
        const finalStageId = selectedStageId || callState.stageId;
        
        try {
            const user = await authService.getUser();
            const userId = user?.userId;

            let duration = fallbackDuration || 0;
            let startedAtIso = new Date(callState.startTimestamp).toISOString();
            let finalStatusType = fallbackStatus || 'OUTGOING';

            if (callState.type === 'MANUAL' && currentCallLog) {
                duration = currentCallLog.duration;
                finalStatusType = currentCallLog.callType;
                if (currentCallLog.timestamp) {
                    startedAtIso = new Date(Number(currentCallLog.timestamp)).toISOString();
                }
            }

            if (callState.type === 'IVR') {
               if (callState.callId) {
                   const { ivrApi } = require('../services/api');
                   await ivrApi.submitCallLog({ callId: callState.callId, outcome, stageId: finalStageId, remark: remarks });
               } else {
                   // Graceful fallback for submitting manual log if IVR system dropped data
                   if(userId && callState.leadIdNumeric) {
                        const payload = {
                            leadId: callState.leadIdNumeric,
                            userId,
                            duration,
                            outcome,
                            stageId: finalStageId,
                            remark: remarks,
                            startedAt: startedAtIso
                        };
                        await callLogsApi.createLog(payload);
                   }
               }
            } else {
                if (userId && callState.leadIdNumeric) {
                    const payload = {
                        leadId: callState.leadIdNumeric,
                        userId,
                        duration,
                        outcome,
                        stageId: finalStageId,
                        remark: remarks,
                        startedAt: startedAtIso
                    };
                    await callLogsApi.createLog(payload);
                }
            }

            if (scheduleDate) {
                const { schedulesApi } = require('../services/api');
                await schedulesApi.createSchedule({
                    leadId: callState.leadIdNumeric,
                    scheduledAt: scheduleDate.toISOString(),
                });
            }

            if (callState.scheduleId) {
                try {
                    const { schedulesApi } = require('../services/api');
                    await schedulesApi.completeSchedule(callState.scheduleId);
                } catch (taskErr) {
                    console.error('Failed to auto-complete task:', taskErr);
                }
            }

            // Create interaction log mapping for history physically
            const interaction: Interaction = {
                id: Date.now().toString(),
                leadId: String(callState.leadId),
                leadName: callState.leadName,
                type: 'CALL',
                duration: duration,
                status: outcome + (callState.type === 'MANUAL' ? ' | ' + finalStatusType : ' | IVR'),
                remarks: remarks,
                timestamp: currentCallLog?.timestamp ? Number(currentCallLog.timestamp) : callState.startTimestamp,
                date: new Date().toISOString()
            };

            await historyService.addInteraction(interaction);

            Alert.alert('Success', 'Call completed successfully.');

            await setCallState(null);
            
            if (onFeedbackSuccessRef.current) {
                onFeedbackSuccessRef.current();
                onFeedbackSuccessRef.current = undefined;
            }

        } catch (error: any) {
            console.error('Error in handleSaveFeedback:', error);
            
            Alert.alert(
                'Submission Failed',
                error.message || 'We could not sync your call feedback to the servers due to a network or backend issue.',
                [
                    { 
                        text: 'Retry Submission', 
                        style: 'cancel' 
                    },
                    { 
                        text: 'Skip for Now', 
                        style: 'destructive',
                        onPress: async () => {
                            // User rule: "Optionally, the unsynced feedback data can be stored locally for future retry"
                            try {
                                const queueStr = await AsyncStorage.getItem('@offline_feedbacks') || '[]';
                                const queue = JSON.parse(queueStr);
                                queue.push({
                                    leadId: callState.leadIdNumeric,
                                    outcome,
                                    remark: remarks,
                                    stageId: finalStageId,
                                    timestamp: Date.now()
                                });
                                await AsyncStorage.setItem('@offline_feedbacks', JSON.stringify(queue));
                            } catch (e) {
                                console.error('Failed to stash offline feedback', e);
                            }
                            
                            // Most critical user rule: "system should not block further app usage"
                            await setCallState(null);
                            ToastAndroid.show('Saved offline. You may now continue using the app.', ToastAndroid.LONG);
                        }
                    }
                ]
            );
            
            // Throw so local component loading spinners gracefully exit allowing them to press Retry
            throw error; 
        } finally {
            setLoading(false);
        }
    };

    return (
        <CallHandlingContext.Provider value={{
            handleCall,
            callState,
            currentCallLog,
            loading,
            setCallState,
            handleSaveFeedback
        }}>
            {children}
            <CallFeedbackModal
                visible={callState?.status === 'CALL_COMPLETED_PENDING_FEEDBACK' && callState?.type === 'MANUAL'}
                callLog={currentCallLog}
                leadName={callState?.leadName || 'Unknown Lead'}
                currentStageId={callState?.stageId}
                onSave={handleSaveFeedback}
                onCancel={async () => {
                    // Backs away from modal natively, reverts strictly back to IN_PROGRESS so gatekeeper protects it
                    await setCallState({...callState, status: 'CALL_IN_PROGRESS'} as CallState);
                }}
            />
            <IVRFeedbackModal 
                visible={callState?.status === 'CALL_COMPLETED_PENDING_FEEDBACK' && callState?.type === 'IVR'}
                data={{ leadId: callState?.leadIdNumeric || 0, duration: callState?.duration || 0, callId: callState?.callId || '' }}
                onSave={handleSaveFeedback}
                onCancel={async () => {
                    await setCallState({...callState, status: 'CALL_IN_PROGRESS'} as CallState);
                }}
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
