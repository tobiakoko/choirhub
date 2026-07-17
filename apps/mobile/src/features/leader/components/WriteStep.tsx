import { AppText, GhostButton, TextField, tokens } from '@choirhub/ui';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatBytes } from '@/data/media';

import {
  type AnnouncementCategory,
  CATEGORY_OPTIONS,
  type ComposeAttachment,
  type ComposeState,
} from '../composeModel';

export type WriteStepProps = {
  state: ComposeState;
  onChange: (patch: Partial<ComposeState>) => void;
};

/**
 * Step 1 — Write: title, body, category, and attachments. Attachments are picked
 * with the OS document picker and kept on the draft with their size shown (spec
 * Do: "every download states its size"); persisting the files themselves rides on
 * the media pipeline (§6.2), so they stay with the draft for now.
 */
export function WriteStep({ state, onChange }: WriteStepProps) {
  async function pickAttachments() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    const picked: ComposeAttachment[] = result.assets.map((a) => ({
      id: `${a.uri}:${a.name}`,
      name: a.name,
      uri: a.uri,
      sizeBytes: a.size ?? 0,
    }));
    // De-dupe by id so re-picking the same file doesn't double it.
    const existing = new Set(state.attachments.map((a) => a.id));
    onChange({ attachments: [...state.attachments, ...picked.filter((a) => !existing.has(a.id))] });
  }

  function removeAttachment(id: string) {
    onChange({ attachments: state.attachments.filter((a) => a.id !== id) });
  }

  return (
    <View style={styles.container}>
      <TextField
        label="Title"
        placeholder="What is this about?"
        value={state.title}
        onChangeText={(title) => onChange({ title })}
        maxLength={120}
      />
      <TextField
        label="Message"
        placeholder="Write the announcement"
        value={state.body}
        onChangeText={(body) => onChange({ body })}
        multiline
        numberOfLines={5}
      />

      <View style={styles.field}>
        <AppText variant="bodySm" color={tokens.color.inkSecondary}>
          Category
        </AppText>
        <View style={styles.chips}>
          {CATEGORY_OPTIONS.map((option) => {
            const selected = state.category === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => onChange({ category: option.value as AnnouncementCategory })}
                style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
              >
                <View
                  style={[styles.dot, { backgroundColor: tokens.categoryColor[option.value] }]}
                />
                <AppText
                  variant="bodySm"
                  color={selected ? tokens.color.interactiveBase : tokens.color.inkSecondary}
                >
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <AppText variant="bodySm" color={tokens.color.inkSecondary}>
          Attachments
        </AppText>
        {state.attachments.map((attachment) => (
          <View key={attachment.id} style={styles.attachment}>
            <View style={styles.attachmentText}>
              <AppText variant="bodySm" numberOfLines={1}>
                {attachment.name}
              </AppText>
              <AppText variant="caption" color={tokens.color.inkTertiary}>
                {formatBytes(attachment.sizeBytes)}
              </AppText>
            </View>
            <GhostButton
              label="Remove"
              accessibilityLabel={`Remove ${attachment.name}`}
              onPress={() => removeAttachment(attachment.id)}
            />
          </View>
        ))}
        <GhostButton label="Add attachment" onPress={pickAttachments} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s4,
  },
  field: {
    gap: tokens.spacing.s2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.s2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s2,
    minHeight: tokens.size.touchTarget,
    paddingHorizontal: tokens.spacing.s3,
    borderRadius: tokens.radii.full,
    borderWidth: tokens.borderWidth.hairline,
  },
  chipOn: {
    backgroundColor: tokens.color.interactiveGhost,
    borderColor: tokens.color.interactiveBase,
  },
  chipOff: {
    backgroundColor: tokens.color.canvasElevated,
    borderColor: tokens.color.hairline,
  },
  dot: {
    width: tokens.spacing.s2,
    height: tokens.spacing.s2,
    borderRadius: tokens.radii.full,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s3,
  },
  attachmentText: {
    flex: 1,
    gap: tokens.spacing.s1,
  },
});
