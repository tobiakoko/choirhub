import {
  parseNotificationTarget,
  routeForNotification,
  routeForTarget,
} from './deepLink';

describe('parseNotificationTarget', () => {
  it('parses each known target', () => {
    expect(parseNotificationTarget({ type: 'announcement', id: 'a1' })).toEqual({
      type: 'announcement',
      id: 'a1',
    });
    expect(parseNotificationTarget({ type: 'event', id: 'e1' })).toEqual({
      type: 'event',
      id: 'e1',
    });
    expect(parseNotificationTarget({ type: 'campaign', id: 'c1' })).toEqual({
      type: 'campaign',
      id: 'c1',
    });
    expect(parseNotificationTarget({ type: 'digest' })).toEqual({ type: 'digest' });
  });

  it('rejects malformed / missing payloads', () => {
    expect(parseNotificationTarget(null)).toBeNull();
    expect(parseNotificationTarget('nope')).toBeNull();
    expect(parseNotificationTarget({ type: 'announcement' })).toBeNull(); // no id
    expect(parseNotificationTarget({ type: 'mystery', id: 'x' })).toBeNull();
    expect(parseNotificationTarget({ id: 'x' })).toBeNull();
  });
});

describe('routeForTarget / routeForNotification', () => {
  it('deep-links announcements and events to their detail screen', () => {
    expect(routeForTarget({ type: 'announcement', id: 'a1' })).toBe('/announcement/a1');
    expect(routeForTarget({ type: 'event', id: 'e1' })).toBe('/event/e1');
  });

  it('routes a campaign reminder to compliance and a digest to the feed', () => {
    expect(routeForTarget({ type: 'campaign', id: 'c1' })).toBe('/leader/compliance');
    expect(routeForTarget({ type: 'digest' })).toBe('/');
  });

  it('returns null route for an unparseable payload', () => {
    expect(routeForNotification({ foo: 'bar' })).toBeNull();
    expect(routeForNotification({ type: 'announcement', id: 'a9' })).toBe('/announcement/a9');
  });
});
