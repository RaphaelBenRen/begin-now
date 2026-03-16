import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
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
import GradientBackground from '../../components/ui/GradientBackground';
import { spacing, typography } from '../../constants/theme';

const TABS = [
  { key: 'friends', label: 'Amis' },
  { key: 'requests', label: 'Demandes' },
  { key: 'duels', label: 'Défis' },
];

const STATUS_COLORS = {
  pending:   { bg: 'rgba(253,203,110,0.2)', text: '#fdcb6e', label: 'En attente' },
  accepted:  { bg: 'rgba(0,184,148,0.2)',   text: '#00b894', label: 'Accepté' },
  declined:  { bg: 'rgba(255,118,117,0.2)', text: '#ff7675', label: 'Refusé' },
  active:    { bg: 'rgba(59,130,246,0.2)',   text: '#3b82f6', label: 'En cours' },
  completed: { bg: 'rgba(255,255,255,0.1)',  text: 'rgba(255,255,255,0.5)', label: 'Terminé' },
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
    <GradientBackground style={{ flex: 1 }}>
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
                  placeholderTextColor="rgba(255,255,255,0.35)"
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
                    {req.requester.avatar_url ? (
                      <Image source={{ uri: req.requester.avatar_url }} style={styles.friendAvatarImg} />
                    ) : (
                      <View style={styles.requestAvatar}>
                        <Text style={styles.requestAvatarText}>
                          {req.requester.username[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
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
    </GradientBackground>
  );
}

// ─── Composants internes ──────────────────────────────────────

function FriendCard({ friend, onViewProfile, onChallenge }) {
  return (
    <TouchableOpacity style={styles.friendCard} onPress={onViewProfile} activeOpacity={0.8}>
      {friend.avatar_url ? (
        <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatarImg} />
      ) : (
        <View style={styles.friendAvatar}>
          <Text style={styles.friendAvatarText}>
            {friend.username[0].toUpperCase()}
          </Text>
        </View>
      )}
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
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.h2, color: '#ffffff' },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 4,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: 16,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  tabBtnActive: { backgroundColor: '#3b82f6' },
  tabText: { ...typography.smallMedium, color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { color: '#ffffff' },
  badge: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#ff7675',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  scroll: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.sm },

  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: '#ffffff',
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  sendBtnText: { ...typography.bodyMedium, color: '#fff' },

  empty: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: '#ffffff' },
  emptySubtitle: { ...typography.body, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  friendCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: 'rgba(15,25,50,0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.md,
  },
  friendAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  friendAvatarImg: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: 'rgba(59,130,246,0.4)',
  },
  friendAvatarText: { fontSize: 18, fontWeight: '700', color: '#3b82f6' },
  friendInfo: { flex: 1 },
  friendName: { ...typography.bodyMedium, color: '#ffffff' },
  friendPoints: { ...typography.caption, color: 'rgba(255,255,255,0.4)' },
  duelBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  duelBtnText: { fontSize: 18 },

  requestCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: 'rgba(15,25,50,0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.md,
  },
  requestAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(253,203,110,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  requestAvatarText: { fontSize: 18, fontWeight: '700', color: '#fdcb6e' },
  requestInfo: { flex: 1 },
  requestName: { ...typography.bodyMedium, color: '#ffffff' },
  requestDate: { ...typography.caption, color: 'rgba(255,255,255,0.4)' },
  requestActions: { flexDirection: 'row', gap: spacing.sm },
  acceptBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,184,148,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtnText: { fontSize: 16, color: '#00b894', fontWeight: '700' },
  declineBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,118,117,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtnText: { fontSize: 16, color: '#ff7675', fontWeight: '700' },

  duelHint: {
    ...typography.small, color: 'rgba(255,255,255,0.4)', textAlign: 'center',
    marginBottom: spacing.sm,
  },
  duelCard: {
    backgroundColor: 'rgba(15,25,50,0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.md,
  },
  duelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  duelIcon: { fontSize: 26 },
  duelTitleBlock: { flex: 1 },
  duelTitle: { ...typography.bodyMedium, color: '#ffffff' },
  duelOpponent: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
  statusChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 999,
  },
  statusChipText: { ...typography.caption, fontWeight: '600' },
  duelDates: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs },
  duelDateText: { ...typography.caption, color: 'rgba(255,255,255,0.4)' },
  duelDesc: { ...typography.small, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginTop: 4 },
  tapHint: { ...typography.caption, color: '#fdcb6e' },
});
