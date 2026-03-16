const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /profile — profil complet du user connecté
router.get('/', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url, total_points, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) return res.status(500).json({ message: error?.message || 'Profil introuvable.' });

    // Badges
    const { data: badges } = await supabase
      .from('user_badges')
      .select('*, badge:badges(*), objective:objectives(title, icon)')
      .eq('user_id', req.user.id)
      .order('earned_at', { ascending: false });

    // Stats rapides — chaque requête isolée pour ne pas casser le tout
    let objectivesCount = 0;
    let friendsCount = 0;

    try {
      const { data: objs } = await supabase
        .from('objectives')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('is_active', true);
      objectivesCount = (objs || []).length;
    } catch (_) {}

    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('id')
        .or(`requester_id.eq.${req.user.id},addressee_id.eq.${req.user.id}`)
        .eq('status', 'accepted');
      friendsCount = (friendships || []).length;
    } catch (_) {}

    return res.json({
      ...profile,
      badges: badges || [],
      stats: {
        objectives: objectivesCount,
        friends: friendsCount,
        badges: (badges || []).length,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PATCH /profile — modifier pseudo et/ou avatar_url
router.patch('/', async (req, res) => {
  const { username, avatar_url } = req.body;
  const updates = {};

  if (username !== undefined) {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      return res.status(400).json({ message: 'Le pseudo doit contenir au moins 3 caractères.' });
    }
    // Vérifier unicité
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmed)
      .neq('id', req.user.id)
      .single();
    if (existing) return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
    updates.username = trimmed;
  }

  if (avatar_url !== undefined) {
    updates.avatar_url = avatar_url;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'Aucune modification fournie.' });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
});

// POST /profile/avatar — upload photo de profil (base64)
router.post('/avatar', async (req, res) => {
  const { base64, mimeType } = req.body;

  if (!base64 || !mimeType) {
    return res.status(400).json({ message: 'Image requise.' });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    return res.status(400).json({ message: 'Format non supporté (jpg, png, webp uniquement).' });
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    return res.status(400).json({ message: 'Image trop lourde (max 5 Mo).' });
  }

  const ext = mimeType.split('/')[1];
  const path = `${req.user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (uploadError) return res.status(500).json({ message: uploadError.message });

  const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);

  // Ajouter un cache-buster pour forcer le rechargement de l'image
  const avatar_url = `${publicData.publicUrl}?v=${Date.now()}`;

  // Mettre à jour le profil
  await supabase
    .from('profiles')
    .update({ avatar_url })
    .eq('id', req.user.id);

  return res.json({ avatar_url });
});

// PATCH /profile/password — changer le mot de passe
router.patch('/password', async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Mot de passe actuel et nouveau requis.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
  }

  // Vérifier le mot de passe actuel en tentant une connexion
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', req.user.id)
    .single();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: current_password,
  });

  if (signInError) {
    return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
  }

  // Mettre à jour via admin
  const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
    password: new_password,
  });

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: 'Mot de passe mis à jour.' });
});

// DELETE /profile — supprimer le compte
router.delete('/', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Mot de passe requis pour confirmer la suppression.' });
  }

  // Vérifier le mot de passe avant de supprimer
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', req.user.id)
    .single();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (signInError) {
    return res.status(401).json({ message: 'Mot de passe incorrect.' });
  }

  // Supprimer l'avatar du storage si présent
  try {
    await supabase.storage.from('avatars').remove([
      `${req.user.id}/avatar.jpg`,
      `${req.user.id}/avatar.png`,
      `${req.user.id}/avatar.webp`,
    ]);
  } catch (_) {}

  // Supprimer l'utilisateur (cascade sur profiles + toutes les données)
  const { error } = await supabase.auth.admin.deleteUser(req.user.id);
  if (error) return res.status(500).json({ message: error.message });

  return res.json({ message: 'Compte supprimé.' });
});

module.exports = router;
