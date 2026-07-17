import { AppText, tokens } from '@choirhub/ui';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNotificationPrefs, DEFAULT_DIGEST_HOUR } from '@/data/notifications';
import { useSession } from '@/features/onboarding/api';

import { SettingsGroup } from './components/SettingsGroup';
import { StepperRow } from './components/StepperRow';
import { ToggleRow } from './components/ToggleRow';
import { CATEGORY_LABELS, MUTABLE_CATEGORIES, formatHour, stepHour } from './format';

const DEFAULT_QUIET_START = 22;
const DEFAULT_QUIET_END = 7;

/**
 * Notification preferences (§6.3): per-category push toggles, a quiet-hours window,
 * and the daily-digest hour. Critical announcements always break through, so they
 * are never offered as mutable. Writes go through the prefs store to the server so
 * the digest/escalation crons honour them.
 */
export function NotificationSettingsScreen() {
  const { session } = useSession();
  const { prefs, update } = useNotificationPrefs(session?.user.id);

  const quietOn = prefs.quietHoursStart != null && prefs.quietHoursEnd != null;
  const quietStart = prefs.quietHoursStart ?? DEFAULT_QUIET_START;
  const quietEnd = prefs.quietHoursEnd ?? DEFAULT_QUIET_END;

  function toggleCategory(category: (typeof MUTABLE_CATEGORIES)[number], enabled: boolean) {
    const muted = new Set(prefs.mutedCategories);
    if (enabled) muted.delete(category);
    else muted.add(category);
    void update({ mutedCategories: [...muted] });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsGroup title="Push for these">
          {MUTABLE_CATEGORIES.map((category) => (
            <ToggleRow
              key={category}
              label={CATEGORY_LABELS[category]}
              value={!prefs.mutedCategories.includes(category)}
              onValueChange={(enabled) => toggleCategory(category, enabled)}
            />
          ))}
        </SettingsGroup>
        <AppText variant="bodySm" color={tokens.color.inkSecondary} style={styles.note}>
          Critical alerts always come through, even when a category is off.
        </AppText>

        <SettingsGroup title="Quiet hours">
          <ToggleRow
            label="Quiet hours"
            subtitle="Hold non-critical pushes overnight"
            value={quietOn}
            onValueChange={(on) =>
              void update({
                quietHoursStart: on ? DEFAULT_QUIET_START : null,
                quietHoursEnd: on ? DEFAULT_QUIET_END : null,
              })
            }
          />
          {quietOn ? (
            <StepperRow
              label="From"
              value={formatHour(quietStart)}
              decrementLabel="Earlier start"
              incrementLabel="Later start"
              onDecrement={() => void update({ quietHoursStart: stepHour(quietStart, -1) })}
              onIncrement={() => void update({ quietHoursStart: stepHour(quietStart, 1) })}
            />
          ) : null}
          {quietOn ? (
            <StepperRow
              label="Until"
              value={formatHour(quietEnd)}
              decrementLabel="Earlier end"
              incrementLabel="Later end"
              onDecrement={() => void update({ quietHoursEnd: stepHour(quietEnd, -1) })}
              onIncrement={() => void update({ quietHoursEnd: stepHour(quietEnd, 1) })}
            />
          ) : null}
        </SettingsGroup>

        <SettingsGroup title="Daily digest">
          <StepperRow
            label="Digest time"
            value={formatHour(prefs.digestHour ?? DEFAULT_DIGEST_HOUR)}
            decrementLabel="Earlier digest"
            incrementLabel="Later digest"
            onDecrement={() => void update({ digestHour: stepHour(prefs.digestHour, -1) })}
            onIncrement={() => void update({ digestHour: stepHour(prefs.digestHour, 1) })}
          />
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.canvasBase,
  },
  content: {
    padding: tokens.spacing.s4,
    gap: tokens.spacing.s6,
  },
  note: {
    marginTop: -tokens.spacing.s4,
  },
});
