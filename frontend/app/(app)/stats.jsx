import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { format, eachDayOfInterval, subDays, subWeeks, subMonths, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import useObjectivesStore from '../../store/objectivesStore';
import useStatsStore from '../../store/statsStore';
import useDuelsStore from '../../store/duelsStore';
import useAuthStore from '../../store/authStore';
import DuelProgressModal from '../../components/modals/DuelProgressModal';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

const PERIODS = [
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
];

export default function StatsScreen() {
  const { objectives, fetchObjectives } = useObjectivesStore();
  const { stats, streaks, isLoading, fetchStats, fetchStreaks } = useStatsStore();
  const { duels, fetchDuels } = useDuelsStore();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('week');
  const [selectedObjective, setSelectedObjective] = useState(null);
  const [duelProgress, setDuelProgress] = useState(null);

  useEffect(() => {
    fetchObjectives();
    fetchStreaks();
    fetchDuels();
  }, []);

  useEffect(() => {
    fetchStats(period, selectedObjective);
  }, [period, selectedObjective]);

  // ─── Données graphique barres (taux de réussite par jour/semaine) ───
  const barData = useMemo(() => {
    if (!stats?.logs?.length) return [];

    const today = new Date();
    let days = [];

    if (period === 'week') {
      days = eachDayOfInterval({ start: subDays(today, 6), end: today });
    } else if (period === 'month') {
      // Grouper par semaine (dernières 4 semaines)
      return Array.from({ length: 4 }, (_, i) => {
        const weekEnd = subWeeks(today, i);
        const weekStart = subDays(weekEnd, 6);
        const weekLogs = stats.logs.filter((l) => {
          const d = parseISO(l.log_date);
          return d >= weekStart && d <= weekEnd;
        });
        const done = weekLogs.filter((l) => l.status === 'done').length;
        const total = weekLogs.length;
        return {
          value: total > 0 ? Math.round((done / total) * 100) : 0,
          label: `S${4 - i}`,
          frontColor: total > 0 && done === total ? colors.success : colors.accent,
          topLabelComponent: () => total > 0 ? (
            <Text style={styles.barLabel}>{Math.round((done / total) * 100)}%</Text>
          ) : null,
        };
      }).reverse();
    } else if (period === 'year') {
      // Grouper par mois (derniers 12 mois)
      return Array.from({ length: 12 }, (_, i) => {
        const monthDate = subMonths(today, 11 - i);
        const monthStr = format(monthDate, 'yyyy-MM');
        const monthLogs = stats.logs.filter((l) => l.log_date.startsWith(monthStr));
        const done = monthLogs.filter((l) => l.status === 'done').length;
        const total = monthLogs.length;
        return {
          value: total > 0 ? Math.round((done / total) * 100) : 0,
          label: format(monthDate, 'MMM', { locale: fr }).slice(0, 3),
          frontColor: total > 0 && done === total ? colors.success : colors.accent,
          topLabelComponent: () => total > 0 ? (
            <Text style={styles.barLabel}>{Math.round((done / total) * 100)}%</Text>
          ) : null,
        };
      });
    }

    // Par jour (semaine)
    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayLogs = stats.logs.filter((l) => l.log_date === dateStr);
      const done = dayLogs.filter((l) => l.status === 'done').length;
      const total = dayLogs.length;
      return {
        value: total > 0 ? Math.round((done / total) * 100) : 0,
        label: format(day, 'EEE', { locale: fr }).slice(0, 2),
        frontColor: total > 0 && done === total ? colors.success : colors.accent,
        topLabelComponent: () => total > 0 ? (
          <Text style={styles.barLabel}>{Math.round((done / total) * 100)}%</Text>
        ) : null,
      };
    });
  }, [stats, period]);

  // ─── Données ligne (objectif quantifiable sélectionné) ───
  const lineData = useMemo(() => {
    if (!stats?.logs?.length || !selectedObjective) return [];
    const obj = objectives.find((o) => o.id === selectedObjective);
    if (!obj || obj.type !== 'quantifiable') return [];

    const quantLogs = stats.logs.filter(
      (l) => l.objective_id === selectedObjective && l.value != null
    );
    if (!quantLogs.length) return [];

    return quantLogs.map((l) => ({
      value: l.value,
      label: format(parseISO(l.log_date), 'd/M'),
      dataPointText: String(l.value),
    }));
  }, [stats, selectedObjective, objectives]);

  const selectedObj = objectives.find((o) => o.id === selectedObjective);
  const isQuantifiable = selectedObj?.type === 'quantifiable';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Statistiques</Text>
        </View>

        {/* Filtres période */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filtre objectifs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.objectiveFilters}
        >
          <TouchableOpacity
            style={[styles.objChip, !selectedObjective && styles.objChipActive]}
            onPress={() => setSelectedObjective(null)}
          >
            <Text style={[styles.objChipText, !selectedObjective && styles.objChipTextActive]}>
              Tous
            </Text>
          </TouchableOpacity>
          {objectives.map((obj) => (
            <TouchableOpacity
              key={obj.id}
              style={[
                styles.objChip,
                selectedObjective === obj.id && { backgroundColor: obj.color, borderColor: obj.color },
              ]}
              onPress={() => setSelectedObjective(selectedObjective === obj.id ? null : obj.id)}
            >
              <Text style={{ marginRight: 4 }}>{obj.icon}</Text>
              <Text style={[
                styles.objChipText,
                selectedObjective === obj.id && styles.objChipTextActive,
              ]}>
                {obj.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxl }} />
        ) : (
          <>
            {/* Cartes résumé */}
            {stats?.summary && (
              <View style={styles.summaryRow}>
                <SummaryCard
                  label="Taux de réussite"
                  value={`${stats.summary.successRate}%`}
                  color={stats.summary.successRate >= 70 ? colors.success : colors.accent}
                  bg={stats.summary.successRate >= 70 ? colors.successLight : colors.accentLight}
                />
                <SummaryCard
                  label="Jours complétés"
                  value={String(stats.summary.done)}
                  color={colors.accent}
                  bg={colors.accentLight}
                />
                <SummaryCard
                  label="Total logs"
                  value={String(stats.summary.total)}
                  color={colors.text.secondary}
                  bg={colors.border}
                />
              </View>
            )}

            {/* Graphique barres — taux de complétion */}
            {barData.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Taux de complétion {selectedObj ? `— ${selectedObj.icon} ${selectedObj.title}` : ''}
                </Text>
                <View style={styles.chartWrapper}>
                  <BarChart
                    data={barData}
                    barWidth={period === 'year' ? 18 : 30}
                    spacing={period === 'year' ? 8 : 14}
                    roundedTop
                    roundedBottom
                    hideRules
                    xAxisThickness={0}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: colors.text.muted, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: colors.text.muted, fontSize: 10 }}
                    noOfSections={4}
                    maxValue={100}
                    isAnimated
                    animationDuration={600}
                    barBorderRadius={4}
                    showYAxisIndices={false}
                    hideYAxisText
                    labelsExtraHeight={20}
                    width={320}
                  />
                </View>
                {/* Légende */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                    <Text style={styles.legendText}>100%</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                    <Text style={styles.legendText}>Partiel</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Graphique ligne — objectif quantifiable */}
            {isQuantifiable && lineData.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {selectedObj.icon} {selectedObj.title} ({selectedObj.unit})
                </Text>
                <View style={styles.chartWrapper}>
                  <LineChart
                    data={lineData}
                    width={320}
                    height={180}
                    color={selectedObj.color || colors.accent}
                    thickness={2}
                    dataPointsColor={selectedObj.color || colors.accent}
                    dataPointsRadius={4}
                    hideRules
                    xAxisThickness={0}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: colors.text.muted, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: colors.text.muted, fontSize: 10 }}
                    isAnimated
                    curved
                    startFillColor={selectedObj.color + '30' || colors.accentLight}
                    endFillColor="transparent"
                    areaChart
                  />
                </View>
              </View>
            )}

            {/* Streaks */}
            {streaks.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Streaks</Text>
                <View style={styles.streakList}>
                  {streaks
                    .filter((s) => !selectedObjective || s.objective_id === selectedObjective)
                    .sort((a, b) => b.current_streak - a.current_streak)
                    .map((s) => (
                      <StreakRow key={s.id} streak={s} />
                    ))}
                </View>
              </View>
            )}

            {/* Historique récent */}
            {stats?.logs?.length > 0 && (
              <View style={[styles.card, { marginBottom: spacing.xl }]}>
                <Text style={styles.cardTitle}>Historique récent</Text>
                {[...stats.logs]
                  .sort((a, b) => b.log_date.localeCompare(a.log_date))
                  .slice(0, 20)
                  .map((log) => (
                    <HistoryRow key={log.id} log={log} objectives={objectives} />
                  ))}
              </View>
            )}

            {!stats?.logs?.length && !isLoading && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucune donnée pour cette période.</Text>
                <Text style={styles.emptySubText}>
                  Commence à cocher tes objectifs pour voir tes stats !
                </Text>
              </View>
            )}
          </>
        )}

        {/* ─── Section Défis ─── */}
        <DuelsSection
          duels={duels}
          currentUserId={user?.id}
          onOpenDuel={setDuelProgress}
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <DuelProgressModal
        visible={!!duelProgress}
        duel={duelProgress}
        currentUserId={user?.id}
        onClose={() => setDuelProgress(null)}
      />
    </SafeAreaView>
  );
}

