const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

const { getLocalToday } = require('../lib/dateUtils');

const router = express.Router();
router.use(authMiddleware);

// GET /stats?period=week&objective_id=xxx
router.get('/', async (req, res) => {
  const { period = 'week', objective_id } = req.query;
  const todayStr = getLocalToday();

  // Fonction pour soustraire N jours d'une date string YYYY-MM-DD
  const subDays = (dateStr, n) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - n);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  let from;
  switch (period) {
    case 'day':
      from = todayStr;
      break;
    case 'week':
      from = subDays(todayStr, 6);
      break;
    case 'month':
      from = subDays(todayStr, 29);
      break;
    case 'year':
      from = subDays(todayStr, 364);
      break;
    default:
      from = subDays(todayStr, 6);
  }

  const to = todayStr;

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
