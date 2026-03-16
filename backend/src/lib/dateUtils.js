/**
 * Retourne la date du jour au format YYYY-MM-DD en heure locale (Europe/Paris).
 */
function getLocalToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  // en-CA donne le format YYYY-MM-DD
}

module.exports = { getLocalToday };
