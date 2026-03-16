import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Modal, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO, eachDayOfInterval, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { spacing, typography } from '../../constants/theme';
import useDuelsStore from '../../store/duelsStore';

export default function DuelProgressModal({ visible, onClose, duel, currentUserId }) {
  const { fetchDuelProgress, logDuel } = useDuelsStore();
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!duel) return;
    setIsLoading(true);
    try {
      const data = await fetchDuelProgress(duel.id);
      setProgress(data);
    } catch (_) {}
    setIsLoading(false);
  }, [duel]);

  const onRefresh = useCallback(async () => {
    if (!duel) return;
    setRefreshing(true);
    try {
      const data = await fetchDuelProgress(duel.id);
      setProgress(data);
    } catch (_) {}
    setRefreshing(false);
  }, [duel]);

  useEffect(() => {
    if (visible && duel) load();
  }, [visible, duel]);

  const handleLog = async (status) => {
    setIsLogging(true);
    try {
      await logDuel(duel.id, status);
      await onRefresh();
    } catch (_) {}
    setIsLogging(false);
  };

  if (!duel) return null;

  const today = new Date().toISOString().split('T')[0];
  const myData = progress
    ? (progress.myId === progress.challenger.id ? progress.challenger : progress.challenged)
    : null;
  const opponentData = progress
    ? (progress.myId === progress.challenger.id ? progress.challenged : progress.challenger)
    : null;

  const myTodayLog = myData?.logs?.find((l) => l.log_date === today);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{duel.icon} {duel.title}</Text>
          <View style={{ width: 32 }} />
        </View>

        {isLoading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: spacing.xxl }} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          >
            {/* VS Header */}
            <View style={styles.vsRow}>
              <PlayerStats player={myData} label="Moi" color="#3b82f6" />
              <View style={styles.vsCenter}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              <PlayerStats player={opponentData} label={opponentData?.username} color="#fdcb6e" alignRight />
            </View>

            {/* Action du jour */}
            {!myTodayLog ? (
              <View style={styles.todaySection}>
                <Text style={styles.todayTitle}>Aujourd'hui</Text>
                <View style={styles.todayButtons}>
                  <TouchableOpacity
                    style={[styles.doneBtn, isLogging && { opacity: 0.6 }]}
                    onPress={() => handleLog('done')}
                    disabled={isLogging}
                  >
                    {isLogging
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.doneBtnText}>✓  C'est fait !</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.skipBtn, isLogging && { opacity: 0.6 }]}
                    onPress={() => handleLog('skipped')}
                    disabled={isLogging}
                  >
                    <Text style={styles.skipBtnText}>✗  Raté</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.todayDone}>
                <Text style={styles.todayDoneText}>
                  {myTodayLog.status === 'done' ? '✅  Tu as coché aujourd\'hui !' : '❌  Raté pour aujourd\'hui'}
                </Text>
                <Text style={styles.todayDoneHint}>Tire vers le bas pour actualiser</Text>
              </View>
            )}

            {/* Grilles côte à côte */}
            {progress && (
              <View style={styles.gridsSection}>
                <Text style={styles.gridsSectionTitle}>Historique — 21 derniers jours</Text>
                <View style={styles.gridsRow}>
                  <CalendarGrid logs={myData?.logs || []} color="#3b82f6" />
                  <View style={styles.gridsDivider} />
                  <CalendarGrid logs={opponentData?.logs || []} color="#fdcb6e" />
                </View>
              </View>
            )}

            {/* Stats comparées */}
            {progress && (
              <View style={styles.statsSection}>
                <Text style={styles.statsSectionTitle}>Comparaison</Text>
                <StatRow
                  label="Jours réussis"
                  myValue={myData?.stats?.done ?? 0}
                  oppValue={opponentData?.stats?.done ?? 0}
                  higherIsBetter
                />
                <StatRow
                  label="Streak actuel"
                  myValue={myData?.stats?.streak ?? 0}
                  oppValue={opponentData?.stats?.streak ?? 0}
                  suffix=" 🔥"
                  higherIsBetter
                />
                <StatRow
                  label="Taux de réussite"
                  myValue={myData?.stats?.total > 0 ? Math.round((myData.stats.done / myData.stats.total) * 100) : 0}
                  oppValue={opponentData?.stats?.total > 0 ? Math.round((opponentData.stats.done / opponentData.stats.total) * 100) : 0}
                  suffix="%"
                  higherIsBetter
                />
              </View>
            )}

            <View style={{ height: spacing.xxl }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function PlayerStats({ player, label, color, alignRight = false }) {
  return (
    <View style={[styles.playerStats, alignRight && styles.playerStatsRight]}>
      <View style={[styles.playerAvatar, { backgroundColor: color + '20' }]}>
        <Text style={[styles.playerAvatarText, { color }]}>
          {player?.username?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <Text style={styles.playerName}>{player?.username ?? label}</Text>
      <Text style={[styles.playerScore, { color }]}>
        {player?.stats?.done ?? 0} /{player?.stats?.total ?? 0}
      </Text>
    </View>
  );
}

function CalendarGrid({ logs, color }) {
  const today = new Date();
  const days = eachDayOfInterval({ start: subDays(today, 20), end: today });
  const logMap = {};
  (logs || []).forEach((l) => { logMap[l.log_date] = l.status; });

  return (
    <View style={styles.calendarGrid}>
      {days.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const status = logMap[key];
        return (
          <View
            key={key}
            style={[
              styles.calDay,
              status === 'done' && { backgroundColor: 'rgba(0,184,148,0.3)' },
              status === 'skipped' && styles.calDaySkipped,
              !status && styles.calDayEmpty,
            ]}
          />
        );
      })}
    </View>
  );
}

