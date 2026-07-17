import { canComposeAnnouncement, capabilitiesFor, type UserRoleName } from './roles';

describe('capabilitiesFor', () => {
  it('grants a plain member nothing — the FAB never renders for them', () => {
    const caps = capabilitiesFor(['member']);
    expect(caps.canCompose).toBe(false);
    expect(caps.canSetCritical).toBe(false);
    expect(caps.canManageMembers).toBe(false);
    expect(caps.isCoordinator).toBe(false);
  });

  it('grants an unresolved viewer (no roles yet) nothing', () => {
    expect(capabilitiesFor([])).toEqual({
      canCompose: false,
      canSetCritical: false,
      canManageMembers: false,
      isCoordinator: false,
    });
  });

  it('lets a committee lead compose but not raise Critical or manage members', () => {
    const caps = capabilitiesFor(['committee_lead']);
    expect(caps.canCompose).toBe(true);
    expect(caps.canSetCritical).toBe(false);
    expect(caps.canManageMembers).toBe(false);
    expect(caps.isCoordinator).toBe(false);
  });

  it('lets a location leader compose, go Critical, and manage members', () => {
    const caps = capabilitiesFor(['location_leader']);
    expect(caps.canCompose).toBe(true);
    expect(caps.canSetCritical).toBe(true);
    expect(caps.canManageMembers).toBe(true);
    expect(caps.isCoordinator).toBe(false);
  });

  it('marks a regional coordinator with the cross-location roll-up', () => {
    const caps = capabilitiesFor(['regional_coordinator']);
    expect(caps.canCompose).toBe(true);
    expect(caps.canSetCritical).toBe(true);
    expect(caps.canManageMembers).toBe(true);
    expect(caps.isCoordinator).toBe(true);
  });

  it('unions capabilities across multiple grants', () => {
    const roles: UserRoleName[] = ['member', 'committee_lead', 'regional_coordinator'];
    expect(capabilitiesFor(roles)).toEqual({
      canCompose: true,
      canSetCritical: true,
      canManageMembers: true,
      isCoordinator: true,
    });
  });
});

describe('canComposeAnnouncement (the FAB gate)', () => {
  it('is false for a member persona', () => {
    expect(canComposeAnnouncement(['member'])).toBe(false);
  });
  it('is false when the viewer has no roles', () => {
    expect(canComposeAnnouncement([])).toBe(false);
  });
  it.each<UserRoleName>(['committee_lead', 'location_leader', 'regional_coordinator'])(
    'is true for %s',
    (role) => {
      expect(canComposeAnnouncement([role])).toBe(true);
    }
  );
});
