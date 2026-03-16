const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /profile — profil complet du user connecté
router.get('/', async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url, total_points, created_at')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ message: error.message });

  // Badges
  const { data: badges } = await supabase
    .from('user_badges')
    .select('*, badge:badges(*), objective:objectives(title, icon)')
    .eq('user_id', req.user.id)
    .order('earned_at', { ascending: false });

  return res.json({ ...profile, badges: badges || [] });
});

// PATCH /profile — modifier le profil
router.patch('/', async (req, res) => {
  const { username, avatar_url } = req.body;
  const updates = {};

  if (username) {
    // Vérifier unicité du username
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .neq('id', req.user.id)
      .single();

    if (existing) return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
    updates.username = username.trim();
  }

  if (avatar_url) updates.avatar_url = avatar_url;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
});

module.exports = router;
