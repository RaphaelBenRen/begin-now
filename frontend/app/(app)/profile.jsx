import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Alert, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import useAuthStore from '../../store/authStore';
import useObjectivesStore from '../../store/objectivesStore';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, logout, fetchFullProfile, updateUsername, uploadAvatar, changePassword, deleteAccount } = useAuthStore();
  const { objectives, fetchObjectives, updateObjective } = useObjectivesStore();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Modals
  const [usernameModal, setUsernameModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const data = await fetchFullProfile();
      setProfile(data);
    } catch (_) {}
    setIsLoadingProfile(false);
  }, []);

  useEffect(() => {
    loadProfile();
    fetchObjectives();
  }, []);

  // ─── Changer la photo ─────────────────────────────────────
  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorise l\'accès à ta galerie dans les réglages.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';

    try {
      await uploadAvatar(asset.base64, mimeType);
      await loadProfile();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible d\'envoyer la photo.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Tu veux vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes tes données seront supprimées définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirme ton mot de passe',
              'Entre ton mot de passe pour confirmer la suppression.',
              async (password) => {
                if (!password) return;
                try {
                  await deleteAccount(password);
                } catch (err) {
                  Alert.alert('Erreur', err.response?.data?.message || 'Suppression impossible.');
                }
              },
              'secure-text'
            );
          },
        },
      ]
    );
  };

  const avatarUrl = profile?.avatar_url || user?.avatar_url;
  const memberSince = profile?.created_at
    ? format(parseISO(profile.created_at), 'MMMM yyyy', { locale: fr })
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ─── Avatar + identité ─── */}
        <View style={styles.heroSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} activeOpacity={0.85}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user?.username?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {memberSince && (
            <Text style={styles.memberSince}>Membre depuis {memberSince}</Text>
          )}
        </View>

        {/* ─── Stats ─── */}
        {isLoadingProfile ? (
          <ActivityIndicator color={colors.accent} style={{ marginBottom: spacing.lg }} />
        ) : profile ? (
          <View style={styles.statsRow}>
            <StatCard value={profile.total_points} label="Points" color={colors.accent} />
            <StatCard value={profile.stats?.badges ?? 0} label="Badges" color={colors.warning} />
            <StatCard value={profile.stats?.objectives ?? 0} label="Objectifs" color={colors.success} />
            <StatCard value={profile.stats?.friends ?? 0} label="Amis" color={colors.text.secondary} />
          </View>
        ) : null}

        {/* ─── Badges ─── */}
        {profile?.badges?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes badges</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
              {profile.badges.map((ub) => (
                <View key={ub.id} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>{ub.badge.icon}</Text>
                  <Text style={styles.badgeName}>{ub.badge.name}</Text>
                  <Text style={styles.badgeObj} numberOfLines={1}>{ub.objective?.title}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── Objectifs partagés ─── */}
        {objectives.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objectifs partagés</Text>
            <Text style={styles.sharingHint}>
              Les objectifs activés sont visibles par tes amis.
            </Text>
            <View style={styles.settingsCard}>
              {objectives.map((obj, index) => (
                <View key={obj.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.shareRow}>
                    <Text style={styles.shareIcon}>{obj.icon}</Text>
                    <Text style={styles.shareLabel} numberOfLines={1}>{obj.title}</Text>
                    <Switch
                      value={obj.is_public !== false}
                      onValueChange={async (val) => {
                        try {
                          await updateObjective(obj.id, { is_public: val });
                        } catch (_) {}
                      }}
                      trackColor={{ false: colors.border, true: colors.accent + '60' }}
                      thumbColor={obj.is_public !== false ? colors.accent : colors.text.muted}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── Mon compte ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon compte</Text>
          <View style={styles.settingsCard}>
            <SettingsRow
              icon="✏️"
              label="Modifier le pseudo"
              value={`@${user?.username}`}
              onPress={() => setUsernameModal(true)}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="🔒"
              label="Changer le mot de passe"
              onPress={() => setPasswordModal(true)}
            />
          </View>
        </View>

        {/* ─── Application ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application</Text>
          <View style={styles.settingsCard}>
            <SettingsRow icon="📱" label="Version" value="1.0.0" />
          </View>
        </View>

        {/* ─── Actions compte ─── */}
        <View style={[styles.section, { gap: spacing.sm }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>Supprimer mon compte</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* ─── Modal : modifier le pseudo ─── */}
      <EditUsernameModal
        visible={usernameModal}
        currentUsername={user?.username}
        onClose={() => setUsernameModal(false)}
        onSave={async (newUsername) => {
          await updateUsername(newUsername);
          setUsernameModal(false);
          await loadProfile();
        }}
      />

      {/* ─── Modal : changer le mot de passe ─── */}
      <ChangePasswordModal
        visible={passwordModal}
        onClose={() => setPasswordModal(false)}
        onSave={changePassword}
      />
    </SafeAreaView>
  );
}

// ─── Composants internes ─────────────────────────────────────

function StatCard({ value, label, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.settingsIcon}>{icon}</Text>
      <Text style={styles.settingsLabel}>{label}</Text>
      <View style={styles.settingsRight}>
        {value && <Text style={styles.settingsValue} numberOfLines={1}>{value}</Text>}
        {onPress && <Text style={styles.settingsChevron}>›</Text>}
      </View>
    </TouchableOpacity>
  );
}

function EditUsernameModal({ visible, currentUsername, onClose, onSave }) {
  const [value, setValue] = useState(currentUsername ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) { setValue(currentUsername ?? ''); setError(''); }
  }, [visible]);

  const handleSave = async () => {
    if (value.trim().length < 3) { setError('Minimum 3 caractères.'); return; }
    setIsLoading(true);
    try {
      await onSave(value.trim());
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur.');
    }
    setIsLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modalStyles.cancel}>Annuler</Text>
          </TouchableOpacity>
          <Text style={modalStyles.title}>Modifier le pseudo</Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color={colors.accent} />
              : <Text style={modalStyles.save}>Enregistrer</Text>
            }
          </TouchableOpacity>
        </View>
        <View style={modalStyles.body}>
          <Text style={modalStyles.label}>Nouveau pseudo</Text>
          <TextInput
            style={[modalStyles.input, error && modalStyles.inputError]}
            value={value}
            onChangeText={(t) => { setValue(t); setError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            maxLength={30}
          />
          {error ? <Text style={modalStyles.errorText}>{error}</Text> : null}
          <Text style={modalStyles.hint}>
            Ton pseudo est visible par tous tes amis. Il doit être unique.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ChangePasswordModal({ visible, onClose, onSave }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (visible) { setCurrent(''); setNext(''); setConfirm(''); setError(''); setSuccess(false); }
  }, [visible]);

  const handleSave = async () => {
    if (!current || !next || !confirm) { setError('Tous les champs sont requis.'); return; }
    if (next.length < 8) { setError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    if (next !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await onSave(current, next);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur.');
    }
    setIsLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modalStyles.cancel}>Annuler</Text>
          </TouchableOpacity>
          <Text style={modalStyles.title}>Mot de passe</Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading || success}>
            {isLoading
              ? <ActivityIndicator color={colors.accent} />
              : <Text style={[modalStyles.save, success && { color: colors.success }]}>
                  {success ? '✓ Fait' : 'Enregistrer'}
                </Text>
            }
          </TouchableOpacity>
        </View>
        <View style={modalStyles.body}>
          <Text style={modalStyles.label}>Mot de passe actuel</Text>
          <TextInput
            style={modalStyles.input}
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoFocus
          />
          <Text style={[modalStyles.label, { marginTop: spacing.md }]}>Nouveau mot de passe</Text>
          <TextInput
            style={modalStyles.input}
            value={next}
            onChangeText={setNext}
            secureTextEntry
          />
          <Text style={[modalStyles.label, { marginTop: spacing.md }]}>Confirmer le nouveau</Text>
          <TextInput
            style={[modalStyles.input, error && next !== confirm && modalStyles.inputError]}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />
          {error ? <Text style={modalStyles.errorText}>{error}</Text> : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  avatarWrapper: { position: 'relative', marginBottom: spacing.sm },
  avatarImage: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: colors.accent,
  },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.accent,
  },
  avatarInitial: { fontSize: 38, fontWeight: '700', color: colors.accent },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraIcon: { fontSize: 14 },
  username: { ...typography.h2, color: colors.text.primary },
  email: { ...typography.body, color: colors.text.secondary },
  memberSince: { ...typography.caption, color: colors.text.muted },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    borderRightWidth: 1, borderRightColor: colors.border,
  },
  statValue: { ...typography.h3 },
  statLabel: { ...typography.caption, color: colors.text.muted, marginTop: 2 },

  section: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.smallMedium, color: colors.text.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  badgesScroll: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  badgeCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginRight: spacing.sm,
    alignItems: 'center', gap: 4, minWidth: 80, ...shadows.sm,
  },
  badgeIcon: { fontSize: 28 },
  badgeName: { ...typography.smallMedium, color: colors.text.primary, textAlign: 'center' },
  badgeObj: { ...typography.caption, color: colors.text.muted, textAlign: 'center', maxWidth: 80 },

  settingsCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.sm,
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  settingsIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  settingsLabel: { ...typography.body, color: colors.text.primary, flex: 1 },
  settingsRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  settingsValue: { ...typography.small, color: colors.text.muted, maxWidth: 120 },
  settingsChevron: { fontSize: 20, color: colors.text.muted, marginLeft: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 56 },
  sharingHint: {
    ...typography.small, color: colors.text.muted, marginBottom: spacing.sm,
  },
  shareRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  shareIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  shareLabel: { ...typography.body, color: colors.text.primary, flex: 1 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.surface,
    borderRadius: radius.md, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { ...typography.bodyMedium, color: colors.text.secondary },
  deleteBtn: {
    alignItems: 'center', paddingVertical: spacing.md,
  },
  deleteText: { ...typography.small, color: colors.danger },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cancel: { ...typography.body, color: colors.text.secondary },
  title: { ...typography.h3, color: colors.text.primary },
  save: { ...typography.bodyMedium, color: colors.accent },
  body: { padding: spacing.lg },
  label: { ...typography.smallMedium, color: colors.text.secondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, color: colors.text.primary,
  },
  inputError: { borderColor: colors.danger },
  errorText: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
  hint: { ...typography.small, color: colors.text.muted, marginTop: spacing.sm },
});
