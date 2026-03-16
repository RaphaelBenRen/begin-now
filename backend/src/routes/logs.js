const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { updateStreak, checkBadges } = require('../lib/gamification');
const { getLocalToday } = require('../lib/dateUtils');

const router = express.Router();
router.use(authMiddleware);

// GET /logs/today — logs du jour
router.get('/today', async (req, res) => {
  const today = getLocalToday();

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

  const today = getLocalToday();

  // Récupérer l'ancien log du jour (s'il existe) pour calculer le delta de points
  const { data: existingLog } = await supabase
    .from('daily_logs')
    .select('status')
    .eq('objective_id', objective_id)
    .eq('log_date', today)
    .single();

  const wasDone = existingLog?.status === 'done';
  const isDone = status === 'done';

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

  // Mettre à jour les points : +1 si done, -1 si on décoche un done
  const pointsDelta = (isDone && !wasDone) ? 1 : (!isDone && wasDone) ? -1 : 0;
  if (pointsDelta !== 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_points')
      .eq('id', req.user.id)
      .single();

    const newPoints = Math.max(0, (profile?.total_points || 0) + pointsDelta);
    await supabase
      .from('profiles')
      .update({ total_points: newPoints })
      .eq('id', req.user.id);
  }

  // Mettre à jour la streak et vérifier les badges
  const streakResult = await updateStreak(objective_id, req.user.id, status, today);
  const newBadges = await checkBadges(objective_id, req.user.id, streakResult);

  return res.json({ log, streak: streakResult, newBadges, pointsDelta });
});

// DELETE /logs/today/:objectiveId — supprimer le log du jour (décochage)
router.delete('/today/:objectiveId', async (req, res) => {
  const today = getLocalToday();
  const { objectiveId } = req.params;

  // Vérifier si le log existant était "done" pour retirer le point
  const { data: existingLog } = await supabase
    .from('daily_logs')
    .select('status')
    .eq('objective_id', objectiveId)
    .eq('user_id', req.user.id)
    .eq('log_date', today)
    .single();

  if (!existingLog) return res.json({ deleted: false, pointsDelta: 0 });

  const wasDone = existingLog.status === 'done';

  const { error } = await supabase
    .from('daily_logs')
    .delete()
    .eq('objective_id', objectiveId)
    .eq('user_id', req.user.id)
    .eq('log_date', today);

  if (error) return res.status(500).json({ message: error.message });

  // Retirer le point si c'était un "done"
  let pointsDelta = 0;
  if (wasDone) {
    pointsDelta = -1;
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_points')
      .eq('id', req.user.id)
      .single();

    const newPoints = Math.max(0, (profile?.total_points || 0) - 1);
    await supabase
      .from('profiles')
      .update({ total_points: newPoints })
      .eq('id', req.user.id);
  }

  // Recalculer la streak
  const streakResult = await updateStreak(objectiveId, req.user.id, 'deleted', today);

  return res.json({ deleted: true, pointsDelta, streak: streakResult });
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
