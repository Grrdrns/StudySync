/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Modern student-friendly colors - soft and clean
const tintColorLight = '#6366F1'; // Indigo - primary
const tintColorDark = '#818CF8'; // Light indigo

export const Colors = {
  light: {
    text: '#1F2937',
    background: '#FAFBFC',
    tint: tintColorLight,
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    // Extended palette for dashboard
    accent: '#EC4899', // Pink for deadlines
    success: '#10B981', // Green for completed
    warning: '#F59E0B', // Amber for upcoming
    secondary: '#8B5CF6', // Purple
    surface: '#FFFFFF',
    border: '#E5E7EB',
    softBg: '#F3F4F6',
  },
  dark: {
    text: '#F3F4F6',
    background: '#0F172A',
    tint: tintColorDark,
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorDark,
    // Extended palette for dashboard
    accent: '#F472B6', // Light pink
    success: '#34D399', // Light green
    warning: '#FBBF24', // Light amber
    secondary: '#A78BFA', // Light purple
    surface: '#1E293B',
    border: '#334155',
    softBg: '#1E293B',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
