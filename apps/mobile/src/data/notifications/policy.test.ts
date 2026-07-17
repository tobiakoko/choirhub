import {
  androidChannelForPriority,
  decideDelivery,
  deliveryForPriority,
  isWithinQuietHours,
  smsProviderForPhone,
  type DeliveryContext,
} from './policy';

describe('deliveryForPriority / androidChannelForPriority', () => {
  it('maps each priority tier to its delivery + channel (§6.3)', () => {
    expect(deliveryForPriority('critical')).toBe('push_high');
    expect(deliveryForPriority('important')).toBe('push_default');
    expect(deliveryForPriority('normal')).toBe('digest_silent');

    expect(androidChannelForPriority('critical')).toBe('critical');
    expect(androidChannelForPriority('important')).toBe('default');
    expect(androidChannelForPriority('normal')).toBe('silent');
  });
});

describe('isWithinQuietHours', () => {
  it('is never quiet when the window is off or zero-length', () => {
    expect(isWithinQuietHours(3, { start: null, end: null })).toBe(false);
    expect(isWithinQuietHours(3, { start: 9, end: null })).toBe(false);
    expect(isWithinQuietHours(9, { start: 9, end: 9 })).toBe(false);
  });

  it('handles a same-day window [start, end)', () => {
    expect(isWithinQuietHours(9, { start: 9, end: 17 })).toBe(true);
    expect(isWithinQuietHours(16, { start: 9, end: 17 })).toBe(true);
    expect(isWithinQuietHours(17, { start: 9, end: 17 })).toBe(false);
    expect(isWithinQuietHours(8, { start: 9, end: 17 })).toBe(false);
  });

  it('handles a window that wraps midnight', () => {
    const quiet = { start: 22, end: 7 };
    expect(isWithinQuietHours(23, quiet)).toBe(true);
    expect(isWithinQuietHours(0, quiet)).toBe(true);
    expect(isWithinQuietHours(6, quiet)).toBe(true);
    expect(isWithinQuietHours(7, quiet)).toBe(false);
    expect(isWithinQuietHours(12, quiet)).toBe(false);
  });
});

describe('decideDelivery', () => {
  const base: DeliveryContext = {
    priority: 'important',
    category: 'rehearsal',
    mutedCategories: [],
    localHour: 12,
    quietHours: { start: null, end: null },
  };

  it('pushes an Important announcement on the default channel', () => {
    expect(decideDelivery(base)).toEqual({ deliver: true, channel: 'default' });
  });

  it('never pushes Normal — it is folded into the digest', () => {
    expect(decideDelivery({ ...base, priority: 'normal' })).toEqual({
      deliver: false,
      reason: 'digest',
    });
  });

  it('suppresses a muted category for non-critical tiers', () => {
    expect(decideDelivery({ ...base, mutedCategories: ['rehearsal'] })).toEqual({
      deliver: false,
      reason: 'muted',
    });
  });

  it('defers Important during quiet hours', () => {
    expect(
      decideDelivery({ ...base, localHour: 23, quietHours: { start: 22, end: 7 } })
    ).toEqual({ deliver: false, reason: 'quiet-hours' });
  });

  it('Critical breaks through mutes and quiet hours on the critical channel', () => {
    expect(
      decideDelivery({
        ...base,
        priority: 'critical',
        mutedCategories: ['rehearsal'],
        localHour: 3,
        quietHours: { start: 22, end: 7 },
      })
    ).toEqual({ deliver: true, channel: 'critical' });
  });
});

describe('smsProviderForPhone', () => {
  it('routes the +234 corridor through Termii, everything else through Twilio', () => {
    expect(smsProviderForPhone('+2348012345678')).toBe('termii');
    expect(smsProviderForPhone('+234 801 234 5678')).toBe('termii');
    expect(smsProviderForPhone('+12025550123')).toBe('twilio');
    expect(smsProviderForPhone('+447700900123')).toBe('twilio');
  });
});
