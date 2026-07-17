import type { PostableScope } from './postableScopes';
import {
  canAdvance,
  canPublish,
  COMPOSE_STEPS,
  type ComposeState,
  initialComposeState,
  isLastStep,
  nextStep,
  prevStep,
  selectedScopes,
  stepIndex,
  toggleScope,
  toPublishInput,
} from './composeModel';

const DC: PostableScope = { targetType: 'location', targetId: 'dc', label: 'DC', memberCount: 20 };
const SOPRANOS: PostableScope = {
  targetType: 'voice_part',
  targetId: 'sop',
  label: 'DC Sopranos',
  memberCount: 6,
};

function draft(over: Partial<ComposeState> = {}): ComposeState {
  return { ...initialComposeState(), title: 'Uniform', body: 'White agbada', ...over };
}

describe('step navigation', () => {
  it('advances and retreats within bounds', () => {
    expect(nextStep('write')).toBe('audience');
    expect(nextStep('audience')).toBe('delivery');
    expect(nextStep('delivery')).toBe('preview');
    expect(nextStep('preview')).toBe('preview'); // clamps at the end
    expect(prevStep('write')).toBe('write'); // clamps at the start
    expect(prevStep('delivery')).toBe('audience');
  });

  it('reports indices and the last step', () => {
    expect(COMPOSE_STEPS).toEqual(['write', 'audience', 'delivery', 'preview']);
    expect(stepIndex('delivery')).toBe(2);
    expect(isLastStep('preview')).toBe(true);
    expect(isLastStep('write')).toBe(false);
  });
});

describe('canAdvance', () => {
  it('requires a non-blank title and body to leave Write', () => {
    expect(canAdvance('write', draft({ title: '', body: 'x' }))).toBe(false);
    expect(canAdvance('write', draft({ title: '  ', body: '  ' }))).toBe(false);
    expect(canAdvance('write', draft())).toBe(true);
  });

  it('requires at least one audience to leave Audience', () => {
    expect(canAdvance('audience', draft())).toBe(false);
    expect(canAdvance('audience', draft({ selectedScopeKeys: ['location:dc'] }))).toBe(true);
  });

  it('always allows advancing from Delivery and Preview', () => {
    expect(canAdvance('delivery', draft())).toBe(true);
    expect(canAdvance('preview', draft())).toBe(true);
  });
});

describe('toggleScope', () => {
  it('adds then removes a scope idempotently', () => {
    let state = draft();
    state = toggleScope(state, DC);
    expect(state.selectedScopeKeys).toEqual(['location:dc']);
    state = toggleScope(state, SOPRANOS);
    expect(state.selectedScopeKeys).toEqual(['location:dc', 'voice_part:sop']);
    state = toggleScope(state, DC);
    expect(state.selectedScopeKeys).toEqual(['voice_part:sop']);
  });

  it('resolves selected keys back to the offered scopes', () => {
    const state = toggleScope(draft(), SOPRANOS);
    expect(selectedScopes(state, [DC, SOPRANOS])).toEqual([SOPRANOS]);
  });
});

describe('canPublish', () => {
  it('is false without title/body or audience', () => {
    expect(canPublish(draft({ title: '' }))).toBe(false);
    expect(canPublish(draft())).toBe(false); // no audience
  });
  it('is true once Write and Audience are satisfied', () => {
    expect(canPublish(draft({ selectedScopeKeys: ['location:dc'] }))).toBe(true);
  });
});

describe('toPublishInput', () => {
  const now = new Date('2026-07-17T12:00:00.000Z');

  it('throws on an incomplete draft', () => {
    expect(() => toPublishInput(draft(), [DC], now)).toThrow(/incomplete/);
  });

  it('maps the delivery tier to server priority and emits one audience per scope', () => {
    const state = draft({
      category: 'uniform',
      tier: 'critical',
      pin: true,
      requireAck: true,
      selectedScopeKeys: ['location:dc', 'voice_part:sop'],
    });
    const input = toPublishInput(state, [DC, SOPRANOS], now);
    expect(input.announcement).toEqual({
      category: 'uniform',
      priority: 'critical',
      pinned: true,
      requires_ack: true,
      title: 'Uniform',
      body: 'White agbada',
      publish_at: '2026-07-17T12:00:00.000Z',
    });
    expect(input.audiences).toEqual([
      { target_type: 'location', target_id: 'dc' },
      { target_type: 'voice_part', target_id: 'sop' },
    ]);
  });

  it('maps important tier and honours a schedule', () => {
    const state = draft({
      tier: 'important',
      scheduleAt: '2026-07-20T09:00:00.000Z',
      selectedScopeKeys: ['location:dc'],
    });
    const input = toPublishInput(state, [DC], now);
    expect(input.announcement.priority).toBe('important');
    expect(input.announcement.publish_at).toBe('2026-07-20T09:00:00.000Z');
  });

  it('trims title and body', () => {
    const state = draft({ title: '  Levy  ', body: '  Pay now  ', selectedScopeKeys: ['location:dc'] });
    const input = toPublishInput(state, [DC], now);
    expect(input.announcement.title).toBe('Levy');
    expect(input.announcement.body).toBe('Pay now');
  });
});
