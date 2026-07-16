/**
 * ChoirHub Design System v1.0.0 — "Trustworthy Yet Vibrant"
 *
 * Single source of truth for every visual value in the app, mapping 1:1 to
 * docs/design-system-v1.md (plus the category→color map from
 * docs/choirhub-system-design-v2.md §4). No component may use a raw hex/px
 * value — enforced by the `no-magic-tokens` lint rule; this file is the one
 * exempt location. Add the token here first, then consume it.
 */

// ---------------------------------------------------------------------------
// 1. Colors
// ---------------------------------------------------------------------------

export const color = {
  // 1.1 Base & canvas
  canvasBase: '#f8fafc',
  canvasElevated: '#ffffff',
  canvasInset: '#f1f5f9',
  // 1.2 Structural text & ink
  inkPrimary: '#0f172a',
  inkSecondary: '#475569',
  inkTertiary: '#94a3b8',
  onColor: '#ffffff',
  // 1.4 Solid interactive
  interactiveBase: '#4f46e5',
  interactiveHover: '#4338ca',
  interactiveGhost: 'rgba(79, 70, 229, 0.08)',
  // 1.5 Semantic & status
  statusSuccess: '#10b981',
  statusCritical: '#e11d48',
  statusWarning: '#f59e0b',
  statusInfo: '#0ea5e9',
  // 1.6 Borders & dividers
  hairline: '#e2e8f0',
  hairlineStrong: '#cbd5e1',
  // 1.7 Specialized shadows
  shadowTintPrimary: 'rgba(79, 70, 229, 0.25)',
  shadowTintNeutral: 'rgba(15, 23, 42, 0.08)',
  // Bottom-sheet backdrop (§7.4)
  backdrop: 'rgba(15, 23, 42, 0.4)',
} as const;

// 1.3 Brand & interaction gradients — render with expo-linear-gradient at 135°
export const gradient = {
  actionPrimary: { colors: ['#4f46e5', '#7c3aed'], angle: 135 },
  actionSecondary: { colors: ['#06b6d4', '#2563eb'], angle: 135 },
} as const;

/**
 * Category → color mapping (system design §4, v1.0.0 semantic palette).
 * Drives the 4px priority stripe on feed cards; `critical` overrides any
 * category stripe.
 */
export const categoryColor = {
  rehearsal: '#7c3aed',
  payment: '#10b981',
  uniform: '#06b6d4',
  forms: '#0ea5e9',
  logistics: '#f59e0b',
  devotional: '#4f46e5',
  critical: '#e11d48',
} as const;

export type Category = keyof typeof categoryColor;

// ---------------------------------------------------------------------------
// 2. Typography — Plus Jakarta Sans, bundled via expo-font (never fetched)
// ---------------------------------------------------------------------------

const family = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  family,
  // 2.1 Type scale — letterSpacing is the em value from the spec × font size
  role: {
    displayLg: { fontFamily: family.extraBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
    heading1: { fontFamily: family.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.24 },
    heading2: { fontFamily: family.semiBold, fontSize: 20, lineHeight: 28, letterSpacing: 0 },
    bodyLg: { fontFamily: family.medium, fontSize: 18, lineHeight: 28, letterSpacing: 0 },
    bodyMd: { fontFamily: family.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
    bodySm: { fontFamily: family.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
    caption: { fontFamily: family.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0.12 },
    badge: {
      fontFamily: family.extraBold,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
  },
} as const;

export type TypographyVariant = keyof typeof typography.role;

// ---------------------------------------------------------------------------
// 3. Shapes & radii
// ---------------------------------------------------------------------------

export const radii = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// 4. Spacing — strict 8-point grid (4px for internal micro-adjustments only)
// ---------------------------------------------------------------------------

export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s6: 24,
  s8: 32,
  s12: 48,
  safeBottom: 34,
} as const;

// Fixed element sizes (§4.1 ergonomics, §7.3 FAB)
export const size = {
  touchTarget: 48,
  fab: 64,
  avatarSm: 32,
  avatarMd: 48,
  avatarLg: 64,
  categoryStripe: 4,
  sheetHandleWidth: 32,
  sheetHandleHeight: 4,
} as const;

export const borderWidth = {
  hairline: 1,
} as const;

export const opacity = {
  disabled: 0.5,
  backdrop: 0.4,
} as const;

// ---------------------------------------------------------------------------
// 5. Elevation & depth — React Native shadow recipes
// ---------------------------------------------------------------------------

export const elevation = {
  level0: {},
  level1: {
    shadowColor: color.inkPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  level2: {
    shadowColor: color.inkPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  level3: {
    shadowColor: color.inkPrimary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
  // Modal bottom sheets — Y-offset reversed to cast the shadow upward
  level4: {
    shadowColor: color.inkPrimary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 8,
  },
  // FAB — luminous indigo glow (tinted, never black on a gradient)
  fab: {
    shadowColor: color.interactiveBase,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// ---------------------------------------------------------------------------
// Motion profiles (design system §"Motion over Mutability", system design §3.4)
// ---------------------------------------------------------------------------

export const motion = {
  springStiff: { stiffness: 320, damping: 24 },
  springFluid: { stiffness: 180, damping: 22 },
  glideOutMs: 240,
  reducedMotionMs: 120,
} as const;

// ---------------------------------------------------------------------------
// Aggregate export
// ---------------------------------------------------------------------------

export const tokens = {
  color,
  gradient,
  categoryColor,
  typography,
  radii,
  spacing,
  size,
  borderWidth,
  opacity,
  elevation,
  motion,
} as const;

export type Tokens = typeof tokens;
