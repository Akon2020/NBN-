import { eventBus } from "./eventBus.js";
import { createAlert, createNotification } from "../services/notification.service.js";

// CLAUDE.md §7 — abonnement centralisé, jamais un module qui écoute
// directement un autre. `registerEventListeners()` est appelé une seule
// fois au démarrage (server.js) ; chaque `on()` ci-dessous documente la
// conséquence (Notification/Alert) d'un événement métier réel.
export const registerEventListeners = () => {
  // BACK-G13/G17 — critère d'acceptation du plan : une réquisition
  // approuvée produit une Notification pour le demandeur (avec tentative
  // de push via outbox, jamais perdue même si le push échoue).
  eventBus.on("requisition:approved", async ({ requisition }) => {
    await createNotification({
      idUser: requisition.demandeurId,
      type: "requisition:approved",
      title: "Réquisition approuvée",
      message: `Votre réquisition « ${requisition.nature} » a été approuvée (code ${requisition.validationCode}).`,
      relatedEntityType: "Requisition",
      relatedEntityId: requisition.idRequisition,
    });
  });

  eventBus.on("requisition:rejected", async ({ requisition }) => {
    await createNotification({
      idUser: requisition.demandeurId,
      type: "requisition:rejected",
      title: "Réquisition rejetée",
      message: requisition.motifDecision
        ? `Motif : ${requisition.motifDecision}`
        : "Votre réquisition a été rejetée.",
      relatedEntityType: "Requisition",
      relatedEntityId: requisition.idRequisition,
    });
  });

  // CLAUDE.md §16 point 2 — "score commissionnaire bas" est le premier
  // type d'alerte explicitement cité dans le cahier des charges. Déclenché
  // uniquement sur la transition réelle vers OBSERVATION (pas à chaque
  // recalcul de score), voir commissionnaire.controller.js.
  eventBus.on("commissionnaire:score_low", async ({ commissionnaire }) => {
    await createAlert({
      type: "commissionnaire:score_bas",
      title: `Score bas — ${commissionnaire.code}`,
      description: `Le commissionnaire ${commissionnaire.code} est passé en statut OBSERVATION (score global ${Number(commissionnaire.scoreGlobal).toFixed(0)}/100).`,
      severite: "AVERTISSEMENT",
    });
  });
};
