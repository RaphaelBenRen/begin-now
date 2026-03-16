import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import useAuthStore from '../../store/authStore';
import useObjectivesStore from '../../store/objectivesStore';
import api from '../../lib/api';
import ObjectiveCard from '../../components/objectives/ObjectiveCard';
import CreateObjectiveModal from '../../components/modals/CreateObjectiveModal';
import EditObjectiveModal from '../../components/modals/EditObjectiveModal';
import DateSelector from '../../components/ui/DateSelector';
import { colors, spacing, typography } from '../../constants/theme';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const {
    objectives, fetchObjectives,
    fetchLogsByDate, getLogsForDate, logObjective, createObjective,
    updateObjective, archiveObjective,
  } = useObjectivesStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [editObjective, setEditObjective] = useState(null);
  const [loggedDates, setLoggedDates] = useState([]);

  const isSelectedToday = isToday(selectedDate);
  const logs = getLogsForDate(selectedDate);

  useEffect(() => {
    fetchObjectives();
    // Charger les dates avec au moins un log "done" (90 derniers jours)
    const loadLoggedDates = async () => {
      try {
        const from = format(subDays(new Date(), 90), 'yyyy-MM-dd');
        const to = format(new Date(), 'yyyy-MM-dd');
        const res = await api.get('/logs/history', { params: { from, to } });
        const doneDates = [...new Set(
          res.data.filter((l) => l.status === 'done').map((l) => l.log_date)
        )];
        setLoggedDates(doneDates);
      } catch (_) {}
    };
    loadLoggedDates();
  }, []);

  useEffect(() => {
    fetchLogsByDate(selectedDate);
  }, [selectedDate]);

  const doneCount = objectives.filter((o) => logs[o.id]?.status === 'done').length;
  const totalCount = objectives.length;

  const handleLog = async (objectiveId, status, value) => {
    if (!isSelectedToday) return; // lecture seule pour les jours passés
    await logObjective(objectiveId, status, value);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header fixe */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.username} 👋</Text>
          <Text style={styles.headerDate}>
            {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
          </Text>
        </View>
        <View style={[
          styles.scoreChip,
          doneCount === totalCount && totalCount > 0 && styles.scoreChipPerfect,
        ]}>
          <Text style={[
            styles.scoreText,
            doneCount === totalCount && totalCount > 0 && styles.scoreTextPerfect,
          ]}>
            {doneCount}/{totalCount}
          </Text>
        </View>
      </View>

      {/* Sélecteur de dates */}
      <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} loggedDates={loggedDates} />

      {/* Bannière jour passé */}
      {!isSelectedToday && (
        <View style={styles.pastBanner}>
          <Text style={styles.pastBannerText}>
            📅 Historique — lecture seule
          </Text>
        </View>
      )}

      {/* Liste des objectifs */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
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
                log={logs[objective.id]}
                onLog={handleLog}
                onEdit={(obj) => setEditObjective(obj)}
                onDelete={async (id) => {
                  await archiveObjective(id);
                }}
                readOnly={!isSelectedToday}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB — seulement visible aujourd'hui */}
      {isSelectedToday && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <CreateObjectiveModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={createObjective}
      />

      <EditObjectiveModal
        visible={!!editObjective}
        objective={editObjective}
        onClose={() => setEditObjective(null)}
        onSave={updateObjective}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greeting: { ...typography.h2, color: colors.text.primary },
  headerDate: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  scoreChip: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  scoreChipPerfect: { backgroundColor: colors.successLight },
  scoreText: { ...typography.bodyMedium, color: colors.accent },
  scoreTextPerfect: { color: colors.success },
  pastBanner: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pastBannerText: { ...typography.small, color: colors.warning },
  scroll: { flex: 1 },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  empty: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: colors.text.secondary },
  emptySubtitle: { ...typography.body, color: colors.text.muted, textAlign: 'center' },
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
  fabText: { fontSize: 28, color: '#fff', lineHeight: 32 },
});
