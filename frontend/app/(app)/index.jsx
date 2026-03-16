import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Feather } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useObjectivesStore from '../../store/objectivesStore';
import api from '../../lib/api';
import ObjectiveCard from '../../components/objectives/ObjectiveCard';
import CreateObjectiveModal from '../../components/modals/CreateObjectiveModal';
import EditObjectiveModal from '../../components/modals/EditObjectiveModal';
import DateSelector from '../../components/ui/DateSelector';
import GradientBackground from '../../components/ui/GradientBackground';
import GlassCard from '../../components/ui/GlassCard';
import { spacing, typography } from '../../constants/theme';

const darkColors = {
  background: '#0a1628',
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.4)',
  },
  accent: '#3b82f6',
  glass: {
    bg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
  },
  surface: 'rgba(15, 25, 50, 0.95)',
  success: '#00b894',
  successLight: 'rgba(0, 184, 148, 0.15)',
  warning: '#fdcb6e',
  warningLight: 'rgba(253, 203, 110, 0.15)',
};

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

  // Charger les logs quand la date change
  useEffect(() => {
    fetchLogsByDate(selectedDate);
  }, [selectedDate]);

  // Charger les dates loguées une seule fois
  useEffect(() => {
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
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        {/* Header fixe */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour, {user?.username}</Text>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="calendar" size={14} color={darkColors.warning} />
              <Text style={styles.pastBannerText}>Historique — lecture seule</Text>
            </View>
          </View>
        )}

        {/* Liste des objectifs */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          <View style={styles.section}>
            {objectives.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="target" size={48} color={darkColors.text.muted} />
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
            <Feather name="plus" size={28} color="#fff" />
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
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greeting: {
    ...typography.h2,
    color: darkColors.text.primary,
    fontWeight: 'bold',
  },
  headerDate: {
    ...typography.small,
    color: darkColors.text.secondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  scoreChip: {
    backgroundColor: darkColors.glass.bg,
    borderWidth: 1,
    borderColor: darkColors.glass.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  scoreChipPerfect: {
    backgroundColor: darkColors.successLight,
    borderColor: darkColors.success,
  },
  scoreText: { ...typography.bodyMedium, color: darkColors.accent },
  scoreTextPerfect: { color: darkColors.success },
  pastBanner: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: darkColors.warningLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(253, 203, 110, 0.3)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pastBannerText: { ...typography.small, color: darkColors.warning },
  scroll: { flex: 1 },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  empty: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: darkColors.text.secondary },
  emptySubtitle: {
    ...typography.body,
    color: darkColors.text.muted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: darkColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: darkColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
