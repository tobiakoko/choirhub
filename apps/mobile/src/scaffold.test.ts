import { tokens } from '@choirhub/ui';

describe('monorepo scaffold', () => {
  it('resolves design tokens from @choirhub/ui', () => {
    expect(tokens.color.canvasBase).toMatch(/^#[0-9a-f]{6}$/);
    expect(tokens.space.s12).toBe(tokens.touchTargetMin);
    expect(tokens.radius.md).toBeGreaterThan(0);
  });
});
