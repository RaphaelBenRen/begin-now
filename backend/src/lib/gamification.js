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

  let { current_streak, longest_streak, last_log_date } = streak;

  if (status === 'done') {
    const yesterday = new Date(logDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (last_log_date === yesterdayStr) {
      // Continuité de la streak
      current_streak += 1;
    } else if (last_log_date === logDate) {
      // Log du même jour (re-log) — pas de changement de streak
    } else {
      // Streak brisée ou premier log
      current_streak = 1;
    }

    longest_streak = Math.max(longest_streak, current_streak);
    last_log_date = logDate;

  } else if (status === 'skipped') {
    // Skip ne brise pas la streak, on ne met pas à jour last_log_date
    // mais on évite que le lendemain la streak soit brisée
    last_log_date = logDate;
  }
  // 'failed' : on remet à 0 la streak
  else if (status === 'failed') {
    current_streak = 0;
    last_log_date = logDate;
  }

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
