import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg';
import { format, eachDayOfInterval, subDays, subWeeks, subMonths, parseISO, differenceInDays, getDaysInMonth } from 'date-fns';
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
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    fetchObjectives();
    fetchStreaks();
    fetchDuels();
  }, []);

  useEffect(() => {
    fetchStats(period, selectedObjective);
  }, [period, selectedObjective]);

  // ─── Données courbe de complétion ───
  const completionData = useMemo(() => {
    if (!stats?.logs?.length) return [];

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    // Si un objectif est sélectionné, le dénominateur est 1, sinon tous les actifs
    const activeCount = selectedObjective
      ? 1
      : (objectives.filter((o) => o.is_active).length || 1);

    const makePoint = (doneDays, totalDays, label, isCurrent = false) => {
      // doneDays = nombre de jours réussis, totalDays = nombre de jours dans la période
      const rate = totalDays > 0 ? Math.min(100, Math.round((doneDays / totalDays) * 100)) : 0;
      return {
        value: rate,
        label,
        dataPointText: `${rate}%`,
        dataPointColor: isCurrent ? colors.accent : colors.text.muted,
        dataPointRadius: isCurrent ? 8 : 5,
        textShiftY: -14,
        textColor: isCurrent ? colors.accent : colors.text.muted,
        textFontSize: isCurrent ? 12 : 10,
      };
    };

    // Compter les jours distincts "done" dans un ensemble de logs
    const countDoneDays = (logs) => {
      const doneDates = new Set(
        logs.filter((l) => l.status === 'done').map((l) => l.log_date)
      );
      return doneDates.size;
    };

    if (period === 'week') {
      // Par jour : done/activeCount objectifs ce jour-là
      const days = eachDayOfInterval({ start: subDays(today, 6), end: today });
      return days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isToday = dateStr === todayStr;
        const dayLogs = stats.logs.filter((l) => l.log_date === dateStr);
        const done = dayLogs.filter((l) => l.status === 'done').length;
        const rate = Math.min(100, Math.round((done / activeCount) * 100));
        const label = isToday ? 'Auj.' : format(day, 'EEE', { locale: fr }).slice(0, 2);
        return {
          value: rate,
          label,
          dataPointText: `${rate}%`,
          dataPointColor: isToday ? colors.accent : colors.text.muted,
          dataPointRadius: isToday ? 8 : 5,
          textShiftY: -14,
          textColor: isToday ? colors.accent : colors.text.muted,
          textFontSize: isToday ? 12 : 10,
        };
      });
    }

    if (period === 'month') {
      // Par semaine : jours done / 7
      return Array.from({ length: 4 }, (_, i) => {
        const weekEnd = subWeeks(today, 3 - i);
        const weekStart = subDays(weekEnd, 6);
        const weekLogs = stats.logs.filter((l) => {
          const d = parseISO(l.log_date);
          return d >= weekStart && d <= weekEnd;
        });
        const isCurrentWeek = i === 3;
        const doneDays = countDoneDays(weekLogs);
        return makePoint(doneDays, 7, isCurrentWeek ? 'Actu.' : `S-${3 - i}`, isCurrentWeek);
      });
    }

    if (period === 'year') {
      // Par mois : jours done / nombre de jours dans le mois
      return Array.from({ length: 12 }, (_, i) => {
        const monthDate = subMonths(today, 11 - i);
        const monthStr = format(monthDate, 'yyyy-MM');
        const monthLogs = stats.logs.filter((l) => l.log_date.startsWith(monthStr));
        const isCurrentMonth = i === 11;
        const doneDays = countDoneDays(monthLogs);
        const daysInMonth = getDaysInMonth(monthDate);
        const label = format(monthDate, 'MMM', { locale: fr }).slice(0, 3);
        return makePoint(doneDays, daysInMonth, label, isCurrentMonth);
      });
    }

    return [];
  }, [stats, period, objectives]);

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

            {/* Courbe de complétion */}
            {completionData.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Taux de complétion {selectedObj ? `— ${selectedObj.icon} ${selectedObj.title}` : ''}
                </Text>
                <SmoothChart
                  data={completionData}
                  screenWidth={screenWidth}
                  accentColor={colors.accent}
                  suffix="%"
                  maxVal={100}
                  scrollable={period === 'year'}
                  minSpacing={period === 'year' ? 75 : 0}
                />
              </View>
            )}

            {/* Graphique ligne — objectif quantifiable */}
            {isQuantifiable && lineData.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {selectedObj.icon} {selectedObj.title} ({selectedObj.unit})
                </Text>
                <SmoothChart
                  data={lineData.map((d) => ({
                    ...d,
                    dataPointText: `${d.value}`,
                  }))}
                  screenWidth={screenWidth}
                  accentColor={selectedObj.color || colors.accent}
                  suffix={selectedObj.unit ? ` ${selectedObj.unit}` : ''}
                />
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

// ─── Courbe SVG lisse ───────────────────────────────────────────

const GRAPH_HEIGHT = 180;
const Y_AXIS_WIDTH = 35;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 10;
const MARGIN_H = 16;

const buildSmoothPath = (pts) => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const tension = 0.3;
    const dx = next.x - curr.x;
    const cp1x = curr.x + dx * tension;
    const cp2x = next.x - dx * tension;
    d += ` C ${cp1x} ${curr.y}, ${cp2x} ${next.y}, ${next.x} ${next.y}`;
  }
  return d;
};

