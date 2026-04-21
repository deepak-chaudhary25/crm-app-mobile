
import axios from 'axios';
import { Platform, ToastAndroid } from 'react-native';
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
        if (config.data) {
        }
        if (config.params) {
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
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const isMutation = originalRequest?.method && ['post', 'put', 'patch', 'delete'].includes(originalRequest.method.toLowerCase());

        // 1-Retry Logic for Mutations specifically (or general networks)
        if (isMutation && originalRequest && !originalRequest._retry) {
            // Check if it's a network error (no response) or server error (500+)
            if (!error.response || error.response.status >= 500) {
                originalRequest._retry = true;
                console.log('🔄 [API] Automatically retrying failed mutation (1 attempt)...');
                try {
                    const response = await api(originalRequest);
                    return response;
                } catch (retryError: any) {
                    // Retry failed as well
                    console.error('❌ [API Retry Failed]', retryError.message);
                    ToastAndroid.show('Network Issue. Request Failed.', ToastAndroid.LONG);
                    return Promise.reject(retryError);
                }
            }
        }

        if (error.response) {
            console.error('❌ [API Response Error]', error.response.status, error.response.config?.url);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));

            // Handle 401 Unauthorized
            if (error.response.status === 401) {
                await authService.removeToken();
                if (navigationRef.isReady()) {
                    navigationRef.navigate('Login' as never);
                }
            }
        } else {
            console.error('❌ [API Network Error]', error.message);
            // Show toast for non-mutation network errors as well if needed, but primarily POST concerns us
            if (!isMutation) ToastAndroid.show('Network Error / No Connection', ToastAndroid.SHORT);
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
    getLead: async (id: string | number) => {
        try {
            // Mongo IDs are 24 char hex strings, use /leads/:id. Otherwise (like 481), use /leads/lead/:id
            const isMongoId = typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
            const endpoint = isMongoId ? `/leads/${id}` : `/leads/lead/${id}`;
            const response = await api.get(endpoint);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch lead details' };
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
    },
    createLead: async (leadData: {
        name: string;
        phone: string;
        email?: string;
        source: string;
        assignedTo?: string;
        reason?: string;
        stageId?: string;
        source_campaign?: string;
    }) => {
        try {
            const response = await api.post('/leads', leadData);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to create lead' };
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
    createLog: async (data: { leadId: number; userId: string; duration: number; outcome: string; stageId?: string; remark: string; startedAt?: string }) => {
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
            const response = await api.get('/call-logs/users', { params: queryParams });
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch call logs' };
        }
    },
    getLeadLogs: async (leadId: number, params: any = {}) => {
        try {
            const response = await api.get(`/call-logs/lead/${leadId}`, { params });
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch lead logs' };
        }
    }
};

export const interactionLogsApi = {
    createLog: async (data: { leadId: number; source: string; outcome: string; stageId?: string }) => {
        try {
            const response = await api.post('/interaction-logs', data);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to create interaction log' };
        }
    },
    getLogs: async (params: any = {}) => {
        try {
            const queryParams = {
                page: 1,
                limit: 10,
                ...params
            };
            const response = await api.get('/interaction-logs/users', { params: queryParams });
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch interaction logs' };
        }
    },
    getByLeadId: async (leadId: number | string, params: any = {}) => {
        try {
            const response = await api.get(`/interaction-logs/lead/${leadId}`, { params });
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch interaction logs for lead' };
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
    },
    getSchedules: async (params: any = {}) => {
        try {
            const response = await api.get('/lead-schedules', { params });
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { message: 'Failed to fetch schedules' };
        }
    },
    completeSchedule: async (scheduleId: string) => {
        try {
            const response = await api.patch(`/lead-schedules/${scheduleId}/complete`);
            return response.data;
        } catch (error: any) {
            console.error('❌ [API Error] completeSchedule:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Failed to complete schedule' };
        }
    }
};

export const ivrApi = {
    clickToCall: async (data: { leadId: string | number }) => {
        try {
            console.log('[IVR] clickToCall Payload:', data);
            const response = await api.post('/IVR/click-to-call', data);
            console.log('[IVR] clickToCall Response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[IVR] clickToCall Error:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Failed to initiate IVR call' };
        }
    },
    submitCallLog: async (data: { callId: string; outcome: string; stageId?: string; remark: string }) => {
        try {
            console.log('[IVR] submitCallLog Payload:', data);
            const response = await api.post('/IVR/submit-call-log', data);
            console.log('[IVR] submitCallLog Response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[IVR] submitCallLog Error:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Failed to submit IVR call log' };
        }
    }
};
// Public axios instance (no auth token) for PCAT APIs
const publicApi = axios.create({
    baseURL: 'https://api.upskillab.com',
    headers: { 'Content-Type': 'application/json' },
});

export const pcatApi = {
    getOngoingExam: async () => {
        try {
            console.log('[PCAT] Fetching ongoing exam...');
            const response = await publicApi.get('/pcat/exams/ongoing/exam');
            console.log('[PCAT] Ongoing exam response:', response.data);
            return response.data;
        } catch (error: any) {
            console.log('[PCAT] Ongoing exam error:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Failed to fetch ongoing exam' };
        }
    },
    registerUser: async (data: { examId: string; name: string; email: string; number: string }) => {
        try {
            console.log('[PCAT] Register payload:', data);
            const response = await publicApi.post('/pcat-users/register', data);
            console.log('[PCAT] Register response:', response.data);
            return response.data;
        } catch (error: any) {
            console.log('[PCAT] Register error:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Failed to register for exam' };
        }
    }
};
