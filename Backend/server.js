import app from "./app.js";
import { PORT, HOST_URL } from "./config/env.js";
import { syncModels } from "./models/index.model.js";
import { startOutboxCron } from "./services/outbox.worker.js";
import { startReminderCron } from "./services/reminder.worker.js";
import { startInboundMailCron } from "./services/inboundMail.service.js";
import { startBailleurRelanceCron } from "./services/bailleurRelance.service.js";
import { initSocketGateway } from "./shared/socketGateway.js";

const server = app.listen(PORT, async () => {
  try {
    await syncModels();
    startOutboxCron();
    startReminderCron();
    // Sans boîte configurée (MAILBOXES vide ou identifiants manquants),
    // chaque tick ne fait rien : aucun impact sur le reste de l'API.
    startInboundMailCron();
    // Relances programmées des bailleurs (vérifiées chaque minute).
    startBailleurRelanceCron();
    // BACK-G18 — attaché au même serveur HTTP que l'API REST (pas un port
    // séparé). Si l'hébergement cible ne supporte pas les WebSocket
    // persistants (cPanel, CLAUDE.md §12 point ouvert), cette ligne est le
    // seul endroit à retirer : tout le reste du système fonctionne déjà
    // sans dépendre de Socket.IO (CLAUDE.md §6).
    initSocketGateway(server);
    console.log(`Le serveur est lancé au http://localhost:${PORT}/`);
    console.log(`Documentation Swagger sur ${HOST_URL}/api-docs/`);
  } catch (error) {
    console.error("Erreur lors de la synchronisation des modèles:", error);
  }
});

server.on("error", (err) => {
  console.error(
    `Une erreur s'est produite au démarrage du serveur: ${err.message}`,
  );
  process.exit(1);
});

export default server;
