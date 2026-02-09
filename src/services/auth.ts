import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from './api';

const AUTH_TOKEN_KEY = 'user_token';
const AUTH_USER_KEY = 'auth_user';

export interface Permission {
    module: string;
    actions: string[];
    _id?: string;
}

// Interface matching the backend response for 'user'
export interface BackendUser {
    id: string;
    name: string;
    email: string;
    role: {
        id: string;
        name: string;
        roleRealName: string;
        isSuperAdmin: boolean;
    };
    permissions: Permission[];
    status: string;
    isBlocked: boolean;
    // ... other fields
}

// This interface describes the structure of the user data stored in AsyncStorage (App usage)
export interface AuthUser {
    userId: string;
    name: string;
    email: string;
    role: string;      // role.name e.g. 'bd'
    roleRealName: string; // e.g. 'Sales Manager'
    isSuperAdmin: boolean;
    permissions: string[]; // Flattened "module:action" strings
}

export const authService = {
    setToken: async (token: string) => {
        try {
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
        } catch (e) {
            console.error('Failed to save token', e);
        }
    },

    getToken: async () => {
        try {
            return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        } catch (e) {
            console.error('Failed to get token', e);
            return null;
        }
    },

    removeToken: async () => {
        try {
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            await AsyncStorage.removeItem(AUTH_USER_KEY);
        } catch (e) {
            console.error('Failed to remove token or user data', e);
        }
    },

    logout: async () => {
        try {
            await authApi.logout();
        } catch (e) {
            console.error('Logout API call failed', e);
        } finally {
            await authService.removeToken();
        }
    },

    login: async (email: string, pass: string) => {
        try {
            const response = await authApi.login(email, pass);
            // Response: { access_token, user: { ... } }

            if (response && response.access_token && response.user) {
                await authService.saveAuthSession(response.access_token, response.user);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    },

    saveAuthSession: async (token: string, userData: BackendUser) => {
        try {
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);

            // Map Backend User structure to App AuthUser
            const user: AuthUser = {
                userId: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role?.name || 'user',
                roleRealName: userData.role?.roleRealName || '',
                isSuperAdmin: userData.role?.isSuperAdmin || false,
                // Flatten permissions: "module:action"
                permissions: userData.permissions ? userData.permissions.flatMap((p: any) =>
                    p.actions.map((action: string) => `${p.module}:${action}`)
                ) : []
            };

            await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        } catch (error) {
            console.error('Failed to save auth session', error);
        }
    },

    getUser: async (): Promise<AuthUser | null> => {
        try {
            const userDataString = await AsyncStorage.getItem(AUTH_USER_KEY);
            if (!userDataString) return null;
            return JSON.parse(userDataString) as AuthUser;
        } catch (e) {
            console.error('Failed to retrieve or parse stored user data', e);
            return null;
        }
    },


    hasPermission: async (module: string, action: string): Promise<boolean> => {
        const user = await authService.getUser();
        if (!user) return false;

        // Super Admin Bypass
        if (user.role === 'admin' || user.role === 'super_admin') return true;

        // Check explicit permission
        // We stored permissions as "module:action"
        const requiredPermission = `${module}:${action}`;
        return user.permissions.includes(requiredPermission);
    }
};
