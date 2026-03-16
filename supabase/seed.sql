-- ============================================================
-- Begin Now — Seed : Templates & Badges
-- ============================================================

-- OBJECTIVE TEMPLATES
insert into public.objective_templates (slug, name, icon, type, unit, positive_goal, description)
values
  ('no_smoking',   'Ne pas fumer',      '🚭', 'quantifiable', 'cigarettes', false, 'Réduire ou arrêter de fumer'),
  ('no_alcohol',   'Ne pas boire',      '🚱', 'quantifiable', 'verres',     false, 'Réduire ou arrêter la consommation d''alcool'),
  ('sport',        'Faire du sport',    '🏃', 'binary',       null,         true,  'Pratiquer une activité physique'),
  ('meditation',   'Méditer',           '🧘', 'binary',       null,         true,  'Pratiquer la méditation ou la pleine conscience'),
  ('reading',      'Lire',              '📚', 'quantifiable', 'pages',      true,  'Lire chaque jour'),
  ('sleep_early',  'Dormir tôt',        '🌙', 'binary',       null,         true,  'Se coucher à une heure raisonnable'),
  ('no_junk_food', 'Pas de junk food',  '🥗', 'binary',       null,         false, 'Éviter la malbouffe'),
  ('hydration',    'Boire de l''eau',   '💧', 'quantifiable', 'litres',     true,  'Rester bien hydraté')
on conflict (slug) do nothing;

-- BADGES
insert into public.badges (slug, name, description, icon, condition_type, condition_value)
values
  ('first_log',    'Premier pas',    'Premier jour complété',         '🌱', 'total_done',  1),
  ('streak_3',     '3 jours',        '3 jours consécutifs',           '🔥', 'streak_days', 3),
  ('streak_7',     '1 semaine',      '7 jours consécutifs',           '⚡', 'streak_days', 7),
  ('streak_14',    '2 semaines',     '14 jours consécutifs',          '💪', 'streak_days', 14),
  ('streak_30',    '1 mois',         '30 jours consécutifs',          '🏆', 'streak_days', 30),
  ('streak_50',    '50 jours',       '50 jours consécutifs',          '🌟', 'streak_days', 50),
  ('streak_100',   'Centenaire',     '100 jours consécutifs',         '💎', 'streak_days', 100),
  ('perfect_week', 'Semaine parfaite','7 jours consécutifs complétés','✨', 'perfect_week', 7),
  ('total_100',    'Centurion',      '100 jours complétés au total',  '🎖️','total_done',  100)
on conflict (slug) do nothing;
