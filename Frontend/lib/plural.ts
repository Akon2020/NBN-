// Accord en nombre pour les textes de l'interface : « 1 bien », « 3 biens »,
// plutôt que « bien(s) ». En français, 0 et 1 restent au singulier.
export const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${Math.abs(count) > 1 ? pluralForm : singular}`

// Mot seul accordé, quand le nombre est affiché ailleurs.
export const agree = (count: number, singular: string, pluralForm = `${singular}s`) =>
  Math.abs(count) > 1 ? pluralForm : singular
