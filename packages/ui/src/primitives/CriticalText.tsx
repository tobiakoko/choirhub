import { AppText, type AppTextProps } from './AppText';

/**
 * Critical strings — service times, dates, uniform directives — that must
 * never be ellipsized (design system §2.3, CLAUDE.md accessibility floor).
 *
 * The type intentionally forbids `numberOfLines` and `ellipsizeMode`, so a
 * caller physically cannot truncate this text; it always wraps to full length.
 */
export type CriticalTextProps = Omit<AppTextProps, 'numberOfLines' | 'ellipsizeMode'>;

export function CriticalText(props: CriticalTextProps) {
  // numberOfLines is never forwarded — full text always renders.
  return <AppText {...props} />;
}
