import { useEffect, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { spacing, typography } from '../../constants/theme';

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
            <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="crosshair" size={16} color="#fff" />
              <Text style={styles.challengeBtnText}>Lancer un défi</Text>
            </View>
          </TouchableOpacity>

          {/* Objectifs publics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Objectifs partagés
            </Text>

            {isLoading ? (
              <ActivityIndicator color="#3b82f6" style={{ marginTop: spacing.lg }} />
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
      <View style={[styles.objIconBg, { backgroundColor: (objective.color || '#3b82f6') + '20' }]}>
        <Text style={{ fontSize: 20 }}>{objective.icon}</Text>
      </View>
      <View style={styles.objInfo}>
        <Text style={styles.objTitle}>{objective.title}</Text>
        {streak?.current_streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 12 }}>🔥</Text>
            <Text style={styles.objStreak}>{streak.current_streak} jours</Text>
          </View>
        )}
      </View>
      <View style={[
        styles.statusDot,
        isDone && styles.statusDotDone,
        isFailed && styles.statusDotFailed,
        !log && styles.statusDotEmpty,
      ]}>
        {isDone ? <Feather name="check" size={14} color="#fff" /> : isFailed ? <Feather name="x" size={14} color="#fff" /> : <Feather name="minus" size={14} color="#fff" />}
      </View>
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
  headerTitle: { ...typography.h3, color: '#ffffff' },
  profileSection: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(59,130,246,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: '#3b82f6',
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#3b82f6' },
  username: { ...typography.h2, color: '#ffffff' },
  todayChip: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 999,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  todayText: { ...typography.small, color: 'rgba(255,255,255,0.7)' },
  challengeBtn: {
    marginHorizontal: spacing.lg, backgroundColor: '#3b82f6',
    borderRadius: 20, paddingVertical: spacing.md, alignItems: 'center',
    marginBottom: spacing.lg,
  },
  challengeBtnText: { ...typography.bodyMedium, color: '#ffffff', fontWeight: '700' },
  section: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: { ...typography.bodyMedium, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.md },
  emptyText: { ...typography.body, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: spacing.md },
  objCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: 'rgba(15,25,50,0.95)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.md, marginBottom: spacing.sm,
  },
  objCardDone: { borderColor: '#00b894', backgroundColor: 'rgba(0,184,148,0.1)' },
  objCardFailed: { borderColor: '#ff7675', backgroundColor: 'rgba(255,118,117,0.1)' },
  objIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  objInfo: { flex: 1 },
  objTitle: { ...typography.bodyMedium, color: '#ffffff' },
  objStreak: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
  statusDot: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusDotDone: { backgroundColor: '#00b894' },
  statusDotFailed: { backgroundColor: '#ff7675' },
  statusDotEmpty: { backgroundColor: 'rgba(255,255,255,0.2)' },
  statusDotText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
