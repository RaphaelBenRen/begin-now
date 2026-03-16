const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function generateTokens(payload) {
  const access_token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refresh_token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { access_token, refresh_token };
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  // Vérifier si le username est déjà pris
  const { data: existingUsername } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.trim())
    .single();

  if (existingUsername) {
    return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
  }

  // Créer l'utilisateur dans Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }
    return res.status(400).json({ message: authError.message });
  }

  const userId = authData.user.id;

  // Créer le profil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      total_points: 0,
    })
    .select()
    .single();

  if (profileError) {
    // Rollback: supprimer l'utilisateur auth si le profil échoue
    await supabase.auth.admin.deleteUser(userId);
    return res.status(500).json({ message: 'Erreur lors de la création du profil.' });
  }

  const tokens = generateTokens({ id: userId, email: profile.email, username: profile.username });

  return res.status(201).json({
    user: { id: profile.id, email: profile.email, username: profile.username, total_points: 0 },
    ...tokens,
  });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }

  // Authentifier via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (authError) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
  }

  // Récupérer le profil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ message: 'Profil introuvable.' });
  }

  const tokens = generateTokens({ id: profile.id, email: profile.email, username: profile.username });

  return res.json({
    user: { id: profile.id, email: profile.email, username: profile.username, total_points: profile.total_points },
    ...tokens,
  });
});

// GET /auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, username, total_points, avatar_url, created_at')
    .eq('id', req.user.id)
    .single();

  if (error || !profile) {
    return res.status(404).json({ message: 'Utilisateur introuvable.' });
  }

  return res.json({ user: profile });
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ message: 'Refresh token requis.' });
  }

  try {
    const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);
    const tokens = generateTokens({ id: decoded.id, email: decoded.email, username: decoded.username });
    return res.json(tokens);
  } catch {
    return res.status(401).json({ message: 'Refresh token invalide ou expiré.' });
  }
});

module.exports = router;
