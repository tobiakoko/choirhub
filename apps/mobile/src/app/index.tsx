import { AppText, GhostButton, tokens } from '@choirhub/ui';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <AppText variant="caption" color={tokens.color.inkTertiary}>
        ChoirHub
      </AppText>
      <GhostButton label="Open design playground" onPress={() => router.push('/playground')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.s2,
    backgroundColor: tokens.color.canvasBase,
  },
});
