const supabase = require('./supabase');

const BADGE_DEFINITIONS = [
  { slug: 'first_log', condition_type: 'total_done', condition_value: 1 },
  { slug: 'streak_3', condition_type: 'streak_days', condition_value: 3 },
  { slug: 'streak_7', condition_type: 'streak_days', condition_value: 7 },
  { slug: 'streak_14', condition_type: 'streak_days', condition_value: 14 },
  { slug: 'streak_30', condition_type: 'streak_days', condition_value: 30 },
  { slug: 'streak_50', condition_type: 'streak_days', condition_value: 50 },
  { slug: 'streak_100', condition_type: 'streak_days', condition_value: 100 },
  { slug: 'total_100', condition_type: 'total_done', condition_value: 100 },
];

/**
 * Met à jour la streak d'un objectif après un log.
 * Retourne { current_streak, longest_streak }
 */
async function updateStreak(objectiveId, userId, status, logDate) {
  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('objective_id', objectiveId)
    .eq('user_id', userId)
    .single();

  if (!streak) return null;

  // Toujours recalculer la streak à partir des logs réels
  // Récupérer tous les logs "done" triés par date décroissante
  const { data: doneLogs } = await supabase
    .from('daily_logs')
    .select('log_date')
    .eq('objective_id', objectiveId)
    .eq('user_id', userId)
    .eq('status', 'done')
    .order('log_date', { ascending: false });

  let current_streak = 0;
  let last_log_date = null;

  if (doneLogs && doneLogs.length > 0) {
    last_log_date = doneLogs[0].log_date;

    // Fonction pour soustraire N jours d'une date string YYYY-MM-DD
    const subDays = (dateStr, n) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d); // pas d'UTC, on reste en local
      dt.setDate(dt.getDate() - n);
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };

    const yesterdayStr = subDays(logDate, 1);

    // Le dernier log done doit être aujourd'hui ou hier pour que la streak soit active
    if (last_log_date === logDate || last_log_date === yesterdayStr) {
      let expectedDate = last_log_date;
      for (const dl of doneLogs) {
        if (dl.log_date === expectedDate) {
          current_streak++;
          expectedDate = subDays(expectedDate, 1);
        } else {
          break;
        }
      }
    }
  }

  const longest_streak = Math.max(streak.longest_streak, current_streak);

  const { data: updated } = await supabase
    .from('streaks')
    .update({ current_streak, longest_streak, last_log_date })
    .eq('objective_id', objectiveId)
    .eq('user_id', userId)
    .select()
    .single();

  return updated;
}

/**
 * Vérifie et attribue les badges après un log.
 * Retourne les nouveaux badges débloqués.
 */
async function checkBadges(objectiveId, userId, streak) {
  if (!streak) return [];

  // Compter le total de logs 'done' pour cet objectif
  const { count: totalDone } = await supabase
    .from('daily_logs')
    .select('id', { count: 'exact', head: true })
    .eq('objective_id', objectiveId)
    .eq('user_id', userId)
    .eq('status', 'done');

  // Récupérer les badges déjà gagnés pour cet objectif
  const { data: existingBadges } = await supabase
    .from('user_badges')
    .select('badge_id, badges(slug)')
    .eq('objective_id', objectiveId)
    .eq('user_id', userId);

  const earnedSlugs = new Set((existingBadges || []).map((b) => b.badges?.slug));

  // Récupérer tous les badges depuis la DB
  const { data: allBadges } = await supabase.from('badges').select('*');
  if (!allBadges) return [];

  const newBadges = [];

  for (const badge of allBadges) {
    if (earnedSlugs.has(badge.slug)) continue;

    let earned = false;

    if (badge.condition_type === 'streak_days') {
      earned = streak.current_streak >= badge.condition_value;
    } else if (badge.condition_type === 'total_done') {
      earned = totalDone >= badge.condition_value;
    }

    if (earned) {
      const { data: userBadge } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          objective_id: objectiveId,
          badge_id: badge.id,
        })
        .select()
        .single();

      if (userBadge) newBadges.push(badge);
    }
  }

  return newBadges;
}

module.exports = { updateStreak, checkBadges };
