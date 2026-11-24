// Bornes d'une période (aujourd'hui, cette semaine, ce mois, cette année) à
// l'heure de Bukavu : Africa/Lubumbashi, UTC+2 toute l'année (pas d'heure
// d'été). Le calcul se fait en heure locale puis revient en UTC pour les
// requêtes, quel que soit le fuseau du serveur.
export const AGENCY_UTC_OFFSET_MINUTES = Number(process.env.AGENCY_UTC_OFFSET_MINUTES || 120);
export const PERIODS = ["day", "week", "month", "year"];

export const periodBounds = (period, now = new Date(), offsetMinutes = AGENCY_UTC_OFFSET_MINUTES) => {
  const offsetMs = offsetMinutes * 60 * 1000;
  // Date « murale » de Bukavu, manipulée avec les méthodes UTC.
  const local = new Date(now.getTime() + offsetMs);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();

  let start;
  let end;
  if (period === "year") {
    start = Date.UTC(y, 0, 1);
    end = Date.UTC(y + 1, 0, 1);
  } else if (period === "month") {
    start = Date.UTC(y, m, 1);
    end = Date.UTC(y, m + 1, 1);
  } else if (period === "week") {
    // Semaine du lundi au dimanche.
    const mondayShift = (local.getUTCDay() + 6) % 7;
    start = Date.UTC(y, m, d - mondayShift);
    end = Date.UTC(y, m, d - mondayShift + 7);
  } else {
    start = Date.UTC(y, m, d);
    end = Date.UTC(y, m, d + 1);
  }
  return { start: new Date(start - offsetMs), end: new Date(end - offsetMs) };
};
