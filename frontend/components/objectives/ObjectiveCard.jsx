import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

export default function ObjectiveCard({ objective, log, onLog, readOnly = false }) {
  const [isLogging, setIsLogging] = useState(false);

  const status = log?.status ?? null;
  const isDone = status === 'done';
  const isFailed = status === 'failed';

  const handleDone = async () => {
    if (isLogging || readOnly) return;
    setIsLogging(true);
    try {
      await onLog(objective.id, isDone ? null : 'done');
    } finally {
      setIsLogging(false);
    }
  };

  const handleFailed = async () => {
    if (isLogging || readOnly) return;
    setIsLogging(true);
    try {
      await onLog(objective.id, isFailed ? null : 'failed');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View style={[styles.card, isDone && styles.cardDone, isFailed && styles.cardFailed]}>
      {/* Left: icon + info */}
      <View style={styles.left}>
        <View style={[styles.iconBadge, { backgroundColor: objective.color + '20' }]}>
          <Text style={styles.icon}>{objective.icon}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{objective.title}</Text>

          {/* Streak */}
          {objective.streak?.current_streak > 0 && (
            <View style={styles.streakRow}>
              <Text style={styles.streakText}>
                🔥 {objective.streak.current_streak} jour{objective.streak.current_streak > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Right: actions */}
      <View style={styles.actions}>
        {/* Bouton ✗ (failed) */}
        <TouchableOpacity
          style={[styles.actionBtn, isFailed && styles.actionBtnFailed]}
          onPress={handleFailed}
          disabled={isLogging}
        >
          <Text style={[styles.actionIcon, isFailed && styles.actionIconFailed]}>✗</Text>
        </TouchableOpacity>

        {/* Bouton ✓ (done) */}
        <TouchableOpacity
          style={[styles.actionBtn, isDone && styles.actionBtnDone]}
          onPress={handleDone}
          disabled={isLogging}
        >
          <Text style={[styles.actionIcon, isDone && styles.actionIconDone]}>✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardDone: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  cardFailed: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  actionBtnDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  actionBtnFailed: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  actionIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.muted,
  },
  actionIconDone: {
    color: '#fff',
  },
  actionIconFailed: {
    color: '#fff',
  },
});
