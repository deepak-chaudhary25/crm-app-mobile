
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Interaction {
    id: string; // Timestamp
    leadId: string;
    leadName: string;
    type: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING';
    duration?: number; // seconds
    status?: string; // Connected, Missed, etc.
    remarks?: string;
    timestamp: number;
    date: string; // ISO String
}

const STORAGE_KEY_PREFIX = 'interactions_';
const BLOCKING_KEY = 'pending_call_feedback';

export const historyService = {
    // Add an interaction to a specific lead
    addInteraction: async (interaction: Interaction) => {
        try {
            const key = `${STORAGE_KEY_PREFIX}${interaction.leadId}`;
            const existing = await AsyncStorage.getItem(key);
            const history = existing ? JSON.parse(existing) : [];

            // Add to top
            history.unshift(interaction);

            await AsyncStorage.setItem(key, JSON.stringify(history));

            // Also add to global "recent" list for the History Tab
            await historyService.addToGlobalHistory(interaction);

        } catch (e) {
            console.error('Failed to add interaction', e);
        }
    },

    addToGlobalHistory: async (interaction: Interaction) => {
        try {
            const key = 'global_history_list';
            const existing = await AsyncStorage.getItem(key);
            let list = existing ? JSON.parse(existing) : [];

            // Add new interaction
            list.unshift(interaction);

            // Keep limit to last 100 to avoid bloat
            if (list.length > 100) {
                list = list.slice(0, 100);
            }

            await AsyncStorage.setItem(key, JSON.stringify(list));
        } catch (e) {
            console.error('Failed to update global history', e);
        }
    },

    getGlobalHistory: async (): Promise<Interaction[]> => {
        try {
            const json = await AsyncStorage.getItem('global_history_list');
            return json ? JSON.parse(json) : [];
        } catch (e) {
            return [];
        }
    },

    getLeadHistory: async (leadId: string): Promise<Interaction[]> => {
        try {
            const json = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${leadId}`);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            return [];
        }
    },

    // --- Blocking Logic ---

    setPendingFeedback: async (leadId: string, leadName: string, phoneNumber: string, leadIdNumeric: number, stageId: string) => {
        const payload = { leadId, leadName, phoneNumber, leadIdNumeric, stageId, timestamp: Date.now() };
        await AsyncStorage.setItem(BLOCKING_KEY, JSON.stringify(payload));
    },

    getPendingFeedback: async () => {
        try {
            const json = await AsyncStorage.getItem(BLOCKING_KEY);
            return json ? JSON.parse(json) : null;
        } catch {
            return null;
        }
    },

    clearPendingFeedback: async () => {
        await AsyncStorage.removeItem(BLOCKING_KEY);
    }
};
