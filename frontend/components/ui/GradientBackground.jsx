import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/theme';

const VARIANTS = {
  default: [
    { top: -50, left: -100, size: 300, color: colors.primary },
    { bottom: -50, right: -50, size: 250, color: colors.secondary },
  ],
  topRight: [
    { top: -50, right: -80, size: 300, color: colors.primary },
    { bottom: -50, left: -50, size: 250, color: colors.secondary },
  ],
  center: [
    { top: '30%', left: -80, size: 280, color: colors.primary },
    { top: -30, right: -60, size: 220, color: colors.secondary },
  ],
  subtle: [
    { top: -30, left: -60, size: 200, color: colors.primary },
    { bottom: -30, right: -30, size: 180, color: colors.secondary },
  ],
};

export default function GradientBackground({ children, variant = 'default', style }) {
  const circles = VARIANTS[variant] || VARIANTS.default;

  return (
    <LinearGradient
      colors={[colors.gradient.start, colors.gradient.middle, colors.gradient.end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {circles.map((c, i) => (
        <View
          key={i}
          style={[
            styles.circle,
            {
              width: c.size,
              height: c.size,
              borderRadius: c.size / 2,
              backgroundColor: c.color,
              top: c.top,
              bottom: c.bottom,
              left: c.left,
              right: c.right,
            },
          ]}
        />
      ))}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  circle: {
    position: 'absolute',
    opacity: 0.15,
  },
});
