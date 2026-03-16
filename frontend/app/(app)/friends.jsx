import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import useFriendsStore from '../../store/friendsStore';
import useDuelsStore from '../../store/duelsStore';
import useAuthStore from '../../store/authStore';
import FriendProfileModal from '../../components/modals/FriendProfileModal';
import DuelModal from '../../components/modals/DuelModal';
import DuelDetailModal from '../../components/modals/DuelDetailModal';
import DuelProgressModal from '../../components/modals/DuelProgressModal';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

const TABS = [
  { key: 'friends', label: 'Amis' },
  { key: 'requests', label: 'Demandes' },
  { key: 'duels', label: 'Défis' },
];

const STATUS_COLORS = {
  pending:   { bg: colors.warningLight,  text: colors.warning,  label: 'En attente' },
  accepted:  { bg: colors.successLight,  text: colors.success,  label: 'Accepté' },
  declined:  { bg: colors.dangerLight,   text: colors.danger,   label: 'Refusé' },
  active:    { bg: colors.accentLight,   text: colors.accent,   label: 'En cours' },
  completed: { bg: colors.border,        text: colors.text.secondary, label: 'Terminé' },
};

export default function FriendsScreen() {
  const { user } = useAuthStore();
  const { friends, requests, fetchFriends, fetchRequests, sendRequest, acceptRequest, declineRequest, getFriendObjectives } = useFriendsStore();
  const { duels, fetchDuels, proposeDuel, acceptDuel, declineDuel } = useDuelsStore();

  const [tab, setTab] = useState('friends');
  const [searchUsername, setSearchUsername] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [profileModal, setProfileModal] = useState(null);
  const [duelModal, setDuelModal] = useState(null);
  const [duelDetail, setDuelDetail] = useState(null);       // défi à afficher en détail
  const [duelProgress, setDuelProgress] = useState(null);   // défi accepté → vue progression
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
    fetchDuels();
  }, []);

  // ─── Ajouter un ami ───────────────────────────────────────────
  const handleSendRequest = async () => {
    if (!searchUsername.trim()) return;
    setIsSending(true);
    try {
      await sendRequest(searchUsername.trim());
      setSearchUsername('');
      Alert.alert('Demande envoyée !', `Ta demande d'amitié a été envoyée à ${searchUsername}.`);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Utilisateur introuvable.');
    } finally {
      setIsSending(false);
    }
  };

  // ─── Compteurs pour les badges ────────────────────────────────
  const pendingRequests = requests.filter((r) => true).length;
  const pendingDuels = duels.filter((d) => d.challenged_id === user?.id && d.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Amis</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const badge = t.key === 'requests' ? pendingRequests : t.key === 'duels' ? pendingDuels : 0;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
              {badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* ─── TAB AMIS ─── */}
        {tab === 'friends' && (
          <View style={styles.section}>
            {/* Recherche */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={searchUsername}
                onChangeText={setSearchUsername}
                placeholder="Rechercher par username..."
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
                onSubmitEditing={handleSendRequest}
              />
              <TouchableOpacity
                style={[styles.sendBtn, isSending && { opacity: 0.6 }]}
                onPress={handleSendRequest}
                disabled={isSending}
              >
                {isSending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.sendBtnText}>Ajouter</Text>
                }
              </TouchableOpacity>
            </View>

            {friends.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Aucun ami pour l'instant</Text>
                <Text style={styles.emptySubtitle}>
                  Recherche un ami par son username pour l'ajouter
                </Text>
              </View>
            ) : (
              friends.map((f) => (
                <FriendCard
                  key={f.friendship_id}
                  friend={f.friend}
                  onViewProfile={() => setProfileModal(f.friend)}
                  onChallenge={() => setDuelModal(f.friend)}
                />
              ))
            )}
          </View>
        )}

        {/* ─── TAB DEMANDES ─── */}
        {tab === 'requests' && (
          <View style={styles.section}>
            {requests.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Aucune demande en attente</Text>
              </View>
            ) : (
              requests.map((req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestAvatar}>
                    <Text style={styles.requestAvatarText}>
                      {req.requester.username[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{req.requester.username}</Text>
                    <Text style={styles.requestDate}>
                      {format(parseISO(req.created_at), 'd MMM', { locale: fr })}
                    </Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => acceptRequest(req.id)}
                    >
                      <Text style={styles.acceptBtnText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => declineRequest(req.id)}
                    >
                      <Text style={styles.declineBtnText}>✗</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── TAB DÉFIS ─── */}
        {tab === 'duels' && (
          <View style={styles.section}>
            {friends.length > 0 && (
              <Text style={styles.duelHint}>
                Ouvre le profil d'un ami pour lui lancer un défi
              </Text>
            )}
            {duels.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Aucun défi</Text>
                <Text style={styles.emptySubtitle}>
                  Défie tes amis pour vous motiver ensemble !
                </Text>
              </View>
            ) : (
              duels.map((duel) => (
                <DuelCard
                  key={duel.id}
                  duel={duel}
                  currentUserId={user?.id}
                  onPress={() => {
                    if (['accepted', 'active', 'completed'].includes(duel.status)) {
                      setDuelProgress(duel);
                    } else {
                      setDuelDetail(duel);
                    }
                  }}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <FriendProfileModal
        visible={!!profileModal}
        friend={profileModal}
        onClose={() => setProfileModal(null)}
        onChallenge={(f) => setDuelModal(f)}
        getFriendObjectives={getFriendObjectives}
      />
      <DuelModal
        visible={!!duelModal}
        friend={duelModal}
        onClose={() => setDuelModal(null)}
        onSubmit={proposeDuel}
      />
      <DuelDetailModal
        visible={!!duelDetail}
        duel={duelDetail}
        currentUserId={user?.id}
        isActioning={isActioning}
        onClose={() => setDuelDetail(null)}
        onAccept={async () => {
          setIsActioning(true);
          await acceptDuel(duelDetail.id);
          setDuelDetail(null);
          await fetchDuels();
          setIsActioning(false);
        }}
        onDecline={async () => {
          setIsActioning(true);
          await declineDuel(duelDetail.id);
          setDuelDetail((prev) => prev ? { ...prev, status: 'declined' } : null);
          setIsActioning(false);
        }}
      />
      <DuelProgressModal
        visible={!!duelProgress}
        duel={duelProgress}
        currentUserId={user?.id}
        onClose={() => setDuelProgress(null)}
      />
    </SafeAreaView>
  );
}

// ─── Composants internes ──────────────────────────────────────

function FriendCard({ friend, onViewProfile, onChallenge }) {
  return (
    <TouchableOpacity style={styles.friendCard} onPress={onViewProfile} activeOpacity={0.8}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendAvatarText}>
          {friend.username[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.username}</Text>
        <Text style={styles.friendPoints}>
          {friend.total_points ?? 0} pts
        </Text>
      </View>
      <TouchableOpacity style={styles.duelBtn} onPress={onChallenge}>
        <Text style={styles.duelBtnText}>⚔️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function DuelCard({ duel, currentUserId, onPress }) {
  const isChallenger = duel.challenger_id === currentUserId;
  const opponent = isChallenger ? duel.challenged : duel.challenger;
  const status = STATUS_COLORS[duel.status] || STATUS_COLORS.pending;
  const isPendingForMe = !isChallenger && duel.status === 'pending';

  return (
    <TouchableOpacity
      style={[styles.duelCard, { borderLeftColor: status.text, borderLeftWidth: 3 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.duelHeader}>
        <Text style={styles.duelIcon}>{duel.icon}</Text>
        <View style={styles.duelTitleBlock}>
          <Text style={styles.duelTitle}>{duel.title}</Text>
          <Text style={styles.duelOpponent}>
            {isChallenger ? '→ ' : '← '}{opponent?.username}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusChipText, { color: status.text }]}>{status.label}</Text>
          </View>
          {isPendingForMe && (
            <Text style={styles.tapHint}>Appuie pour répondre →</Text>
          )}
        </View>
      </View>

      {duel.description && (
        <Text style={styles.duelDesc} numberOfLines={1}>"{duel.description}"</Text>
      )}

      {(duel.start_date || duel.end_date) && (
        <View style={styles.duelDates}>
          {duel.start_date && (
            <Text style={styles.duelDateText}>
              {format(parseISO(duel.start_date), 'd MMM', { locale: fr })}
            </Text>
          )}
          {duel.start_date && duel.end_date && <Text style={styles.duelDateText}>→</Text>}
          {duel.end_date && (
            <Text style={styles.duelDateText}>
              {format(parseISO(duel.end_date), 'd MMM yyyy', { locale: fr })}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.h2, color: colors.text.primary },

  tabBar: {
    flexDirection: 'row', marginHorizontal: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 4,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  tabBtnActive: { backgroundColor: colors.accent },
  tabText: { ...typography.smallMedium, color: colors.text.secondary },
  tabTextActive: { color: '#fff' },
  badge: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  scroll: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, paddingBottom: 80, gap: spacing.sm },

  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  searchInput: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, color: colors.text.primary,
  },
  sendBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingHorizontal: spacing.md, justifyContent: 'center',
  },
  sendBtnText: { ...typography.bodyMedium, color: '#fff' },

  empty: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: colors.text.secondary },
  emptySubtitle: { ...typography.body, color: colors.text.muted, textAlign: 'center' },

  friendCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadows.sm,
  },
  friendAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center',
  },
  friendAvatarText: { fontSize: 18, fontWeight: '700', color: colors.accent },
  friendInfo: { flex: 1 },
  friendName: { ...typography.bodyMedium, color: colors.text.primary },
  friendPoints: { ...typography.caption, color: colors.text.muted },
  duelBtn: {
    width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  duelBtnText: { fontSize: 18 },

  requestCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  requestAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.warningLight, alignItems: 'center', justifyContent: 'center',
  },
  requestAvatarText: { fontSize: 18, fontWeight: '700', color: colors.warning },
  requestInfo: { flex: 1 },
  requestName: { ...typography.bodyMedium, color: colors.text.primary },
  requestDate: { ...typography.caption, color: colors.text.muted },
  requestActions: { flexDirection: 'row', gap: spacing.sm },
  acceptBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtnText: { fontSize: 16, color: colors.success, fontWeight: '700' },
  declineBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.dangerLight,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtnText: { fontSize: 16, color: colors.danger, fontWeight: '700' },

  duelHint: {
    ...typography.small, color: colors.text.muted, textAlign: 'center',
    marginBottom: spacing.sm,
  },
  duelCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadows.sm,
  },
  duelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  duelIcon: { fontSize: 26 },
  duelTitleBlock: { flex: 1 },
  duelTitle: { ...typography.bodyMedium, color: colors.text.primary },
  duelOpponent: { ...typography.caption, color: colors.text.secondary },
  statusChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full,
  },
  statusChipText: { ...typography.caption, fontWeight: '600' },
  duelDates: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs },
  duelDateText: { ...typography.caption, color: colors.text.muted },
  duelDesc: { ...typography.small, color: colors.text.secondary, fontStyle: 'italic', marginTop: 4 },
  tapHint: { ...typography.caption, color: colors.warning },
});
