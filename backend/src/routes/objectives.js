const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /objectives — liste des objectifs actifs du user
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('objectives')
    .select(`
      *,
      streak:streaks(current_streak, longest_streak, last_log_date)
    `)
    .eq('user_id', req.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ message: error.message });

  // Aplatir streak (Supabase retourne un array pour les joins one-to-many)
  const result = (data || []).map((obj) => ({
    ...obj,
    streak: Array.isArray(obj.streak) ? obj.streak[0] || null : obj.streak,
  }));

  return res.json(result);
});

// POST /objectives — créer un objectif
router.post('/', async (req, res) => {
  const {
    template_id, title, type, unit, target_value,
    positive_goal, start_date, end_date, is_public, color, icon,
  } = req.body;

  if (!title || !type) {
    return res.status(400).json({ message: 'Titre et type requis.' });
  }

  const { data: objective, error } = await supabase
    .from('objectives')
    .insert({
      user_id: req.user.id,
      template_id: template_id || null,
      title: title.trim(),
      type,
      unit: unit || null,
      target_value: target_value || null,
      positive_goal: positive_goal ?? true,
      start_date: start_date || null,
      end_date: end_date || null,
      is_active: true,
      is_public: is_public ?? true,
      color: color || '#2D5BE3',
      icon: icon || '⭐',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });

  // Créer une entrée streak vide
  await supabase.from('streaks').insert({
    objective_id: objective.id,
    user_id: req.user.id,
    current_streak: 0,
    longest_streak: 0,
  });

  return res.status(201).json(objective);
});

// PUT /objectives/:id — modifier un objectif
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, unit, target_value, positive_goal, start_date, end_date, is_public, color, icon } = req.body;

  const { data, error } = await supabase
    .from('objectives')
    .update({ title, unit, target_value, positive_goal, start_date, end_date, is_public, color, icon })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  if (!data) return res.status(404).json({ message: 'Objectif introuvable.' });

  return res.json(data);
});

// PATCH /objectives/:id/archive — archiver un objectif
router.patch('/:id/archive', async (req, res) => {
  const { error } = await supabase
    .from('objectives')
    .update({ is_active: false })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: 'Objectif archivé.' });
});

// GET /objectives/templates — objectifs prédéfinis
router.get('/templates', async (req, res) => {
  const { data, error } = await supabase
    .from('objective_templates')
    .select('*')
    .order('name');

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
});

module.exports = router;
