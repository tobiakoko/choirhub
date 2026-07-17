// Verifies the sheet "opens with spring, respects reduced motion" contract the
// lyrics/solfa sheet relies on. `Sheet` maps this descriptor onto gorhom's spring
// vs timing config hook; here we assert the pure decision.

import { sheetAnimationConfigs } from '@choirhub/ui';

describe('sheetAnimationConfigs', () => {
  it('uses spring-fluid physics when reduced motion is off', () => {
    expect(sheetAnimationConfigs(false)).toEqual({ type: 'spring', stiffness: 180, damping: 22 });
  });

  it('degrades to a short timing curve under OS Reduce Motion', () => {
    expect(sheetAnimationConfigs(true)).toEqual({ type: 'timing', duration: 120 });
  });
});
