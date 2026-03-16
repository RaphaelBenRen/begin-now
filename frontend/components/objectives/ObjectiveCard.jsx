import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';

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
          <View style={styles.iconBadge}>
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
              <Text style={[styles.valueText, isFailed && { color: '#ff7675' }]}>
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
            placeholderTextColor="rgba(255,255,255,0.35)"
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
    backgroundColor: 'rgba(15, 25, 50, 0.95)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardDone: {
    borderColor: '#00b894',
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
  },
  cardFailed: {
    borderColor: '#ff7675',
    backgroundColor: 'rgba(255, 118, 117, 0.1)',
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
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  streakText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  valueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionBtnDone: {
    backgroundColor: '#00b894',
    borderColor: '#00b894',
  },
  actionBtnFailed: {
    backgroundColor: '#ff7675',
    borderColor: '#ff7675',
  },
  actionIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  actionIconActive: {
    color: '#ffffff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  valueInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#ffffff',
  },
  submitBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelBtn: {
    padding: 8,
  },
  cancelBtnText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
