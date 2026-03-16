const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /stats?period=week&objective_id=xxx
router.get('/', async (req, res) => {
  const { period = 'week', objective_id } = req.query;
  const today = new Date();

  let from;
  switch (period) {
    case 'day':
      from = today.toISOString().split('T')[0];
      break;
    case 'week':
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6);
      from = weekAgo.toISOString().split('T')[0];
      break;
    case 'month':
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 29);
      from = monthAgo.toISOString().split('T')[0];
      break;
    case 'year':
      const yearAgo = new Date(today);
      yearAgo.setDate(today.getDate() - 364);
      from = yearAgo.toISOString().split('T')[0];
      break;
    default:
      from = new Date(today.setDate(today.getDate() - 6)).toISOString().split('T')[0];
  }

  const to = new Date().toISOString().split('T')[0];

  // Récupérer les objectifs actifs pour ne pas inclure les archivés
  const { data: activeObjectives } = await supabase
    .from('objectives')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('is_active', true);

  const activeIds = (activeObjectives || []).map((o) => o.id);

  let query = supabase
    .from('daily_logs')
    .select(`
      *,
      objective:objectives(id, title, type, unit, color, icon)
    `)
    .eq('user_id', req.user.id)
    .gte('log_date', from)
    .lte('log_date', to)
    .order('log_date', { ascending: true });

  if (objective_id) {
    query = query.eq('objective_id', objective_id);
  } else if (activeIds.length > 0) {
    query = query.in('objective_id', activeIds);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ message: error.message });

  // Calcul du taux de réussite
  const total = data.length;
  const done = data.filter((l) => l.status === 'done').length;
  const successRate = total > 0 ? Math.round((done / total) * 100) : 0;

  return res.json({ logs: data, summary: { total, done, successRate, period, from, to } });
});

// GET /stats/streaks — toutes les streaks du user
router.get('/streaks', async (req, res) => {
  const { data, error } = await supabase
    .from('streaks')
    .select('*, objective:objectives(title, icon, color, is_active)')
    .eq('user_id', req.user.id);

  // Ne retourner que les streaks d'objectifs actifs
  const activeStreaks = (data || []).filter((s) => s.objective?.is_active === true);

  if (error) return res.status(500).json({ message: error.message });
  return res.json(activeStreaks);
});

// GET /stats/badges — tous les badges du user
router.get('/badges', async (req, res) => {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badge:badges(*), objective:objectives(title, icon, color)')
    .eq('user_id', req.user.id)
    .order('earned_at', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
});

module.exports = router;
