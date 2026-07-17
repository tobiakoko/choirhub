import { AppText, SelectableOption, tokens } from '@choirhub/ui';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { type ComposeState } from '../composeModel';
import { type PostableScope, reachBounds, scopeKey } from '../postableScopes';

export type AudienceStepProps = {
  state: ComposeState;
  scopes: PostableScope[];
  loading: boolean;
  onToggle: (scope: PostableScope) => void;
};

/**
 * Step 2 — Audience: the targetable scopes come from the server (postable_scopes),
 * so the list can only ever offer what RLS permits (§5). Each row shows its live
 * approved-member count; the footer shows the reach of the current selection. If
 * the server offers nothing, the leader has no audience to post to.
 */
export function AudienceStep({ state, scopes, loading, onToggle }: AudienceStepProps) {
  const selectedKeys = new Set(state.selectedScopeKeys);
  const selected = scopes.filter((s) => selectedKeys.has(scopeKey(s)));
  const { atLeast } = reachBounds(selected);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.color.interactiveBase} />
      </View>
    );
  }

  if (scopes.length === 0) {
    return (
      <View style={styles.centered}>
        <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
          You have no audiences to post to.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppText variant="bodySm" color={tokens.color.inkSecondary}>
        Who should see this?
      </AppText>
      {scopes.map((scope) => {
        const count = scope.memberCount === 1 ? '1 member' : `${scope.memberCount} members`;
        return (
          <SelectableOption
            key={scopeKey(scope)}
            label={scope.label}
            description={count}
            selected={selectedKeys.has(scopeKey(scope))}
            onPress={() => onToggle(scope)}
          />
        );
      })}
      {selected.length > 0 ? (
        <AppText variant="caption" color={tokens.color.inkTertiary}>
          Reaches at least {atLeast} {atLeast === 1 ? 'member' : 'members'}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s3,
  },
  centered: {
    paddingVertical: tokens.spacing.s8,
    alignItems: 'center',
  },
});
