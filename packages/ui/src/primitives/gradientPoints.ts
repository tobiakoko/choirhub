/**
 * Converts a CSS-style gradient angle (deg, clockwise from vertical) into the
 * start/end unit points expo-linear-gradient expects. The design system uses
 * 135° for both action gradients (top-left → bottom-right).
 */
export function gradientPoints(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  return {
    start: { x: (1 - x) / 2, y: (1 - y) / 2 },
    end: { x: (1 + x) / 2, y: (1 + y) / 2 },
  };
}
