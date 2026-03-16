import { View, StyleSheet, Platform } from 'react-native';
import { colors, radius, spacing, shadows } from '../../constants/theme';

export default function GlassCard({ children, style, noPadding = false }) {
  return (
    <View style={[styles.card, !noPadding && styles.padding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 25, 50, 0.95)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    ...shadows.sm,
  },
  padding: {
    padding: spacing.lg,
  },
});
