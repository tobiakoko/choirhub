import { AppText, Card, tokens } from '@choirhub/ui';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLeaderRole } from '@/features/leader';

/**
 * The More tab — the leader hub. Compliance and member management are surfaced
 * here only for the roles that hold them (§5): a plain member sees just their
 * account section, never the leader links. The gate is presentational; the pushed
 * screens re-check authority through RLS regardless.
 */
export default function More() {
  const router = useRouter();
  const { capabilities } = useLeaderRole();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="displayLg">More</AppText>

        {capabilities.canCompose ? (
          <NavRow
            title="Compliance"
            subtitle="Track payments and mark members paid"
            onPress={() => router.push('/leader/compliance')}
          />
        ) : null}

        {capabilities.canManageMembers ? (
          <NavRow
            title="Members"
            subtitle="Approve joins and share invite codes"
            onPress={() => router.push('/leader/members')}
          />
        ) : null}

        <NavRow
          title="Settings"
          subtitle="Notifications, data saver, storage, and language"
          onPress={() => router.push('/settings')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function NavRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      <Card>
        <View style={styles.navRow}>
          <View style={styles.navText}>
            <AppText variant="heading2">{title}</AppText>
            <AppText variant="bodySm" color={tokens.color.inkSecondary}>
              {subtitle}
            </AppText>
          </View>
          <AppText variant="heading2" color={tokens.color.inkTertiary}>
            ›
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.canvasBase,
  },
  content: {
    padding: tokens.spacing.s4,
    gap: tokens.spacing.s4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s3,
  },
  navText: {
    flex: 1,
    gap: tokens.spacing.s1,
  },
});
