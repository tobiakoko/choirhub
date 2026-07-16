import { AppText, Card, OfflinePill, tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Placeholder Home. Replaced by the announcement feed in the feed feature; it
 * exists now so onboarding has a real place to route into on approval.
 */
export default function Home() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.content}>
        <AppText variant="heading1">You’re in</AppText>
        <Card>
          <View style={styles.card}>
            <AppText variant="heading2">Welcome to ChoirHub</AppText>
            <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
              Your feed, schedule, and song library will appear here.
            </AppText>
            <OfflinePill label="You're all set" />
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.canvasBase,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.spacing.s4,
    paddingTop: tokens.spacing.s4,
    gap: tokens.spacing.s6,
  },
  card: {
    gap: tokens.spacing.s3,
  },
});
