export const COLORS = {
    primary: '#006B3E', // Deep Kenyan Green for a more professional, reliable feel
    accent: '#E31B23',  // Kenyan Red for urgency/alerts
    gold: '#D4AF37',    // Premium gold
    black: '#0A0A0A',
    white: '#FFFFFF',

    // Neutral palette
    background: '#F0F2F5',
    surface: '#FFFFFF',
    surfaceVariant: '#F7F9FC',
    border: '#E1E4E8',

    // Text palette
    text: '#1A1D21',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',

    // Semantic colors
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Glassmorphism
    glass: 'rgba(255, 255, 255, 0.7)',
    glassDark: 'rgba(0, 0, 0, 0.5)',

    // Shadows
    shadow: 'rgba(0, 0, 0, 0.08)',
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    huge: 64,
};

export const BORDER_RADIUS = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 20,
    xl: 24,
    xxl: 32,
    full: 9999,
};

export const SHADOWS = {
    soft: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 5,
    },
    medium: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
        elevation: 8,
    },
    premium: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 1,
        shadowRadius: 32,
        elevation: 12,
    },
};

export const ANIMATIONS = {
    fast: 200,
    normal: 400,
    slow: 600,
};
