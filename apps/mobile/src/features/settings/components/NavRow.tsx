import { AppText, tokens } from '@choirhub/ui';
import { Pressable, StyleSheet, View } from 'react-native';

export interface NavRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
}

/** A tappable settings row that pushes a sub-screen. 48px min height; announces
 *  as a button with its title. */
export function NavRow({ title, subtitle, value, onPress }: NavRowProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.text}>
          <AppText variant="bodyMd">{title}</AppText>
          {subtitle ? (
            <AppText variant="bodySm" color={tokens.color.inkSecondary}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {value ? (
          <AppText variant="bodySm" color={tokens.color.inkSecondary}>
            {value}
          </AppText>
        ) : null}
        <AppText variant="heading2" color={tokens.color.inkTertiary}>
          ›
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: tokens.size.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s3,
    paddingVertical: tokens.spacing.s2,
  },
  text: {
    flex: 1,
    gap: tokens.spacing.s1,
  },
});
