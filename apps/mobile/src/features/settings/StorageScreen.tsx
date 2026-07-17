import { AppText, GhostButton, tokens } from '@choirhub/ui';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MEDIA_CACHE_BUDGET_BYTES,
  clearMediaCache,
  formatBytes,
  mediaCacheSize,
} from '@/data/media';

import { SettingsGroup } from './components/SettingsGroup';

/**
 * Storage manager (§ settings): how much audio is cached on disk, against the
 * ~200MB budget, with a one-tap clear. Only the media cache is wiped — lyrics/solfa
 * text stays in WatermelonDB so the library still reads offline.
 */
export function StorageScreen() {
  const [bytes, setBytes] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  const refresh = useCallback(async () => {
    setBytes(await mediaCacheSize());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onClear = useCallback(() => {
    Alert.alert('Clear downloads?', 'Cached audio will be removed. Lyrics and solfa stay offline.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          setClearing(true);
          try {
            await clearMediaCache();
            await refresh();
          } finally {
            setClearing(false);
          }
        },
      },
    ]);
  }, [refresh]);

  const empty = bytes === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsGroup title="Downloads">
          <View style={styles.sizeRow}>
            <AppText variant="bodyMd">Cached audio</AppText>
            <AppText variant="bodyLg" accessibilityLabel={`Cached audio: ${formatBytes(bytes ?? 0)}`}>
              {bytes == null ? '…' : formatBytes(bytes)}
            </AppText>
          </View>
          <AppText variant="bodySm" color={tokens.color.inkSecondary}>
            Up to {formatBytes(MEDIA_CACHE_BUDGET_BYTES)} is kept; the oldest is removed first.
          </AppText>
        </SettingsGroup>

        <GhostButton
          label={clearing ? 'Clearing…' : 'Clear downloads'}
          onPress={onClear}
          disabled={clearing || empty || bytes == null}
        />
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
  sizeRow: {
    minHeight: tokens.size.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.s2,
  },
});
