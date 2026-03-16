import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

export default function ObjectiveCard({ objective, log, onLog, onEdit, onDelete, readOnly = false }) {
  const [isLogging, setIsLogging] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);

  const status = log?.status ?? null;
  const isDone = status === 'done';
  const isFailed = status === 'failed';
  const isQuantifiable = objective.type === 'quantifiable';
  const loggedValue = log?.value;

  // Pour un objectif quantifiable :
  // - positive_goal (ex: faire 30min de sport) → ✓ demande la valeur
  // - negative_goal (ex: ne pas boire) → ✗ demande la valeur (combien de verres)
  const quantOnSuccess = isQuantifiable && objective.positive_goal !== false;
  const quantOnFail = isQuantifiable && objective.positive_goal === false;

  const handleDone = async () => {
    if (isLogging || readOnly) return;

    if (quantOnSuccess && !isDone) {
      setShowInput('done');
      setInputValue(loggedValue != null ? String(loggedValue) : '');
      return;
    }

    setIsLogging(true);
    try {
      await onLog(objective.id, isDone ? null : 'done');
      setShowInput(false);
    } finally {
      setIsLogging(false);
    }
  };

  const handleFailed = async () => {
    if (isLogging || readOnly) return;

    if (quantOnFail && !isFailed) {
      setShowInput('failed');
      setInputValue(loggedValue != null ? String(loggedValue) : '');
      return;
    }

    setIsLogging(true);
    setShowInput(false);
    try {
      await onLog(objective.id, isFailed ? null : 'failed');
    } finally {
      setIsLogging(false);
    }
  };

  const handleSubmitValue = async () => {
    if (isLogging || readOnly) return;
    const num = parseFloat(inputValue);
    if (isNaN(num) || num < 0) return;

    const logStatus = showInput === 'failed' ? 'failed' : 'done';
    setIsLogging(true);
    try {
      await onLog(objective.id, logStatus, num);
      setShowInput(false);
    } finally {
      setIsLogging(false);
    }
  };

  const handleLongPress = () => {
    Alert.alert(objective.title, null, [
      { text: 'Modifier', onPress: () => onEdit?.(objective) },
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        Alert.alert(
          'Supprimer cet objectif ?',
          'Cette action est irréversible. Toutes les données liées seront perdues.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => onDelete?.(objective.id) },
          ]
        );
      }},
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={[styles.card, isDone && styles.cardDone, isFailed && styles.cardFailed]}
    >
      {/* Top row: icon + info + actions */}
      <View style={styles.topRow}>
        <View style={styles.left}>
          <View style={[styles.iconBadge, { backgroundColor: objective.color + '20' }]}>
            <Text style={styles.icon}>{objective.icon}</Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{objective.title}</Text>

            {/* Streak */}
            {objective.streak?.current_streak > 0 && (
              <Text style={styles.streakText}>
                🔥 {objective.streak.current_streak} jour{objective.streak.current_streak > 1 ? 's' : ''}
              </Text>
            )}

            {/* Valeur logguée pour quantifiable */}
            {isQuantifiable && loggedValue != null && (isDone || isFailed) && (
              <Text style={[styles.valueText, isFailed && { color: colors.danger }]}>
                {loggedValue} {objective.unit || ''}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, isFailed && styles.actionBtnFailed]}
            onPress={handleFailed}
            disabled={isLogging}
          >
            <Text style={[styles.actionIcon, isFailed && styles.actionIconActive]}>✗</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isDone && styles.actionBtnDone]}
            onPress={handleDone}
            disabled={isLogging}
          >
            <Text style={[styles.actionIcon, isDone && styles.actionIconActive]}>✓</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Input quantifiable */}
      {showInput && !readOnly && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.valueInput}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={`Nombre${objective.unit ? ` (${objective.unit})` : ''}`}
            placeholderTextColor={colors.text.muted}
            keyboardType="numeric"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmitValue}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitValue}>
            <Text style={styles.submitBtnText}>OK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInput(false)}>
            <Text style={styles.cancelBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  streakText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  valueText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
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
  actionIconActive: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  valueInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text.primary,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  submitBtnText: {
    ...typography.bodyMedium,
    color: '#fff',
  },
  cancelBtn: {
    padding: spacing.sm,
  },
  cancelBtnText: {
    fontSize: 16,
    color: colors.text.muted,
  },
});
