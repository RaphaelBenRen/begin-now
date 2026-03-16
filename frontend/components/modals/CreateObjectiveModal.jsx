import { useState } from 'react';
import {
  View, Text, Modal, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OBJECTIVE_TEMPLATES, OBJECTIVE_COLORS } from '../../constants/templates';
import { spacing, typography } from '../../constants/theme';

const STEPS = { SELECT: 'select', CUSTOMIZE: 'customize' };

export default function CreateObjectiveModal({ visible, onClose, onSubmit }) {
  const [step, setStep] = useState(STEPS.SELECT);
  const [selected, setSelected] = useState(null); // template ou 'custom'
  const [isLoading, setIsLoading] = useState(false);

  // Champs du formulaire
  const [title, setTitle] = useState('');
  const [type, setType] = useState('binary');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [positiveGoal, setPositiveGoal] = useState(true);
  const [selectedColor, setSelectedColor] = useState(OBJECTIVE_COLORS[0]);
  const [icon, setIcon] = useState('⭐');

  const resetForm = () => {
    setStep(STEPS.SELECT);
    setSelected(null);
    setTitle('');
    setType('binary');
    setUnit('');
    setTargetValue('');
    setPositiveGoal(true);
    setSelectedColor(OBJECTIVE_COLORS[0]);
    setIcon('⭐');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectTemplate = (template) => {
    setSelected(template);
    setTitle(template.name);
    setType(template.type);
    setUnit(template.unit || '');
    setPositiveGoal(template.positive_goal);
    setSelectedColor(template.color);
    setIcon(template.icon);
    setStep(STEPS.CUSTOMIZE);
  };

  const handleSelectCustom = () => {
    setSelected('custom');
    setTitle('');
    setType('binary');
    setUnit('');
    setPositiveGoal(true);
    setSelectedColor(OBJECTIVE_COLORS[0]);
    setIcon('✏️');
    setStep(STEPS.CUSTOMIZE);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis.');
      return;
    }
    setIsLoading(true);
    try {
      await onSubmit({
        template_id: null,
        title: title.trim(),
        type,
        unit: type === 'quantifiable' ? unit.trim() : null,
        target_value: type === 'quantifiable' && targetValue ? parseInt(targetValue) : null,
        positive_goal: positiveGoal,
        color: selectedColor,
        icon,
        is_public: true,
      });
      handleClose();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={step === STEPS.CUSTOMIZE ? () => setStep(STEPS.SELECT) : handleClose}>
            <Text style={styles.headerBack}>
              {step === STEPS.CUSTOMIZE ? '← Retour' : '✕'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === STEPS.SELECT ? 'Choisir un objectif' : 'Personnaliser'}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {step === STEPS.SELECT ? (
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Objectifs prédéfinis */}
            <Text style={styles.sectionLabel}>Objectifs prédéfinis</Text>
            <View style={styles.templateGrid}>
              {OBJECTIVE_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.slug}
                  style={styles.templateCard}
                  onPress={() => handleSelectTemplate(template)}
                >
                  <View style={styles.templateIconBg}>
                    <Text style={styles.templateIcon}>{template.icon}</Text>
                  </View>
                  <Text style={styles.templateName} numberOfLines={2}>{template.name}</Text>
                  <Text style={styles.templateType}>
                    {template.type === 'quantifiable' ? `Compteur (${template.unit})` : 'Oui / Non'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Objectif personnalisé */}
            <Text style={styles.sectionLabel}>Objectif personnalisé</Text>
            <TouchableOpacity style={styles.customCard} onPress={handleSelectCustom}>
              <Text style={styles.customIcon}>✏️</Text>
              <View>
                <Text style={styles.customTitle}>Créer le mien</Text>
                <Text style={styles.customSub}>Définir un objectif sur mesure</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        ) : (
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
                placeholderTextColor="rgba(255,255,255,0.35)"
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
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
                <Text style={styles.fieldLabel}>Objectif cible (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  value={targetValue}
                  onChangeText={setTargetValue}
                  placeholder="ex: 5"
                  placeholderTextColor="rgba(255,255,255,0.35)"
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

            {/* Icône custom */}
            {selected === 'custom' && (
              <>
                <Text style={styles.fieldLabel}>Icône (emoji)</Text>
                <TextInput
                  style={styles.input}
                  value={icon}
                  onChangeText={setIcon}
                  placeholder="🎯"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  maxLength={2}
                />
              </>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>Ajouter l'objectif</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  headerBack: { ...typography.body, color: '#3b82f6', width: 60 },
  headerTitle: { ...typography.h3, color: '#ffffff' },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  sectionLabel: {
    ...typography.smallMedium, color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  templateCard: {
    width: '47%', backgroundColor: 'rgba(15,25,50,0.95)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: spacing.md, gap: spacing.sm,
  },
  templateIconBg: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  templateIcon: { fontSize: 22 },
  templateName: { ...typography.bodyMedium, color: '#ffffff' },
  templateType: { ...typography.caption, color: 'rgba(255,255,255,0.4)' },
  customCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: 'rgba(15,25,50,0.95)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: spacing.md, marginBottom: spacing.xl,
  },
  customIcon: { fontSize: 28 },
  customTitle: { ...typography.bodyMedium, color: '#ffffff' },
  customSub: { ...typography.small, color: 'rgba(255,255,255,0.7)' },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg,
  },
  previewIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, color: '#ffffff',
  },
  fieldLabel: {
    ...typography.smallMedium, color: 'rgba(255,255,255,0.7)', fontWeight: '600',
    marginBottom: spacing.sm, marginTop: spacing.md,
  },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  typeBtnActive: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  typeBtnText: { ...typography.smallMedium, color: 'rgba(255,255,255,0.7)' },
  typeBtnTextActive: { color: '#ffffff' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, color: '#ffffff',
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#ffffff' },
  submitBtn: {
    borderRadius: 20, paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xxl,
    backgroundColor: '#3b82f6',
  },
  submitText: { ...typography.bodyMedium, color: '#ffffff', fontWeight: '700' },
});
