import { prefsToRow, rowToPrefs, type NotificationPrefsRow } from './prefsMapping';
import { defaultPrefs } from './types';

describe('rowToPrefs', () => {
  it('returns defaults for a member who has never saved prefs', () => {
    expect(rowToPrefs(null)).toEqual(defaultPrefs());
  });

  it('merges a server row and drops unknown categories/languages', () => {
    const row: NotificationPrefsRow = {
      muted_categories: ['payment', 'not-a-category'],
      quiet_hours_start: 22,
      quiet_hours_end: 7,
      digest_hour: 8,
      data_saver: true,
      language: 'klingon',
      timezone: 'America/New_York',
    };
    expect(rowToPrefs(row)).toEqual({
      mutedCategories: ['payment'],
      quietHoursStart: 22,
      quietHoursEnd: 7,
      digestHour: 8,
      dataSaver: true,
      language: 'en',
      timezone: 'America/New_York',
    });
  });

  it('falls back to default digest hour / timezone when the row omits them', () => {
    const row: NotificationPrefsRow = {
      muted_categories: null,
      quiet_hours_start: null,
      quiet_hours_end: null,
      digest_hour: null,
      data_saver: null,
      language: 'fr',
      timezone: '',
    };
    const prefs = rowToPrefs(row);
    expect(prefs.digestHour).toBe(defaultPrefs().digestHour);
    expect(prefs.timezone).toBe(defaultPrefs().timezone);
    expect(prefs.language).toBe('fr');
  });
});

describe('prefsToRow', () => {
  it('round-trips through the server shape', () => {
    const prefs = { ...defaultPrefs(), mutedCategories: ['uniform' as const], digestHour: 9 };
    const row = prefsToRow('p1', prefs);
    expect(row.profile_id).toBe('p1');
    expect(rowToPrefs(row)).toEqual(prefs);
  });
});