// ─── Composants internes ────────────────────────────────────────

function SummaryCard({ label, value, color, bg }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: bg }]}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function StreakRow({ streak }) {
  const obj = streak.objective;
  if (!obj) return null;
  return (
    <View style={styles.streakRow}>
      <Text style={styles.streakIcon}>{obj.icon}</Text>
      <View style={styles.streakInfo}>
        <Text style={styles.streakName}>{obj.title}</Text>
        <Text style={styles.streakSub}>Record : {streak.longest_streak} jours</Text>
      </View>
      <View style={styles.streakBadge}>
        <Text style={styles.streakFire}>🔥</Text>
        <Text style={styles.streakNum}>{streak.current_streak}</Text>
      </View>
    </View>
  );
}

function HistoryRow({ log, objectives }) {
  const obj = objectives.find((o) => o.id === log.objective_id);
  if (!obj) return null;
  const isDone = log.status === 'done';
  const isFailed = log.status === 'failed';
  return (
    <View style={styles.historyRow}>
      <Text style={styles.historyIcon}>{obj.icon}</Text>
      <View style={styles.historyInfo}>
        <Text style={styles.historyName}>{obj.title}</Text>
        <Text style={styles.historyDate}>
          {format(parseISO(log.log_date), 'EEE d MMM', { locale: fr })}
          {log.value != null ? ` · ${log.value} ${obj.unit}` : ''}
        </Text>
      </View>
      <View style={[
        styles.statusBadge,
        isDone && styles.statusDone,
        isFailed && styles.statusFailed,
        log.status === 'skipped' && styles.statusSkipped,
      ]}>
        <Text style={styles.statusText}>
          {isDone ? '✓' : isFailed ? '✗' : '—'}
        </Text>
      </View>
    </View>
  );
}

