import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import useAuthStore from '../../store/authStore';
import useObjectivesStore from '../../store/objectivesStore';
import ObjectiveCard from '../../components/objectives/ObjectiveCard';
import CreateObjectiveModal from '../../components/modals/CreateObjectiveModal';
import { colors, spacing, typography } from '../../constants/theme';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { objectives, todayLogs, fetchObjectives, fetchTodayLogs, logObjective, createObjective } = useObjectivesStore();
  const [modalVisible, setModalVisible] = useState(false);

  const today = format(new Date(), 'EEEE d MMMM', { locale: fr });

  useEffect(() => {
    fetchObjectives();
    fetchTodayLogs();
  }, []);

  const doneCount = objectives.filter((o) => todayLogs[o.id]?.status === 'done').length;

  const handleCreateObjective = async (data) => {
    await createObjective(data);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour, {user?.username} 👋</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.scoreChip}>
            <Text style={styles.scoreText}>{doneCount}/{objectives.length}</Text>
          </View>
        </View>

        {/* Objectifs du jour */}
        <View style={styles.section}>
          {objectives.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucun objectif</Text>
              <Text style={styles.emptySubtitle}>
                Appuie sur + pour créer ton premier objectif
              </Text>
            </View>
          ) : (
            objectives.map((objective) => (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                log={todayLogs[objective.id]}
                onLog={logObjective}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal création objectif */}
      <CreateObjectiveModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreateObjective}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    ...typography.h2,
    color: colors.text.primary,
  },
  date: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  scoreChip: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  scoreText: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  empty: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.secondary,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
  },
});