function StatRow({ label, myValue, oppValue, suffix = '', higherIsBetter = true }) {
  const myWins = higherIsBetter ? myValue > oppValue : myValue < oppValue;
  const oppWins = higherIsBetter ? oppValue > myValue : oppValue < myValue;

  return (
    <View style={styles.statRow}>
      <Text style={[styles.statValue, myWins && styles.statWinner]}>
        {myValue}{suffix}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, styles.statValueRight, oppWins && styles.statWinner]}>
        {oppValue}{suffix}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  closeBtn: { ...typography.body, color: 'rgba(255,255,255,0.7)', width: 32 },
  headerTitle: { ...typography.h3, color: '#ffffff', flex: 1, textAlign: 'center' },

  vsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: 'rgba(15,25,50,0.95)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.md,
  },
  playerStats: { flex: 1, alignItems: 'flex-start', gap: 4 },
  playerStatsRight: { alignItems: 'flex-end' },
  playerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  playerAvatarText: { fontSize: 20, fontWeight: '700' },
  playerName: { ...typography.bodyMedium, color: '#ffffff' },
  playerScore: { ...typography.caption },
  vsCenter: { paddingHorizontal: spacing.md },
  vsText: { ...typography.h3, color: 'rgba(255,255,255,0.4)' },

  todaySection: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
  },
  todayTitle: { ...typography.bodyMedium, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.sm },
  todayButtons: { flexDirection: 'row', gap: spacing.sm },
  doneBtn: {
    flex: 1, backgroundColor: '#00b894', borderRadius: 20,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  doneBtnText: { ...typography.bodyMedium, color: '#fff', fontWeight: 'bold' },
  skipBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: '#ff7675',
  },
  skipBtnText: { ...typography.bodyMedium, color: '#ff7675' },

  todayDone: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: 'rgba(15,25,50,0.95)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.md, alignItems: 'center', gap: 4,
  },
  todayDoneText: { ...typography.bodyMedium, color: '#ffffff' },
  todayDoneHint: { ...typography.caption, color: 'rgba(255,255,255,0.4)' },

  gridsSection: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: 'rgba(15,25,50,0.95)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.md,
  },
  gridsSectionTitle: { ...typography.bodyMedium, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.md },
  gridsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  gridsDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: spacing.sm },
  calendarGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calDay: { width: 14, height: 14, borderRadius: 3 },
  calDaySkipped: { backgroundColor: 'rgba(255,118,117,0.3)' },
  calDayEmpty: { backgroundColor: 'rgba(255,255,255,0.05)' },

  statsSection: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: 'rgba(15,25,50,0.95)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.md,
  },
  statsSectionTitle: { ...typography.bodyMedium, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.md },
  statRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: { flex: 1, ...typography.body, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  statValue: { width: 60, ...typography.bodyMedium, color: '#ffffff', textAlign: 'left' },
  statValueRight: { textAlign: 'right' },
  statWinner: { color: '#3b82f6' },
});
