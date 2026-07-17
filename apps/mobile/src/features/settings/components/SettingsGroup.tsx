import { Card, SectionLabel, tokens } from '@choirhub/ui';
import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export interface SettingsGroupProps {
  title?: string;
  children: ReactNode;
}

/** A titled card grouping settings rows, hairline-separated. */
export function SettingsGroup({ title, children }: SettingsGroupProps) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      <Card>
        {items.map((child, index) => (
          // Index key is stable here — rows are a fixed, ordered list per screen.
          <View key={index} style={index > 0 ? styles.separated : undefined}>
            {child}
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: tokens.spacing.s2,
  },
  separated: {
    borderTopWidth: tokens.borderWidth.hairline,
    borderTopColor: tokens.color.hairline,
  },
});
