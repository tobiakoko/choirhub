/**
 * ChoirHub Design System v1.0.0 — "Trustworthy Yet Vibrant"
 *
 * Single source of truth for every visual value in the app.
 * Derived from docs/design-system-v1.md. No component may use a raw
 * hex/px value — enforced by the `no-magic-tokens` lint rule.
 *
 * PLACEHOLDER: seeded with the v1.0.0 core values; extend here first,
 * then consume — never inline a value at the call site.
 */

export const tokens = {
  color: {
    // Base & canvas
    canvasBase: '#f8fafc',
    canvasElevated: '#ffffff',
    canvasInset: '#f1f5f9',
    // Structural text & ink
    inkPrimary: '#0f172a',
    inkSecondary: '#475569',
    inkTertiary: '#94a3b8',
    onColor: '#ffffff',
    // Solid interactive
    interactiveBase: '#4f46e5',
    interactiveHover: '#4338ca',
    interactiveGhost: 'rgba(79, 70, 229, 0.08)',
    // Semantic & status
    statusSuccess: '#10b981',
    statusCritical: '#e11d48',
    statusWarning: '#f59e0b',
    statusInfo: '#0ea5e9',
    // Borders & dividers
    hairline: '#e2e8f0',
    hairlineStrong: '#cbd5e1',
    // Specialized shadows
    shadowTintPrimary: 'rgba(79, 70, 229, 0.25)',
    shadowTintNeutral: 'rgba(15, 23, 42, 0.08)',
    // Sheet backdrop
    backdrop: 'rgba(15, 23, 42, 0.4)',
  },

  // Angled linear gradients (render with expo-linear-gradient at 135°)
  gradient: {
    actionPrimary: { colors: ['#4f46e5', '#7c3aed'], angle: 135 },
    actionSecondary: { colors: ['#06b6d4', '#2563eb'], angle: 135 },
  },

  // Typography — Plus Jakarta Sans, bundled via expo-font
  font: {
    family: {
      regular: 'PlusJakartaSans_400Regular',
      medium: 'PlusJakartaSans_500Medium',
      semiBold: 'PlusJakartaSans_600SemiBold',
      bold: 'PlusJakartaSans_700Bold',
      extraBold: 'PlusJakartaSans_800ExtraBold',
    },
    role: {
      displayLg: { size: 32, lineHeight: 38, weight: '800', letterSpacing: -0.64 },
      heading1: { size: 24, lineHeight: 30, weight: '700', letterSpacing: -0.24 },
      heading2: { size: 20, lineHeight: 28, weight: '600', letterSpacing: 0 },
      bodyLg: { size: 18, lineHeight: 28, weight: '500', letterSpacing: 0 },
      bodyMd: { size: 16, lineHeight: 24, weight: '400', letterSpacing: 0 },
      bodySm: { size: 14, lineHeight: 20, weight: '500', letterSpacing: 0 },
      caption: { size: 12, lineHeight: 16, weight: '400', letterSpacing: 0.12 },
      badge: { size: 10, lineHeight: 12, weight: '800', letterSpacing: 0.5 },
    },
  },

  // Shapes & radii
  radius: {
    none: 0,
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // Spacing — strict 8-point grid (4px for micro-adjustments only)
  space: {
    s1: 4,
    s2: 8,
    s3: 12,
    s4: 16,
    s6: 24,
    s8: 32,
    s12: 48,
    safeBottom: 34,
  },

  // Ergonomics
  touchTargetMin: 48,

  // Elevation & depth (React Native shadow recipes)
  elevation: {
    level0: null,
    level1: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    level2: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    level3: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 15,
      elevation: 4,
    },
    level4: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 25,
      elevation: 8,
    },
    fab: {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
  },

  // Motion profiles (Reanimated spring/timing configs)
  motion: {
    springStiff: { stiffness: 320, damping: 24 },
    springFluid: { stiffness: 180, damping: 22 },
    glideOutMs: 240,
    reducedMotionMs: 120,
  },
} as const;

export type Tokens = typeof tokens;
