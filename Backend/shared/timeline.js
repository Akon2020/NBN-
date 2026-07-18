import { TimelineEvent } from "../models/index.model.js";

// GOAL 3 — point d'entrée unique pour journaliser un événement de timeline.
// Appelé explicitement depuis les contrôleurs concernés (jamais via un
// abonnement générique à l'event bus) : chaque appelant connaît précisément
// l'entité concernée, évitant toute mauvaise attribution d'événement.
// Ne doit jamais faire échouer l'opération métier qui le déclenche — un
// événement de timeline est un journal, pas une contrainte transactionnelle.
export const recordTimelineEvent = async ({
  entityType,
  entityId,
  eventType,
  title,
  description = null,
  metadata = null,
  actorUserId = null,
  occurredAt = new Date(),
}) => {
  try {
    return await TimelineEvent.create({
      entityType,
      entityId,
      eventType,
      title,
      description,
      metadata,
      actorUserId,
      occurredAt,
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement d'un événement de timeline :", error);
    return null;
  }
};
