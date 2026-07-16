import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { borderWidth, color, elevation, radii, size, spacing, typography } from '../tokens';
import { AppText } from './AppText';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** Field label rendered above the input (sentence case). */
  label: string;
  /** Recoverable error copy shown beneath the field (never truncates). */
  error?: string;
  /** Optional helper/hint beneath the field when there is no error. */
  hint?: string;
  /** Leading adornment (e.g. a country dial code) shown inside the field. */
  leading?: React.ReactNode;
};

/**
 * Labeled text input — the design system's form field. Inactive at Level 1
 * elevation with a hairline-strong border; the border lifts to Electric Indigo
 * on focus and to rose on error. 48px min height (touch floor), body-md text,
 * allowFontScaling on. All visual values are tokens (no magic values).
 */
export function TextField({
  label,
  error,
  hint,
  leading,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? color.statusCritical
    : focused
      ? color.interactiveBase
      : color.hairlineStrong;

  return (
    <View style={styles.wrap}>
      <AppText variant="bodySm" color={color.inkSecondary}>
        {label}
      </AppText>
      <View style={[styles.field, { borderColor }]}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={color.inkTertiary}
          selectionColor={color.interactiveBase}
          allowFontScaling
          accessibilityLabel={accessibilityLabel ?? label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </View>
      {error ? (
        // Critical: recoverable errors must always render in full.
        <AppText variant="caption" color={color.statusCritical}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={color.inkTertiary}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.s2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: size.touchTarget,
    backgroundColor: color.canvasElevated,
    borderRadius: radii.md,
    borderWidth: borderWidth.hairline,
    paddingHorizontal: spacing.s4,
    gap: spacing.s2,
    ...elevation.level1,
  },
  leading: {
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: spacing.s3,
    fontFamily: typography.family.regular,
    fontSize: typography.role.bodyMd.fontSize,
    lineHeight: typography.role.bodyMd.lineHeight,
    color: color.inkPrimary,
  },
});
