import { tokens } from '@choirhub/ui';

describe('monorepo scaffold', () => {
  it('resolves design tokens from @choirhub/ui', () => {
    expect(tokens.color.canvasBase).toMatch(/^#[0-9a-f]{6}$/);
    expect(tokens.spacing.s12).toBe(tokens.size.touchTarget);
    expect(tokens.radii.md).toBeGreaterThan(0);
  });
});
