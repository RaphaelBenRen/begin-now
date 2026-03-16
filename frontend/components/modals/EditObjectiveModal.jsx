import { useState, useEffect } from 'react';
import {
  View, Text, Modal, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OBJECTIVE_COLORS } from '../../constants/templates';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function EditObjectiveModal({ visible, onClose, objective, onSave }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('binary');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [positiveGoal, setPositiveGoal] = useState(true);
  const [selectedColor, setSelectedColor] = useState(OBJECTIVE_COLORS[0]);
  const [icon, setIcon] = useState('⭐');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && objective) {
      setTitle(objective.title || '');
      setType(objective.type || 'binary');
      setUnit(objective.unit || '');
      setTargetValue(objective.target_value ? String(objective.target_value) : '');
      setPositiveGoal(objective.positive_goal !== false);
      setSelectedColor(objective.color || OBJECTIVE_COLORS[0]);
      setIcon(objective.icon || '⭐');
    }
  }, [visible, objective]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis.');
      return;
    }
    setIsLoading(true);
    try {
      await onSave(objective.id, {
        title: title.trim(),
        type,
        unit: type === 'quantifiable' ? unit.trim() : null,
        target_value: type === 'quantifiable' && targetValue ? parseInt(targetValue) : null,
        positive_goal: positiveGoal,
        color: selectedColor,
        icon,
      });
      onClose();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!objective) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerBack}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier</Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color={colors.accent} />
              : <Text style={styles.headerSave}>Enregistrer</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Icône + titre */}
          <View style={styles.previewRow}>
            <View style={[styles.previewIcon, { backgroundColor: selectedColor + '25' }]}>
              <Text style={{ fontSize: 28 }}>{icon}</Text>
            </View>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Nom de l'objectif"
              placeholderTextColor={colors.text.muted}
            />
          </View>

          {/* Type */}
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'binary' && styles.typeBtnActive]}
              onPress={() => setType('binary')}
            >
              <Text style={[styles.typeBtnText, type === 'binary' && styles.typeBtnTextActive]}>
                Oui / Non
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'quantifiable' && styles.typeBtnActive]}
              onPress={() => setType('quantifiable')}
            >
              <Text style={[styles.typeBtnText, type === 'quantifiable' && styles.typeBtnTextActive]}>
                Compteur
              </Text>
            </TouchableOpacity>
          </View>

          {/* Direction */}
          <Text style={styles.fieldLabel}>Direction</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, positiveGoal && styles.typeBtnActive]}
              onPress={() => setPositiveGoal(true)}
            >
              <Text style={[styles.typeBtnText, positiveGoal && styles.typeBtnTextActive]}>
                À faire ✓
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, !positiveGoal && styles.typeBtnActive]}
              onPress={() => setPositiveGoal(false)}
            >
              <Text style={[styles.typeBtnText, !positiveGoal && styles.typeBtnTextActive]}>
                À éviter ✗
              </Text>
            </TouchableOpacity>
          </View>

          {/* Unité (si quantifiable) */}
          {type === 'quantifiable' && (
            <>
              <Text style={styles.fieldLabel}>Unité</Text>
              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                placeholder="cigarettes, verres, pages..."
                placeholderTextColor={colors.text.muted}
              />
              <Text style={styles.fieldLabel}>Objectif cible (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={targetValue}
                onChangeText={setTargetValue}
                placeholder="ex: 5"
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
              />
            </>
          )}

          {/* Couleur */}
          <Text style={styles.fieldLabel}>Couleur</Text>
          <View style={styles.colorRow}>
            {OBJECTIVE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>

          {/* Icône */}
          <Text style={styles.fieldLabel}>Icône (emoji)</Text>
          <TextInput
            style={styles.input}
            value={icon}
            onChangeText={setIcon}
            placeholder="🎯"
            placeholderTextColor={colors.text.muted}
            maxLength={2}
          />

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBack: { ...typography.body, color: colors.text.secondary, width: 80 },
  headerTitle: { ...typography.h3, color: colors.text.primary },
  headerSave: { ...typography.bodyMedium, color: colors.accent, width: 80, textAlign: 'right' },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg,
  },
  previewIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  titleInput: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, color: colors.text.primary,
  },
  fieldLabel: { ...typography.smallMedium, color: colors.text.secondary, marginBottom: spacing.sm, marginTop: spacing.md },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface,
  },
  typeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeBtnText: { ...typography.smallMedium, color: colors.text.secondary },
  typeBtnTextActive: { color: '#fff' },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, color: colors.text.primary,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: colors.text.primary },
});
