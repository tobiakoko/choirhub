import type { VocalPart } from '@choirhub/ui';

/**
 * Voice-part options for the profile step (§5). A member who does not yet know
 * their part picks "Not sure" — stored as null so a leader can place them later
 * (profiles.voice_part is nullable). Copy is sentence case per the style guide.
 */
export type VoicePartOption = {
  /** null = "Not sure" — no part assigned yet. */
  value: VocalPart | null;
  label: string;
};

export const VOICE_PART_OPTIONS: readonly VoicePartOption[] = [
  { value: 'soprano', label: 'Soprano' },
  { value: 'alto', label: 'Alto' },
  { value: 'tenor', label: 'Tenor' },
  { value: 'bass', label: 'Bass' },
  { value: null, label: 'Not sure' },
];
