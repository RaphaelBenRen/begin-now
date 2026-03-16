import {
  View, Text, Modal, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { spacing, typography } from '../../constants/theme';

const STATUS_CONFIG = {
  pending:   { color: '#fdcb6e',              bg: 'rgba(253,203,110,0.15)', label: 'En attente',  emoji: '⏳' },
  accepted:  { color: '#00b894',              bg: 'rgba(0,184,148,0.15)',   label: 'Accepté',     emoji: '✅' },
  declined:  { color: '#ff7675',              bg: 'rgba(255,118,117,0.15)', label: 'Refusé',      emoji: '❌' },
  active:    { color: '#3b82f6',              bg: 'rgba(59,130,246,0.15)',  label: 'En cours',    emoji: '🔥' },
  completed: { color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.1)', label: 'Terminé',     emoji: '🏁' },
};

export default function DuelDetailModal({
  visible, onClose, duel, currentUserId,
  onAccept, onDecline, isActioning,
}) {
  if (!duel) return null;

  const isChallenger = duel.challenger_id === currentUserId;
  const isPendingForMe = !isChallenger && duel.status === 'pending';
  const status = STATUS_CONFIG[duel.status] || STATUS_CONFIG.pending;

  const challenger = duel.challenger;
  const challenged = duel.challenged;

  // Calcul jours restants
  let daysInfo = null;
  if (duel.end_date) {
    const diff = differenceInDays(parseISO(duel.end_date), new Date());
    if (diff > 0) daysInfo = `${diff} jour${diff > 1 ? 's' : ''} restant${diff > 1 ? 's' : ''}`;
    else if (diff === 0) daysInfo = 'Dernier jour !';
    else daysInfo = 'Terminé';
  }

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
          <Text style={styles.headerTitle}>Détail du défi</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Icône + titre */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Text style={styles.heroIcon}>{duel.icon}</Text>
            </View>
            <Text style={styles.heroTitle}>{duel.title}</Text>
            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusPillText, { color: status.color }]}>
                {status.emoji}  {status.label}
              </Text>
            </View>
          </View>

          {/* VS Card */}
          <View style={styles.vsCard}>
            <PlayerChip
              username={challenger?.username}
              label="Challenger"
              color="#3b82f6"
            />
            <View style={styles.vsCenter}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <PlayerChip
              username={challenged?.username}
              label="Challengé"
              color="#fdcb6e"
              alignRight
            />
          </View>

          {/* Infos */}
          <View style={styles.infoSection}>
            {/* Dates */}
            {(duel.start_date || duel.end_date) && (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>📅  Période</Text>
                <View style={styles.datesRow}>
                  {duel.start_date && (
                    <View style={styles.dateBlock}>
                      <Text style={styles.dateLabel}>Début</Text>
                      <Text style={styles.dateValue}>
                        {format(parseISO(duel.start_date), 'd MMM yyyy', { locale: fr })}
                      </Text>
                    </View>
                  )}
                  {duel.start_date && duel.end_date && (
                    <Text style={styles.dateSeparator}>→</Text>
                  )}
                  {duel.end_date && (
                    <View style={styles.dateBlock}>
                      <Text style={styles.dateLabel}>Fin</Text>
                      <Text style={styles.dateValue}>
                        {format(parseISO(duel.end_date), 'd MMM yyyy', { locale: fr })}
                      </Text>
                    </View>
                  )}
                </View>
                {daysInfo && (
                  <View style={styles.daysChip}>
                    <Text style={styles.daysChipText}>
                      ⏱  {daysInfo}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Message */}
            {duel.description && (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>💬  Message</Text>
                <Text style={styles.descText}>"{duel.description}"</Text>
                <Text style={styles.descAuthor}>— {challenger?.username}</Text>
              </View>
            )}

            {/* Contexte selon statut */}
            {duel.status === 'accepted' && (
              <View style={[styles.infoCard, { backgroundColor: 'rgba(0,184,148,0.15)', borderColor: '#00b894' }]}>
                <Text style={styles.infoCardTitle}>✅  Défi accepté !</Text>
                <Text style={styles.contextText}>
                  Ajoute "{duel.title}" à ton dashboard et coche-le chaque jour.
                  Ton ami verra ta progression sur ton profil.
                </Text>
              </View>
            )}

            {isPendingForMe && (
              <View style={[styles.infoCard, { backgroundColor: 'rgba(253,203,110,0.15)', borderColor: '#fdcb6e' }]}>
                <Text style={styles.infoCardTitle}>⏳  Tu as été défié !</Text>
                <Text style={styles.contextText}>
                  {challenger?.username} te lance un défi. Accepte-le pour vous motiver ensemble !
                </Text>
              </View>
            )}

            {duel.status === 'declined' && (
              <View style={[styles.infoCard, { backgroundColor: 'rgba(255,118,117,0.15)', borderColor: '#ff7675' }]}>
                <Text style={styles.contextText}>Ce défi a été refusé.</Text>
              </View>
            )}

            {/* Date de création */}
            <Text style={styles.createdAt}>
              Proposé le {format(parseISO(duel.created_at), 'd MMMM yyyy', { locale: fr })}
            </Text>
          </View>

          {/* Actions si défi reçu en attente */}
          {isPendingForMe && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.acceptBtn, isActioning && { opacity: 0.6 }]}
                onPress={onAccept}
                disabled={isActioning}
              >
                {isActioning
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.acceptBtnText}>✓  Accepter le défi</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineBtn, isActioning && { opacity: 0.6 }]}
                onPress={onDecline}
                disabled={isActioning}
              >
                <Text style={styles.declineBtnText}>✗  Refuser</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PlayerChip({ username, label, color, alignRight = false }) {
  return (
    <View style={[styles.playerChip, alignRight && styles.playerChipRight]}>
      <View style={[styles.playerAvatar, { backgroundColor: color + '20' }]}>
        <Text style={[styles.playerAvatarText, { color }]}>
          {username?.[0]?.toUpperCase()}
        </Text>
      </View>
      <View style={alignRight ? { alignItems: 'flex-end' } : {}}>
        <Text style={styles.playerName}>{username}</Text>
        <Text style={[styles.playerLabel, { color }]}>{label}</Text>
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

  heroSection: {
    alignItems: 'center', paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg, gap: spacing.md,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroIcon: { fontSize: 40 },
  heroTitle: { ...typography.h2, color: '#ffffff', textAlign: 'center' },
  statusPill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  statusPillText: { ...typography.smallMedium },

  vsCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: 'rgba(15,25,50,0.95)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.md,
  },
  playerChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  playerChipRight: { flexDirection: 'row-reverse' },
  playerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  playerAvatarText: { fontSize: 18, fontWeight: '700' },
  playerName: { ...typography.bodyMedium, color: '#ffffff' },
  playerLabel: { ...typography.caption },
  vsCenter: { paddingHorizontal: spacing.md },
  vsText: { ...typography.h3, color: 'rgba(255,255,255,0.4)' },

  infoSection: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.lg },
  infoCard: {
    backgroundColor: 'rgba(15,25,50,0.95)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.md, gap: spacing.sm,
  },
  infoCardTitle: { ...typography.bodyMedium, color: '#ffffff' },
  datesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateBlock: { gap: 2 },
  dateLabel: { ...typography.caption, color: 'rgba(255,255,255,0.4)' },
  dateValue: { ...typography.bodyMedium, color: '#ffffff' },
  dateSeparator: { ...typography.body, color: 'rgba(255,255,255,0.4)' },
  daysChip: {
    alignSelf: 'flex-start', paddingHorizontal: spacing.sm,
    paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  daysChipText: { ...typography.smallMedium, color: '#3b82f6' },
  descText: { ...typography.body, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
  descAuthor: { ...typography.caption, color: 'rgba(255,255,255,0.4)' },
  contextText: { ...typography.body, color: 'rgba(255,255,255,0.7)' },
  createdAt: {
    ...typography.caption, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', marginTop: spacing.sm,
  },

  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  acceptBtn: {
    backgroundColor: '#00b894', borderRadius: 20,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  acceptBtnText: { ...typography.bodyMedium, color: '#fff', fontWeight: 'bold' },
  declineBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: '#ff7675',
  },
  declineBtnText: { ...typography.bodyMedium, color: '#ff7675' },
});
