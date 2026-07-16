import { StyleSheet, View, type ViewProps } from 'react-native';

import { categoryColor, color, elevation, radii, size, spacing } from '../tokens';
import type { Category } from '../tokens';

export type CardProps = ViewProps & {
  /**
   * When set, paints the 4px left priority stripe in the category color
   * (design system §7.1). `critical` overrides to rose per system design §4.
   */
  category?: Category;
};

/**
 * Standard surface — white card on the slate canvas at Level 2 elevation
 * (design system `card-base`). Content is inset by space-4; when a category
 * is given, a 4px color stripe hugs the left edge.
 */
export function Card({ category, style, children, ...rest }: CardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {category ? (
        <View style={[styles.stripe, { backgroundColor: categoryColor[category] }]} />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.canvasElevated,
    borderRadius: radii.md,
    padding: spacing.s4,
    marginBottom: spacing.s3,
    ...elevation.level2,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: size.categoryStripe,
    borderTopLeftRadius: radii.md,
    borderBottomLeftRadius: radii.md,
  },
});
