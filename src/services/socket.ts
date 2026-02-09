import { io, Socket } from 'socket.io-client';
import { Alert as RNAlert } from 'react-native';
import { authService } from './auth';
import { notificationHelper } from '../utils/notificationHelper';

// Replace with your backend URL
const SOCKET_URL = 'https://crm.upskillab.in';

let socket: Socket | null = null;

export const socketService = {
    connect: async () => {
        const token = await authService.getToken();
        if (!token) {
            console.log('⚠️ [Socket] No token found, skipping connection.');
            return;
        }

        if (socket?.connected) {
            console.log('✅ [Socket] Already connected.');
            return;
        }

        console.log('🔌 [Socket] Connecting to:', SOCKET_URL);

        socket = io(SOCKET_URL, {
            auth: {
                token: token
            },
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', async () => {
            console.log('✅ [Socket] Connected:', socket?.id);
            const user = await authService.getUser();
            if (user?.userId) {
                console.log('👉 [Socket] Joining room for user:', user.userId);
                socket?.emit('join', { userId: user.userId });
            }
        });

        socket.on('connect_error', (err) => {
            console.error('❌ [Socket] Connection error:', err.message);
        });

        socket.on('disconnect', (reason) => {
            console.log('⚠️ [Socket] Disconnected:', reason);
        });

        // Listen for specific events
        socket.on('lead-schedule-reminder', async (data: any) => {
            console.log('🔔 [Socket] Reminder Received:', data);

            // Construct message
            const title = 'Lead Schedule Reminder';
            const body = data.message || `Upcoming follow-up for Lead #${data.leadId}`;

            // 1. Show In-App Alert (if app is open)
            if (RNAlert) {
                RNAlert.alert(title, body);
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
            console.log('🔌 [Socket] Disconnected manually.');
        }
    },

    // Method to subscribe to events in components
    on: (event: string, callback: (data: any) => void) => {
        if (socket) {
            socket.on(event, callback);
        }
    },

    off: (event: string, callback?: (data: any) => void) => {
        if (socket) {
            socket.off(event, callback);
        }
    }
};
