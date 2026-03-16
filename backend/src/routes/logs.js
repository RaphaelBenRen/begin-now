const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { updateStreak, checkBadges } = require('../lib/gamification');

const router = express.Router();
router.use(authMiddleware);

// GET /logs/today — logs du jour
router.get('/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('log_date', today);

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
});

// POST /logs — créer ou mettre à jour un log
router.post('/', async (req, res) => {
  const { objective_id, status, value, note } = req.body;

  if (!objective_id || !status) {
    return res.status(400).json({ message: 'objective_id et status requis.' });
  }
  if (!['done', 'failed', 'skipped'].includes(status)) {
    return res.status(400).json({ message: 'Status invalide.' });
  }

  // Vérifier que l'objectif appartient au user
  const { data: objective } = await supabase
    .from('objectives')
    .select('id, type, user_id')
    .eq('id', objective_id)
    .eq('user_id', req.user.id)
    .single();

  if (!objective) {
    return res.status(404).json({ message: 'Objectif introuvable.' });
  }

  const today = new Date().toISOString().split('T')[0];

  // Upsert le log du jour
  const { data: log, error } = await supabase
    .from('daily_logs')
    .upsert({
      objective_id,
      user_id: req.user.id,
      log_date: today,
      status,
      value: objective.type === 'quantifiable' && value != null ? value : null,
      note: note || null,
    }, { onConflict: 'objective_id,log_date' })
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });

  // Mettre à jour la streak et vérifier les badges
  const streakResult = await updateStreak(objective_id, req.user.id, status, today);
  const newBadges = await checkBadges(objective_id, req.user.id, streakResult);

  return res.json({ log, streak: streakResult, newBadges });
});

// GET /logs/history — historique avec filtres
router.get('/history', async (req, res) => {
  const { objective_id, from, to } = req.query;

  let query = supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', req.user.id)
    .order('log_date', { ascending: false });

  if (objective_id) query = query.eq('objective_id', objective_id);
  if (from) query = query.gte('log_date', from);
  if (to) query = query.lte('log_date', to);

  const { data, error } = await query;

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
});

module.exports = router;
