const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { getLocalToday } = require('../lib/dateUtils');

const router = express.Router();
router.use(authMiddleware);

// GET /duels — tous les défis du user (envoyés + reçus)
router.get('/', async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('duels')
    .select(`
      *,
      challenger:profiles!duels_challenger_id_fkey(id, username, avatar_url),
      challenged:profiles!duels_challenged_id_fkey(id, username, avatar_url)
    `)
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
});

// POST /duels — proposer un défi
router.post('/', async (req, res) => {
  const { challenged_username, title, description, icon, start_date, end_date } = req.body;
  const challengerId = req.user.id;

  if (!challenged_username || !title) {
    return res.status(400).json({ message: 'Username et titre requis.' });
  }

  // Trouver le joueur challengé
  const { data: challenged } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', challenged_username.trim())
    .single();

  if (!challenged) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (challenged.id === challengerId) return res.status(400).json({ message: 'Tu ne peux pas te défier toi-même.' });

  // Vérifier qu'ils sont amis
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .or(
      `and(requester_id.eq.${challengerId},addressee_id.eq.${challenged.id}),and(requester_id.eq.${challenged.id},addressee_id.eq.${challengerId})`
    )
    .eq('status', 'accepted')
    .single();

  if (!friendship) return res.status(403).json({ message: 'Vous devez être amis pour vous défier.' });

  const { data: duel, error } = await supabase
    .from('duels')
    .insert({
      challenger_id: challengerId,
      challenged_id: challenged.id,
      title: title.trim(),
      description: description?.trim() || null,
      icon: icon || '⚔️',
      start_date: start_date || null,
      end_date: end_date || null,
      status: 'pending',
    })
    .select(`
      *,
      challenger:profiles!duels_challenger_id_fkey(id, username, avatar_url),
      challenged:profiles!duels_challenged_id_fkey(id, username, avatar_url)
    `)
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.status(201).json(duel);
});

// PATCH /duels/:id/accept
router.patch('/:id/accept', async (req, res) => {
  const { error } = await supabase
    .from('duels')
    .update({ status: 'accepted' })
    .eq('id', req.params.id)
    .eq('challenged_id', req.user.id)
    .eq('status', 'pending');

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: 'Défi accepté !' });
});

// PATCH /duels/:id/decline
router.patch('/:id/decline', async (req, res) => {
  const { error } = await supabase
    .from('duels')
    .update({ status: 'declined' })
    .eq('id', req.params.id)
    .eq('challenged_id', req.user.id)
    .eq('status', 'pending');

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: 'Défi refusé.' });
});

// GET /duels/:id/progress — progression complète des deux joueurs
router.get('/:id/progress', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  // Vérifier que l'user participe à ce duel
  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select(`
      *,
      challenger:profiles!duels_challenger_id_fkey(id, username, avatar_url),
      challenged:profiles!duels_challenged_id_fkey(id, username, avatar_url)
    `)
    .eq('id', id)
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .single();

  if (duelError || !duel) return res.status(404).json({ message: 'Défi introuvable.' });

  // Récupérer tous les logs des deux participants
  const { data: logs } = await supabase
    .from('duel_logs')
    .select('*')
    .eq('duel_id', id)
    .order('log_date', { ascending: true });

  const challengerLogs = (logs || []).filter((l) => l.user_id === duel.challenger_id);
  const challengedLogs = (logs || []).filter((l) => l.user_id === duel.challenged_id);

  // Calculer les stats de chaque joueur
  const calcStats = (playerLogs) => {
    const done = playerLogs.filter((l) => l.status === 'done').length;
    const total = playerLogs.length;
    // Streak courante
    let streak = 0;
    const sorted = [...playerLogs].sort((a, b) => b.log_date.localeCompare(a.log_date));
    for (const log of sorted) {
      if (log.status === 'done') streak++;
      else break;
    }
    return { done, total, streak };
  };

  return res.json({
    duel,
    challenger: { ...duel.challenger, logs: challengerLogs, stats: calcStats(challengerLogs) },
    challenged: { ...duel.challenged, logs: challengedLogs, stats: calcStats(challengedLogs) },
    myId: userId,
  });
});

// POST /duels/:id/log — cocher sa case pour aujourd'hui
router.post('/:id/log', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { status } = req.body; // 'done' | 'skipped'

  if (!['done', 'skipped'].includes(status)) {
    return res.status(400).json({ message: 'Status invalide.' });
  }

  // Vérifier participation + duel accepté
  const { data: duel } = await supabase
    .from('duels')
    .select('id, challenger_id, challenged_id, status')
    .eq('id', id)
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .single();

  if (!duel) return res.status(404).json({ message: 'Défi introuvable.' });
  if (!['accepted', 'active'].includes(duel.status)) {
    return res.status(400).json({ message: 'Le défi n\'est pas encore actif.' });
  }

  const today = getLocalToday();

  const { data: log, error } = await supabase
    .from('duel_logs')
    .upsert(
      { duel_id: id, user_id: userId, log_date: today, status },
      { onConflict: 'duel_id,user_id,log_date' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.json(log);
});

module.exports = router;
