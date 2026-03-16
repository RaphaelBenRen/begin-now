const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /friends — liste des amis acceptés
router.get('/', async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id, created_at, status,
      requester:profiles!friendships_requester_id_fkey(id, username, avatar_url, total_points),
      addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_url, total_points)
    `)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error) return res.status(500).json({ message: error.message });

  // Retourner l'autre personne dans chaque relation
  const friends = data.map((f) => ({
    friendship_id: f.id,
    friend: f.requester.id === userId ? f.addressee : f.requester,
    since: f.created_at,
  }));

  return res.json(friends);
});

// GET /friends/requests — demandes en attente
router.get('/requests', async (req, res) => {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id, created_at,
      requester:profiles!friendships_requester_id_fkey(id, username, avatar_url)
    `)
    .eq('addressee_id', req.user.id)
    .eq('status', 'pending');

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
});

// POST /friends/request — envoyer une demande d'amitié
router.post('/request', async (req, res) => {
  const { username } = req.body;
  const userId = req.user.id;

  if (!username) return res.status(400).json({ message: 'Username requis.' });

  const { data: target } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', username.trim())
    .single();

  if (!target) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (target.id === userId) return res.status(400).json({ message: 'Tu ne peux pas t\'ajouter toi-même.' });

  // Vérifier si une relation existe déjà
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${userId})`
    )
    .single();

  if (existing) {
    if (existing.status === 'accepted') return res.status(409).json({ message: 'Vous êtes déjà amis.' });
    if (existing.status === 'pending') return res.status(409).json({ message: 'Demande déjà envoyée.' });
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: userId, addressee_id: target.id, status: 'pending' })
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.status(201).json(data);
});

// PATCH /friends/:id/accept — accepter une demande
router.patch('/:id/accept', async (req, res) => {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', req.params.id)
    .eq('addressee_id', req.user.id)
    .eq('status', 'pending');

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: 'Demande acceptée.' });
});

// PATCH /friends/:id/decline — refuser une demande
router.patch('/:id/decline', async (req, res) => {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'declined' })
    .eq('id', req.params.id)
    .eq('addressee_id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: 'Demande refusée.' });
});

// GET /friends/:friendId/objectives — objectifs publics d'un ami
router.get('/:friendId/objectives', async (req, res) => {
  const userId = req.user.id;
  const { friendId } = req.params;

  // Vérifier qu'ils sont bien amis
  const { data: friendship, error: friendError } = await supabase
    .from('friendships')
    .select('id')
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`
    )
    .eq('status', 'accepted')
    .single();

  if (friendError) console.log('[friends/objectives] friendship check error:', friendError.message);
  if (!friendship) return res.status(403).json({ message: 'Vous n\'êtes pas amis.' });

  const { getLocalToday } = require('../lib/dateUtils');
  const today = getLocalToday();

  // D'abord récupérer les objectifs sans le filtre is_public pour diagnostiquer
  const { data, error } = await supabase
    .from('objectives')
    .select(`
      id, title, icon, color, type, is_public, is_active,
      streak:streaks(current_streak, longest_streak),
      today_log:daily_logs(status, value, log_date)
    `)
    .eq('user_id', friendId)
    .eq('is_active', true);

  if (error) {
    console.log('[friends/objectives] query error:', error.message);
    return res.status(500).json({ message: error.message });
  }

  console.log(`[friends/objectives] friendId=${friendId} → ${data?.length} objectives total, public: ${data?.filter(o => o.is_public).length}`);

  // Filtrer is_public côté JS pour être sûr
  const publicObjs = (data || []).filter((obj) => obj.is_public === true);

  // Filtrer le log du jour uniquement + aplatir streak
  const result = publicObjs.map((obj) => ({
    ...obj,
    streak: Array.isArray(obj.streak) ? obj.streak[0] || null : obj.streak,
    today_log: (obj.today_log || []).find((l) => l.log_date === today) || null,
  }));

  return res.json(result);
});

module.exports = router;