// ─── Section Défis ──────────────────────────────────────────────

function DuelsSection({ duels, currentUserId, onOpenDuel }) {
  if (!duels.length) return null;

  const active = duels.filter((d) => ['accepted', 'active'].includes(d.status));
  const pending = duels.filter((d) => d.status === 'pending');
  const finished = duels.filter((d) => ['declined', 'completed'].includes(d.status));

  return (
    <View style={[styles.card, { marginTop: spacing.md }]}>
      <Text style={styles.cardTitle}>⚔️  Défis</Text>

      {/* Résumé chiffré */}
      <View style={styles.duelSummaryRow}>
        <DuelStat value={active.length} label="Actifs" color={colors.success} />
        <DuelStat value={pending.length} label="En attente" color={colors.warning} />
        <DuelStat value={finished.length} label="Terminés" color={colors.text.muted} />
      </View>

      {/* Défis actifs cliquables */}
      {active.length > 0 ? (
        <View style={styles.duelList}>
          {active.map((duel) => {
            const isChallenger = duel.challenger_id === currentUserId;
            const opponent = isChallenger ? duel.challenged : duel.challenger;
            const daysLeft = duel.end_date
              ? differenceInDays(parseISO(duel.end_date), new Date())
              : null;

            return (
              <TouchableOpacity
                key={duel.id}
                style={styles.duelCard}
                onPress={() => onOpenDuel(duel)}
                activeOpacity={0.8}
              >
                <View style={styles.duelIconCircle}>
                  <Text style={{ fontSize: 20 }}>{duel.icon}</Text>
                </View>
                <View style={styles.duelInfo}>
                  <Text style={styles.duelTitle} numberOfLines={1}>{duel.title}</Text>
                  <Text style={styles.duelOpponent}>vs {opponent?.username}</Text>
                </View>
                <View style={styles.duelRight}>
                  {daysLeft !== null && (
                    <Text style={[
                      styles.duelDays,
                      { color: daysLeft <= 3 ? colors.danger : colors.text.muted },
                    ]}>
                      {daysLeft > 0 ? `J-${daysLeft}` : daysLeft === 0 ? 'Dernier jour' : 'Terminé'}
                    </Text>
                  )}
                  <Text style={styles.duelChevron}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.duelEmptyText}>
          Aucun défi actif — défie un ami depuis l'onglet Amis !
        </Text>
      )}
    </View>
  );
}

function DuelStat({ value, label, color }) {
  return (
    <View style={styles.duelStatBlock}>
      <Text style={[styles.duelStatValue, { color }]}>{value}</Text>
      <Text style={styles.duelStatLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.h2, color: colors.text.primary },

  periodRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: colors.accent },
  periodText: { ...typography.smallMedium, color: colors.text.secondary },
  periodTextActive: { color: '#fff' },

  objectiveFilters: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  objChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  objChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  objChipText: { ...typography.smallMedium, color: colors.text.secondary },
  objChipTextActive: { color: '#fff' },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: { ...typography.h2 },
  summaryLabel: { ...typography.caption, color: colors.text.secondary, textAlign: 'center' },

  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  chartWrapper: { alignItems: 'center', overflow: 'hidden' },
  barLabel: { fontSize: 9, color: colors.text.muted },

  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, justifyContent: 'flex-end' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption, color: colors.text.muted },

  streakList: { gap: spacing.sm },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  streakIcon: { fontSize: 22 },
  streakInfo: { flex: 1 },
  streakName: { ...typography.bodyMedium, color: colors.text.primary },
  streakSub: { ...typography.caption, color: colors.text.muted },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakFire: { fontSize: 16 },
  streakNum: { ...typography.h3, color: colors.text.primary },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  historyIcon: { fontSize: 20 },
  historyInfo: { flex: 1 },
  historyName: { ...typography.bodyMedium, color: colors.text.primary },
  historyDate: { ...typography.caption, color: colors.text.muted, textTransform: 'capitalize' },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  statusDone: { backgroundColor: colors.successLight },
  statusFailed: { backgroundColor: colors.dangerLight },
  statusSkipped: { backgroundColor: colors.warningLight },
  statusText: { fontSize: 13, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.h3, color: colors.text.secondary },
  emptySubText: { ...typography.body, color: colors.text.muted, textAlign: 'center', paddingHorizontal: spacing.xl },

  duelSummaryRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  duelStatBlock: { flex: 1, alignItems: 'center' },
  duelStatValue: { ...typography.h3 },
  duelStatLabel: { ...typography.caption, color: colors.text.muted, marginTop: 2 },

  duelList: { gap: spacing.sm },
  duelCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  duelIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  duelInfo: { flex: 1 },
  duelTitle: { ...typography.bodyMedium, color: colors.text.primary },
  duelOpponent: { ...typography.caption, color: colors.text.secondary },
  duelRight: { alignItems: 'flex-end', gap: 2 },
  duelDays: { ...typography.caption, fontWeight: '600' },
  duelChevron: { fontSize: 20, color: colors.text.muted },
  duelEmptyText: { ...typography.small, color: colors.text.muted, textAlign: 'center', paddingVertical: spacing.sm },
});
