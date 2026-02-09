
// Re-export colors and constants
export * from './colors';
import { lightColors } from './colors';

// Backward compatibility for static styles
export const colors = lightColors;

// Re-export the hook from Context, but rename it to useAppTheme for consistency
import { useThemeContext } from '../context/ThemeContext';
export const useAppTheme = useThemeContext;
