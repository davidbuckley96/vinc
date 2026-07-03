/**
 * Vinc design tokens — visual direction "C" (purple fintech), chosen by David
 * in design round 1 (docs/06-decisoes.md D-005, docs/04-design.md).
 * All UI colors must come from here; never hardcode colors in screens.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17141F',
    textSecondary: '#6B7280',
    background: '#FFFFFF',
    backgroundElement: '#F4F1FA',
    backgroundSelected: '#E9E2F8',
    primary: '#6D28D9',
    onPrimary: '#FFFFFF',
    onPrimaryMuted: '#D8CCF3',
    primarySoft: '#F1EBFD',
    primarySoftText: '#4C1D95',
    primarySoftMeta: '#6D4FAE',
    line: '#E7EAEE',
    dashedBorder: '#D5C9F2',
    success: '#059669',
    warning: '#B45309',
    danger: '#DC2626',
  },
  dark: {
    text: '#F4F2F8',
    textSecondary: '#A8A3B3',
    background: '#131019',
    backgroundElement: '#1D1827',
    backgroundSelected: '#2A2338',
    primary: '#7C3AED',
    onPrimary: '#FFFFFF',
    onPrimaryMuted: '#D8CCF3',
    primarySoft: '#251C3D',
    primarySoftText: '#D6C7F7',
    primarySoftMeta: '#B9A6E8',
    line: '#2A2338',
    dashedBorder: '#4A3C6E',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 24,
  pill: 999,
} as const;

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
