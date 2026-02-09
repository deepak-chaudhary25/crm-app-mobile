
import axios from 'axios';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { authService } from './auth';

const BASE_URL = 'https://crm.upskillab.in';

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Inject Token & Log Request
api.interceptors.request.use(
    async (config) => {
        const token = await authService.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        console.log('🚀 [API Request]', config.method?.toUpperCase(), config.url);
        console.log('   Headers:', config.headers);
        if (config.data) {
            console.log('   Payload:', JSON.stringify(config.data, null, 2));
        }
        if (config.params) {
            console.log('   Params:', JSON.stringify(config.params, null, 2));
        }

        return config;
    },
    (error) => {
        console.error('❌ [API Request Error]', error);
        return Promise.reject(error);
    }
);

import { navigationRef } from '../navigation/AppNavigator';

// Response Interceptor: Log Response & Handle Errors
api.interceptors.response.use(
    (response) => {
        console.log('✅ [API Response]', response.status, response.config.url);
        // console.log('   Data:', JSON.stringify(response.data, null, 2)); 
        return response;
    },
    async (error) => {
        if (error.response) {
            console.error('❌ [API Response Error]', error.response.status, error.response.config.url);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));

            // Handle 401 Unauthorized
            if (error.response.status === 401) {
                console.log('⚠️ Session expired or unauthorized. Redirecting to Login...');
                await authService.removeToken();
                if (navigationRef.isReady()) {
                    navigationRef.navigate('Login' as never);
                }
            }
        } else {
            console.error('❌ [API Network Error]', error.message);
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: async (email: string, pass: string) => {
        try {
            const deviceId = await DeviceInfo.getUniqueId();
            const platform = Platform.OS;

            const payload = {
                email,
                password: pass,
                // deviceId, 
                // platform
            };

            const response = await api.post('/users/login', payload);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Invalid credentials' };
        }
    },
    verifyToken: async (token: string) => {
        try {
            const deviceId = await DeviceInfo.getUniqueId();
            const platform = Platform.OS;

            const payload = {
                token,
                deviceId,
                platform
            };

            // Note: The interceptor will handle logging the payload and response now
            const response = await api.post('/app-auth/verify', payload);
            return response.data;
        } catch (error: any) {
            // Logs are handled by interceptor, so we just throw clean error for UI
            throw error.response?.data || { message: 'Network error or invalid token' };
        }
    },
    logout: async () => {
        try {
            await api.post('/users/Logout');
        } catch (error: any) {
            console.error('Logout API failed', error);
        }
    }
};

export const leadsApi = {
    getLeads: async (params: any = {}) => {
        try {
            // Default params
            const queryParams = {
                page: 1,
                limit: 10,
                ...params // This will include search, status, etc.
            };

            const response = await api.get('/leads', { params: queryParams });
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch leads' };
        }
    },
    bulkAssign: async (leadIds: string[], assignedTo: string, reason: string) => {
        try {
            const payload = {
                leadIds,
                assignedTo,
                reason
            };
            const response = await api.patch('/leads/lead/assign', payload);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to assign leads' };
        }
    }
};

export const usersApi = {
    getUsers: async () => {
        try {
            const response = await api.get('/users');
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch users' };
        }
    }
};

export const stagesApi = {
    getStages: async () => {
        try {
            const response = await api.get('/lead-stages');
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch stages' };
        }
    }
};

export const callLogsApi = {
    createLog: async (data: { leadId: number; userId: string; duration: number; outcome: string; stageId: string; remark: string; startedAt?: string }) => {
        try {
            const response = await api.post('/call-logs', data);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to create call log' };
        }
    },
    getLogs: async (params: any = {}) => {
        try {
            // Default params
            const queryParams = {
                page: 1,
                limit: 10,
                ...params
            };
            const response = await api.get('/call-logs', { params: queryParams });
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch call logs' };
        }
    },
    getLeadLogs: async (leadId: number) => {
        try {
            const response = await api.get(`/call-logs/lead/${leadId}`);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch lead logs' };
        }
    }
};

export const schedulesApi = {
    createSchedule: async (data: { leadId: number; scheduledAt: string }) => {
        try {
            const response = await api.post('/lead-schedules', data);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to schedule lead' };
        }
    }
};
