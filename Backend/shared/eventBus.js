import { EventEmitter } from "events";

// CLAUDE.md §4/§6 — event bus interne léger (EventEmitter Node natif),
// pas de message broker externe. Les modules métier émettent des
// événements sans connaître leurs consommateurs (notifications, alertes,
// futur gateway Socket.IO BACK-G18) ; `shared/eventListeners.js` centralise
// l'abonnement, jamais un contrôleur qui écoute directement un autre
// module.
export const eventBus = new EventEmitter();

// Un événement métier peut avoir plusieurs conséquences indépendantes
// (Notification, Alert, Reminder, RealtimeEvent) — augmenter cette limite
// évite un warning Node si plusieurs listeners s'abonnent au même type.
eventBus.setMaxListeners(50);
