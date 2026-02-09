
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme/colors';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    colors: typeof lightColors;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    themeMode: 'system',
    setThemeMode: () => { },
    colors: lightColors,
    isDark: false,
});

const THEME_KEY = 'user_theme_preference';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Load saved theme preference
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_KEY);
                if (savedTheme) {
                    setThemeModeState(savedTheme as ThemeMode);
                }
            } catch (e) {
                console.error('Failed to load theme', e);
            } finally {
                setIsReady(true);
            }
        };
        loadTheme();
    }, []);

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            await AsyncStorage.setItem(THEME_KEY, mode);
        } catch (e) {
            console.error('Failed to save theme', e);
        }
    };

    // Determine actual theme
    const isDark =
        themeMode === 'dark' ||
        (themeMode === 'system' && systemScheme === 'dark');

    const colors = isDark ? darkColors : lightColors;

    if (!isReady) {
        return null; // Or a splash screen placeholder if needed, but App splash handles it mostly
    }

    return (
        <ThemeContext.Provider value={{ themeMode, setThemeMode, colors, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useThemeContext = () => useContext(ThemeContext);