function SmoothChart({ data, screenWidth, accentColor, suffix = '', maxVal, scrollable = false, minSpacing = 0 }) {
  if (!data || data.length === 0) return null;

  const baseGraphWidth = screenWidth - spacing.lg * 2 - spacing.md * 2 - Y_AXIS_WIDTH;
  const usableHeight = GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const computedMax = maxVal || Math.max(...data.map((d) => d.value), 1);

  // Si scrollable, on garantit un espacement minimum entre les points
  const neededWidth = minSpacing > 0 ? MARGIN_H * 2 + (data.length - 1) * minSpacing : baseGraphWidth;
  const graphWidth = Math.max(baseGraphWidth, neededWidth);

  // Grille Y : 5 niveaux
  const ySteps = [0, 25, 50, 75, 100].map((pct) => {
    const val = Math.round((pct / 100) * computedMax);
    return {
      val,
      y: PADDING_TOP + usableHeight - (pct / 100) * usableHeight,
      label: `${val}${suffix}`,
    };
  });

  // Convertir data → coordonnées SVG
  const points = data.map((item, index) => {
    const x = data.length === 1
      ? graphWidth / 2
      : MARGIN_H + (index / (data.length - 1)) * (graphWidth - MARGIN_H * 2);
    const rawVal = Math.max(0, Math.min(item.value, computedMax));
    const y = PADDING_TOP + usableHeight - (rawVal / computedMax) * usableHeight;
    return { x, y, value: item.value, label: item.label, isToday: item.dataPointColor === accentColor };
  });

  const linePath = buildSmoothPath(points);
  const bottomY = PADDING_TOP + usableHeight;
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`
    : '';

  const chartContent = (
    <View style={{ width: graphWidth, height: GRAPH_HEIGHT + 28 }}>
      {/* Lignes de grille */}
      {ySteps.map((step) => (
        <View
          key={step.val}
          style={[chartStyles.gridLine, { top: step.y }]}
        />
      ))}

      {/* SVG */}
      <Svg width={graphWidth} height={GRAPH_HEIGHT}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accentColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={accentColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

        {linePath ? (
          <Path d={linePath} fill="none" stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />
        ) : null}

        {points.map((pt, i) => (
          <Circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={pt.isToday ? 7 : 5}
            fill={accentColor}
            stroke="#FFFFFF"
            strokeWidth={2}
          />
        ))}
      </Svg>

      {/* Labels score au-dessus — masqués quand value === 0 */}
      {points.map((pt, i) => (
        pt.value > 0 ? (
          <Text
            key={`score-${i}`}
            style={[
              chartStyles.scoreLabel,
              {
                left: pt.x - 20,
                top: pt.y - 22,
                color: pt.isToday ? accentColor : colors.text.secondary,
                fontWeight: pt.isToday ? '700' : '600',
              },
            ]}
          >
            {data[i].dataPointText || `${pt.value}${suffix}`}
          </Text>
        ) : null
      ))}

      {/* Labels x en dessous */}
      {points.map((pt, i) => (
        pt.label ? (
          <Text
            key={`label-${i}`}
            style={[
              chartStyles.xLabel,
              {
                left: pt.x - 20,
                top: GRAPH_HEIGHT + 4,
                color: pt.isToday ? accentColor : colors.text.muted,
                fontWeight: pt.isToday ? '700' : '500',
              },
            ]}
          >
            {pt.label}
          </Text>
        ) : null
      ))}
    </View>
  );

  return (
    <View style={chartStyles.container}>
      {/* Axe Y — toujours fixe */}
      <View style={chartStyles.yAxis}>
        {ySteps.map((step) => (
          <View key={step.val} style={[chartStyles.yLabel, { top: step.y - 6 }]}>
            <Text style={chartStyles.yLabelText}>{step.label}</Text>
          </View>
        ))}
      </View>

      {/* Zone graphique — scrollable ou non */}
      {scrollable ? (
        <ScrollView
          ref={(ref) => {
            if (ref) setTimeout(() => ref.scrollToEnd({ animated: false }), 50);
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={chartStyles.graphArea}
          contentContainerStyle={{ width: graphWidth }}
        >
          {chartContent}
        </ScrollView>
      ) : (
        <View style={chartStyles.graphArea}>
          {chartContent}
        </View>
      )}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: GRAPH_HEIGHT + 28,
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    position: 'relative',
  },
  yLabel: {
    position: 'absolute',
    right: 4,
  },
  yLabelText: {
    fontSize: 10,
    color: colors.text.muted,
  },
  graphArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  scoreLabel: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    fontSize: 10,
  },
  xLabel: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    fontSize: 10,
  },
});

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
