import { AppText, tokens } from '@choirhub/ui';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNotificationPrefs } from '@/data/notifications';
import { useSession } from '@/features/onboarding/api';

import { NavRow } from './components/NavRow';
import { SettingsGroup } from './components/SettingsGroup';
import { ToggleRow } from './components/ToggleRow';
import { LANGUAGE_LABELS } from './format';

/**
 * Settings hub (§ settings). Data Saver and language live here; notifications and
 * storage push to their own screens. Everything renders from the local prefs cache,
 * so the screen works fully offline (rule #3).
 */
export function SettingsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { prefs, update } = useNotificationPrefs(session?.user.id);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsGroup title="Notifications & data">
          <NavRow
            title="Notifications"
            subtitle="Choose what pushes, quiet hours, and your digest time"
            onPress={() => router.push('/settings/notifications')}
          />
          <ToggleRow
            label="Data Saver"
            subtitle="Download audio only on Wi-Fi"
            value={prefs.dataSaver}
            onValueChange={(dataSaver) => void update({ dataSaver })}
          />
          <NavRow
            title="Storage"
            subtitle="See cache size and clear downloads"
            onPress={() => router.push('/settings/storage')}
          />
        </SettingsGroup>

        <SettingsGroup title="Language">
          <View style={styles.languageRow}>
            <AppText variant="bodyMd">{LANGUAGE_LABELS[prefs.language] ?? 'English'}</AppText>
            <AppText variant="bodySm" color={tokens.color.inkSecondary}>
              Français and Yorùbá are coming soon.
            </AppText>
          </View>
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
  languageRow: {
    minHeight: tokens.size.touchTarget,
    justifyContent: 'center',
    gap: tokens.spacing.s1,
    paddingVertical: tokens.spacing.s2,
  },
});
