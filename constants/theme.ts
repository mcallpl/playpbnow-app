import { Platform } from 'react-native';

export const Colors = {
  dark: {
    bg: '#0f1b2d',
    surface: '#152945',
    surfaceLight: '#1b3358',
    card: '#1e3a5f',
    cardHover: '#254570',
    accent: '#87ca37',
    accentGlow: 'rgba(135, 202, 55, 0.15)',
    accentSoft: 'rgba(135, 202, 55, 0.08)',
    secondary: '#6c5ce7',
    gold: '#ffd23f',
    silver: '#c0c7d6',
    bronze: '#e8985a',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.60)',
    textSoft: 'rgba(255,255,255,0.70)',
    danger: '#ff4757',
    male: '#4facfe',
    female: '#f78ca2',
    border: 'rgba(255,255,255,0.08)',
    glassBg: 'rgba(255,255,255,0.04)',
    glassStroke: 'rgba(255,255,255,0.10)',
    modalOverlay: 'rgba(0,0,0,0.85)',
    modalBg: '#1e3a5f',
    inputBg: '#152945',
    inputBorder: 'rgba(255,255,255,0.10)',
    inputText: '#ffffff',
    inputPlaceholder: 'rgba(255,255,255,0.45)',
    // backward-compat keys
    background: '#0f1b2d',
    tint: '#87ca37',
    icon: 'rgba(255,255,255,0.60)',
    tabIconDefault: 'rgba(255,255,255,0.60)',
    tabIconSelected: '#87ca37',
  },
  light: {
    bg: '#f5f7fa',
    surface: '#ffffff',
    surfaceLight: '#f0f2f5',
    card: '#ffffff',
    cardHover: '#f8f9fb',
    accent: '#6db82c',
    accentGlow: 'rgba(109, 184, 44, 0.12)',
    accentSoft: 'rgba(109, 184, 44, 0.06)',
    secondary: '#6c5ce7',
    gold: '#f5a623',
    silver: '#8e99a4',
    bronze: '#cd7f32',
    text: '#1a1d26',
    textMuted: '#6b7394',
    textSoft: '#8892b0',
    danger: '#ff4757',
    male: '#4facfe',
    female: '#f78ca2',
    border: 'rgba(0,0,0,0.08)',
    glassBg: 'rgba(0,0,0,0.02)',
    glassStroke: 'rgba(0,0,0,0.06)',
    modalOverlay: 'rgba(0,0,0,0.5)',
    modalBg: '#ffffff',
    inputBg: '#f0f2f5',
    inputBorder: '#e0e3ea',
    inputText: '#1a1d26',
    inputPlaceholder: '#999999',
    // backward-compat keys
    background: '#f5f7fa',
    tint: '#6db82c',
    icon: '#6b7394',
    tabIconDefault: '#6b7394',
    tabIconSelected: '#6db82c',
  },
};

export type ThemeColors = typeof Colors.dark;

// Font family constants
export const FONT_DISPLAY_BLACK = 'Outfit_900Black';
export const FONT_DISPLAY_EXTRABOLD = 'Outfit_800ExtraBold';
export const FONT_DISPLAY_BOLD = 'Outfit_700Bold';
export const FONT_DISPLAY_SEMIBOLD = 'Outfit_600SemiBold';
export const FONT_DISPLAY_MEDIUM = 'Outfit_500Medium';
export const FONT_DISPLAY_REGULAR = 'Outfit_400Regular';
export const FONT_BODY_BOLD = 'DMSans_700Bold';
export const FONT_BODY_SEMIBOLD = 'DMSans_600SemiBold';
export const FONT_BODY_MEDIUM = 'DMSans_500Medium';
export const FONT_BODY_REGULAR = 'DMSans_400Regular';

// Premium UI spacing
export const SPACING = {
  screenPadding: 20,
  cardPadding: 16,
  sectionSpacing: 24,
} as const;

// Animation timing
export const ANIMATION = {
  fadeDuration: 200,
  slideDuration: 200,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
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
