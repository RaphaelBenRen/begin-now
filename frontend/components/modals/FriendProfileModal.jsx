import { useEffect, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

export default function FriendProfileModal({ visible, onClose, friend, onChallenge, getFriendObjectives }) {
  const [objectives, setObjectives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && friend) {
      loadObjectives();
    }
  }, [visible, friend]);

  const loadObjectives = async () => {
    setIsLoading(true);
    try {
      const data = await getFriendObjectives(friend.id);
      setObjectives(data || []);
    } catch (err) {
      console.warn('[FriendProfile] objectives error:', err.response?.status, err.response?.data);
    }
    setIsLoading(false);
  };

  if (!friend) return null;

  const doneToday = objectives.filter((o) => o.today_log?.status === 'done').length;
  const totalPublic = objectives.length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Avatar + info */}
          <View style={styles.profileSection}>
            {friend.avatar_url ? (
              <Image source={{ uri: friend.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {friend.username?.[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.username}>{friend.username}</Text>
            <View style={styles.todayChip}>
              <Text style={styles.todayText}>
                Aujourd'hui : {doneToday}/{totalPublic} objectifs
              </Text>
            </View>
          </View>

          {/* Bouton défi */}
          <TouchableOpacity
            style={styles.challengeBtn}
            onPress={() => { onClose(); setTimeout(() => onChallenge(friend), 300); }}
          >
            <Text style={styles.challengeBtnText}>⚔️  Lancer un défi</Text>
          </TouchableOpacity>

          {/* Objectifs publics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Objectifs partagés
            </Text>

            {isLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
            ) : objectives.length === 0 ? (
              <Text style={styles.emptyText}>
                {friend.username} n'a pas d'objectifs partagés.
              </Text>
            ) : (
              objectives.map((obj) => (
                <FriendObjectiveRow key={obj.id} objective={obj} />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function FriendObjectiveRow({ objective }) {
  const log = objective.today_log;
  const streak = objective.streak;
  const isDone = log?.status === 'done';
  const isFailed = log?.status === 'failed';

  return (
    <View style={[styles.objCard, isDone && styles.objCardDone, isFailed && styles.objCardFailed]}>
      <View style={[styles.objIconBg, { backgroundColor: (objective.color || colors.accent) + '20' }]}>
        <Text style={{ fontSize: 20 }}>{objective.icon}</Text>
      </View>
      <View style={styles.objInfo}>
        <Text style={styles.objTitle}>{objective.title}</Text>
        {streak?.current_streak > 0 && (
          <Text style={styles.objStreak}>🔥 {streak.current_streak} jours</Text>
        )}
      </View>
      <View style={[
        styles.statusDot,
        isDone && styles.statusDotDone,
        isFailed && styles.statusDotFailed,
        !log && styles.statusDotEmpty,
      ]}>
        <Text style={styles.statusDotText}>
          {isDone ? '✓' : isFailed ? '✗' : '·'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  closeBtn: { ...typography.body, color: colors.text.secondary, width: 32 },
  headerTitle: { ...typography.h3, color: colors.text.primary },
  profileSection: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: colors.accent,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: colors.accent },
  username: { ...typography.h2, color: colors.text.primary },
  todayChip: {
    backgroundColor: colors.surface, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  todayText: { ...typography.small, color: colors.text.secondary },
  challengeBtn: {
    marginHorizontal: spacing.lg, backgroundColor: colors.accent,
    borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center',
    marginBottom: spacing.lg,
  },
  challengeBtnText: { ...typography.bodyMedium, color: '#fff' },
  section: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: { ...typography.bodyMedium, color: colors.text.secondary, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.text.muted, textAlign: 'center', marginTop: spacing.md },
  objCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm,
  },
  objCardDone: { borderColor: colors.success, backgroundColor: colors.successLight },
  objCardFailed: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  objIconBg: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  objInfo: { flex: 1 },
  objTitle: { ...typography.bodyMedium, color: colors.text.primary },
  objStreak: { ...typography.caption, color: colors.text.secondary },
  statusDot: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.border,
  },
  statusDotDone: { backgroundColor: colors.success },
  statusDotFailed: { backgroundColor: colors.danger },
  statusDotEmpty: { backgroundColor: colors.border },
  statusDotText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
