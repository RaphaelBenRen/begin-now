// ─── Design System — Bleu Marine Glassmorphism ─────────────────

export const colors = {
  background: '#0a1628',
  surface: 'rgba(15, 25, 50, 0.95)',
  border: 'rgba(255, 255, 255, 0.2)',
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.4)',
  },
  primary: '#1e3a5f',
  secondary: '#152238',
  accent: '#3b82f6',
  accentLight: 'rgba(59, 130, 246, 0.15)',
  success: '#00b894',
  successLight: 'rgba(0, 184, 148, 0.15)',
  danger: '#ff7675',
  dangerLight: 'rgba(255, 118, 117, 0.15)',
  warning: '#fdcb6e',
  warningLight: 'rgba(253, 203, 110, 0.15)',
  info: '#74b9ff',
  glass: {
    bg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
    bgStrong: 'rgba(255, 255, 255, 0.15)',
  },
  gradient: {
    start: '#0a1628',
    middle: '#162d50',
    end: '#1a2740',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  full: 999,
};

export const typography = {
  h1: { fontSize: 30, fontWeight: '700', color: colors.text.primary },
  h2: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  h3: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  h4: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  body: { fontSize: 16, fontWeight: '400', color: colors.text.primary },
  bodyMedium: { fontSize: 16, fontWeight: '500', color: colors.text.primary },
  small: { fontSize: 14, fontWeight: '400', color: colors.text.secondary },
  smallMedium: { fontSize: 14, fontWeight: '500', color: colors.text.secondary },
  caption: { fontSize: 12, fontWeight: '400', color: colors.text.muted },
};

export const shadows = {
  sm: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
};
