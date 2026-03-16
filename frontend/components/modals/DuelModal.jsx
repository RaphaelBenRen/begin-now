import { useState } from 'react';
import {
  View, Text, Modal, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OBJECTIVE_TEMPLATES } from '../../constants/templates';
import { colors, spacing, radius, typography } from '../../constants/theme';

const DUEL_ICONS = ['⚔️', '🏆', '🔥', '💪', '🎯', '🚀', '⚡', '🌟'];

export default function DuelModal({ visible, onClose, friend, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('⚔️');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: choisir template, 2: détails

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setIcon('⚔️');
    setStartDate('');
    setEndDate('');
    setStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectTemplate = (template) => {
    setTitle(template.name);
    setIcon(template.icon);
    setStep(2);
  };

  const handleCustom = () => {
    setTitle('');
    setIcon('⚔️');
    setStep(2);
  };

  const validateDate = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre du défi est requis.');
      return;
    }
    if (startDate && !validateDate(startDate)) {
      Alert.alert('Erreur', 'Format de date invalide. Utilise AAAA-MM-JJ');
      return;
    }
    if (endDate && !validateDate(endDate)) {
      Alert.alert('Erreur', 'Format de date invalide. Utilise AAAA-MM-JJ');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        challenged_username: friend.username,
        title: title.trim(),
        description: description.trim() || null,
        icon,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      handleClose();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!friend) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={step === 2 ? () => setStep(1) : handleClose}>
            <Text style={styles.headerBack}>{step === 2 ? '← Retour' : '✕'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Défier {friend.username}</Text>
          <View style={{ width: 60 }} />
        </View>

        {step === 1 ? (
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Choisir un objectif</Text>
            <View style={styles.templateGrid}>
              {OBJECTIVE_TEMPLATES.map((t) => (
                <TouchableOpacity
                  key={t.slug}
                  style={[styles.templateCard, { borderColor: t.color + '40' }]}
                  onPress={() => handleSelectTemplate(t)}
                >
                  <View style={[styles.templateIconBg, { backgroundColor: t.color + '20' }]}>
                    <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                  </View>
                  <Text style={styles.templateName} numberOfLines={2}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionLabel}>Objectif personnalisé</Text>
            <TouchableOpacity style={styles.customCard} onPress={handleCustom}>
              <Text style={{ fontSize: 24 }}>✏️</Text>
              <View>
                <Text style={styles.customTitle}>Défi sur mesure</Text>
                <Text style={styles.customSub}>Définir un défi personnalisé</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Preview */}
            <View style={styles.challengePreview}>
              <Text style={styles.vsText}>
                Toi  <Text style={styles.vsIcon}>{icon}</Text>  {friend.username}
              </Text>
            </View>

            {/* Icône */}
            <Text style={styles.fieldLabel}>Icône du défi</Text>
            <View style={styles.iconRow}>
              {DUEL_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconBtn, icon === ic && styles.iconBtnActive]}
                  onPress={() => setIcon(ic)}
                >
                  <Text style={{ fontSize: 22 }}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Titre */}
            <Text style={styles.fieldLabel}>Titre du défi</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="ex: Ne pas fumer pendant 30 jours"
              placeholderTextColor={colors.text.muted}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Message (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Lance le défi avec un message..."
              placeholderTextColor={colors.text.muted}
              multiline
              numberOfLines={3}
            />

            {/* Dates */}
            <Text style={styles.fieldLabel}>Date de début (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={colors.text.muted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Date de fin (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={colors.text.muted}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.submitBtn, isLoading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>⚔️  Lancer le défi !</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        )}
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
  headerBack: { ...typography.body, color: colors.accent, width: 60 },
  headerTitle: { ...typography.h3, color: colors.text.primary },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  sectionLabel: {
    ...typography.smallMedium, color: colors.text.secondary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  templateCard: {
    width: '47%', backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, padding: spacing.md, gap: spacing.sm,
  },
  templateIconBg: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  templateName: { ...typography.bodyMedium, color: colors.text.primary },
  customCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.xl,
  },
  customTitle: { ...typography.bodyMedium, color: colors.text.primary },
  customSub: { ...typography.small, color: colors.text.secondary },
  challengePreview: {
    backgroundColor: colors.accentLight, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  vsText: { ...typography.h3, color: colors.accent },
  vsIcon: { fontSize: 22 },
  fieldLabel: { ...typography.smallMedium, color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.sm },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.md, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  iconBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, color: colors.text.primary,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xxl,
  },
  submitText: { ...typography.bodyMedium, color: '#fff' },
});
