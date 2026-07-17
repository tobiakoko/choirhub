import {
  AppText,
  Card,
  CriticalText,
  GhostButton,
  VocalPartBadge,
  color,
  radii,
  spacing,
} from '@choirhub/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AudioPlayer } from './AudioPlayer';
import { LyricsSheet, type LyricsMode } from './LyricsSheet';
import type { RepertoireSong } from '../songsModel';

export type RepertoireCardProps = {
  song: RepertoireSong;
};

/**
 * Repertoire / song card (design system §7.2). The member's own voice part is
 * promoted — badged top-right and pre-selected in the integrated player — and
 * lyrics/solfa open in the Sheet, never a screen push. Metadata (key, tempo) uses
 * CriticalText so it never truncates for a senior on a large font size.
 */
export function RepertoireCard({ song }: RepertoireCardProps) {
  const [selectedPartId, setSelectedPartId] = useState(song.primaryPart?.assetId ?? null);
  const [sheet, setSheet] = useState<LyricsMode | null>(null);

  const selectedPart =
    song.audioParts.find((p) => p.assetId === selectedPartId) ?? song.primaryPart ?? null;

  const meta = [song.songKey, song.tempo ? `${song.tempo} bpm` : null, song.composer]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading2" style={styles.title}>
          {song.title}
        </AppText>
        {song.userPart ? <VocalPartBadge part={song.userPart} /> : null}
      </View>

      {meta ? (
        <CriticalText variant="caption" color={color.inkSecondary}>
          {meta}
        </CriticalText>
      ) : null}

      {song.audioParts.length > 1 ? (
        <View style={styles.parts}>
          {song.audioParts.map((part) => {
            const active = part.assetId === selectedPart?.assetId;
            const label = (part.voicePart ?? 'part').toString();
            return (
              <Pressable
                key={part.assetId}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Play ${label}${part.isUserPart ? ', your part' : ''}`}
                onPress={() => setSelectedPartId(part.assetId)}
                style={[styles.partChip, active && styles.partChipActive]}
              >
                <AppText variant="badge" color={active ? color.onColor : color.interactiveBase}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {selectedPart ? (
        <View style={styles.player}>
          <AudioPlayer
            part={selectedPart}
            partLabel={(selectedPart.voicePart ?? 'part').toString()}
          />
        </View>
      ) : null}

      {song.lyrics || song.solfa ? (
        <View style={styles.actions}>
          {song.lyrics ? <GhostButton label="Lyrics" onPress={() => setSheet('lyrics')} /> : null}
          {song.solfa ? <GhostButton label="Solfa" onPress={() => setSheet('solfa')} /> : null}
        </View>
      ) : null}

      <LyricsSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        title={song.title}
        lyrics={song.lyrics}
        solfa={song.solfa}
        initialMode={sheet ?? undefined}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.s3,
  },
  title: {
    flex: 1,
  },
  parts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
    marginTop: spacing.s3,
  },
  partChip: {
    paddingVertical: spacing.s1,
    paddingHorizontal: spacing.s3,
    borderRadius: radii.full,
    backgroundColor: color.interactiveGhost,
  },
  partChipActive: {
    backgroundColor: color.interactiveBase,
  },
  player: {
    marginTop: spacing.s4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.s2,
    marginTop: spacing.s3,
  },
});
