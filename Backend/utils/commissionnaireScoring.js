// CDC §7 — score global /100 = somme des 4 sous-scores /25 (performance,
// qualité, discipline, engagement). Grille d'évolution automatique et
// classement dérivé — jamais stockés indépendamment du score pour éviter
// toute désynchronisation.

const SCORE_MIN = 0;
const SCORE_MAX_PAR_DIMENSION = 25;

export const clampSubScore = (value) =>
  Math.min(SCORE_MAX_PAR_DIMENSION, Math.max(SCORE_MIN, Number(value) || 0));

export const computeScoreGlobal = (commissionnaire) =>
  clampSubScore(commissionnaire.scorePerformance) +
  clampSubScore(commissionnaire.scoreQualite) +
  clampSubScore(commissionnaire.scoreDiscipline) +
  clampSubScore(commissionnaire.scoreEngagement);

// CDC §7 — Élite (90-100), Très performant (75-89), Moyen (60-74), Risque (<60).
export const getClassement = (scoreGlobal) => {
  if (scoreGlobal >= 90) return "ELITE";
  if (scoreGlobal >= 75) return "TRES_PERFORMANT";
  if (scoreGlobal >= 60) return "MOYEN";
  return "RISQUE";
};

// CDC §7 — "score ≥ 75 + conditions → upgrade ; score < 60 → alerte".
// Le CDC ne détaille pas les "conditions" au-delà du seuil de score ; seul
// le seuil est appliqué ici, à affiner si une condition métier
// supplémentaire (ex. ancienneté minimale) est précisée ultérieurement.
// "Alerte" est traduite par un passage en statut OBSERVATION (un des 4
// statuts déjà prévus par le CDC pour ce cas), pas par un système
// d'alerte générique — celui-ci n'existe pas encore dans le système
// (CLAUDE.md §7, module Notifications/Alertes non construit à ce stade).
export const applyEvolutionGrid = (commissionnaire) => {
  const scoreGlobal = computeScoreGlobal(commissionnaire);
  commissionnaire.scoreGlobal = scoreGlobal;

  if (commissionnaire.niveau === "JUNIOR" && scoreGlobal >= 75) {
    commissionnaire.niveau = "CONFIRME";
  } else if (commissionnaire.niveau === "CONFIRME" && scoreGlobal >= 90) {
    commissionnaire.niveau = "SENIOR";
  }

  if (scoreGlobal < 60 && commissionnaire.statut === "ACTIF") {
    commissionnaire.statut = "OBSERVATION";
  }

  return commissionnaire;
};
