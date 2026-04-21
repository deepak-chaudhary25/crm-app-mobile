import { io, Socket } from 'socket.io-client';
import { Alert as RNAlert, Platform } from 'react-native';
import { authService } from './auth';
import { notificationHelper } from '../utils/notificationHelper';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Replace with your backend URL
const SOCKET_URL = 'https://crm.upskillab.in';

let socket: Socket | null = null;
const pendingListeners: { event: string; callback: (data: any) => void }[] = [];

export const socketService = {
    connect: async () => {
        const token = await authService.getToken();
        if (!token) {
            return;
        }

        if (socket?.connected) {
            return;
        }

        // --- CHANGE 1: Updated Configuration ---
        socket = io(SOCKET_URL, {
            auth: {
                token: token
            },
            // CHANGE 2: Added 'polling' before 'websocket'
            // Ye zaroori hai kyunki production server (https) par direct websocket kabhi-kabhi block ho jata hai.
            transports: ['polling', 'websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });

        // Attach any listeners that were registered before connection
        pendingListeners.forEach(({ event, callback }) => {
            socket?.on(event, callback);
        });

        socket.on('connect', async () => {
            console.log('✅ [Socket] Connected organically to backend endpoint!');
            
            const user = await authService.getUser();
            console.log('✅ [Socket] Extracted user:', user?.userId || 'unknown', 'Attempting to boot absolute Foreground Service...');
            
            // Start Foreground Service to keep socket alive (Android-only)
            // iOS uses AppState listeners for reconnection instead of a foreground service.
            if (Platform.OS === 'android') {
                try {
                    // Ensure Android 13+ Runtime Permissions are physically granted before attempting Service Boot
                    const permResult = await notifee.requestPermission();
                    console.log('✅ [Socket] Notifee Permission status:', permResult.authorizationStatus);

                    const channelId = await notifee.createChannel({
                        id: 'crm_service',
                        name: 'CRM Background Service',
                        vibration: false,
                        importance: AndroidImportance.LOW,
                    });
                    
                    await notifee.displayNotification({
                        id: 'crm_socket_service', // Explicitly ID it to lock the Foreground Headless Manager
                        title: 'CRM Service Active',
                        body: 'Listening for live events and call logs.',
                        android: {
                            channelId,
                            asForegroundService: true,
                            ongoing: true,
                            color: '#2563EB',
                            smallIcon: 'ic_launcher',
                        },
                    });
                    console.log('✅ [Foreground Service] Successfully deployed and anchored to Notifee Headless Task!');
                } catch (err) {
                    console.error('❌ [Foreground Service] FATAL Error deploying active service:', err);
                }
            } else {
                console.log('✅ [Socket] iOS: Foreground service not applicable. Socket connected.');
            }
        });

        socket.on('connect_error', (err) => {
            console.error('❌ [Socket] Connection error:', err.message);
        });

        socket.on('disconnect', (reason) => {
            console.log('⚠️ [Socket] Disconnected natively. Reason:', reason);
        });
        
        socket.io.on('reconnect_attempt', (num) => {
            console.log(`[Socket] Reconnect attempt #${num}...`);
        });

        // Listen for specific events
        socket.on('lead-schedule-reminder', async (data: any) => {

            // Construct message
            const title = 'Lead Schedule Reminder';
            const body = data.message || `Upcoming follow-up for Lead #${data.leadId}`;

            // 1. Show In-App Alert (if app is open)
            if (RNAlert) {
                RNAlert.alert(
                    title,
                    body,
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        },
                        {
                            text: 'View Lead',
                            onPress: () => {
                                import('react-native').then(({ Linking }) => {
                                    // Just open the deep link to the lead detail screen
                                    openAppDeepLink(Linking, data);
                                });

                                // Helper to open the app via deep link
                                const openAppDeepLink = (LinkingModule: any, payload: any) => {
                                    if (payload.url) {
                                        let url = payload.url;
                                        if (url.includes('{leadId}')) {
                                            url = url.replace('{leadId}', payload.leadId);
                                        }
                                        LinkingModule.openURL(url).catch((err: any) => console.error('Error opening deep link from socket', err));
                                    }
                                };
                            }
                        }
                    ]
                );
            } else {
                console.warn('⚠️ [Socket] Alert module not found');
            }

            // 2. Show System Notification (for background/foreground tray)
            await notificationHelper.displayNotification(
                title,
                body,
                data
            );
        });
    },

    disconnect: () => {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    },

    // Method to subscribe to events in components
    on: (event: string, callback: (data: any) => void) => {
        if (socket) {
            socket.on(event, callback);
        } else {
            // Buffer the listener if socket isn't connected yet
            pendingListeners.push({ event, callback });
        }
    },

    off: (event: string, callback?: (data: any) => void) => {
        if (socket) {
            socket.off(event, callback);
        }
        // Remove from pending queue if it hasn't fired
        const index = pendingListeners.findIndex(l => l.event === event && l.callback === callback);
        if (index > -1) {
            pendingListeners.splice(index, 1);
        }
    }
};