/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const AppColors = {
  brand: '#163b2d',
  primary: '#1e4a38',
  primaryLight: '#285c3b',
  accent: '#c5e86c',
  accentLight: '#e8f3d4',
  accentSubtle: '#f2f8e7',
  solar: '#f59e0b',
  solarSoft: '#fef3c7',
  solarGold: '#eab308',
  bg: '#f5f7f3',
  surface: '#ffffff',
  surfaceSubtle: '#f9faf8',
  border: '#dce6d9',
  borderSubtle: '#eef3ec',
  borderFocus: '#285c3b',
  text: '#163b2d',
  textMuted: '#668263',
  textSubtle: '#8fa38c',
  textInverted: '#ffffff',
  error: '#b42318',
  errorBg: '#fee2e2',
  errorBorder: '#fca5a5',
  success: '#166534',
  successBg: '#dcfce7',
  successBorder: '#86efac',
  warning: '#854d0e',
  warningBg: '#fef9c3',
  warningBorder: '#fde047',
} as const;

