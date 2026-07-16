import { tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';

export default function Index() {
  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.canvasBase,
  },
});
