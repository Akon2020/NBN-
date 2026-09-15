// Gabarits des e-mails liés aux formulaires publics. Couleurs de la charte
// (CLAUDE.md §10) : navy pour la marque, orange « bouton » #C13F0B pour les
// liens d'action (le seul orange qui passe le contraste avec du texte blanc).
const NAVY = "#14294A";
const BUTTON = "#C13F0B";
const TEXT = "#16181D";
const MUTED = "#5B6472";
const SURFACE = "#F7F7F7";

// Toute valeur saisie par un visiteur (nom, quartier, message) est échappée :
// un e-mail est du HTML, un nom comme `<a href=...>` y deviendrait un lien.
export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Date lisible à l'heure de Bukavu, quel que soit le fuseau du serveur.
export const formatRequestDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Lubumbashi",
  }).format(date);

const civilityOf = (sexe) =>
  sexe === "MASCULIN" ? "Monsieur" : sexe === "FEMININ" ? "Madame" : "Madame, Monsieur";

const layout = (content) => `
<div style="font-family:Arial,Helvetica,sans-serif;background:${SURFACE};padding:24px">
  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden">
    <div style="background:${NAVY};padding:18px 24px">
      <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:.3px">NBN Express</span>
    </div>
    <div style="padding:24px;color:${TEXT};font-size:15px;line-height:1.6">
      ${content}
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eee;color:#999;font-size:12px;text-align:center">
      &copy; ${new Date().getFullYear()} NBN Express &ndash; Bukavu
    </div>
  </div>
</div>`;

const detailRows = (rows) =>
  `<table style="width:100%;border-collapse:collapse;margin:16px 0">${rows
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 0;color:${MUTED};width:42%;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:6px 0;font-weight:bold">${escapeHtml(value)}</td>
      </tr>`
    )
    .join("")}</table>`;

const actionButton = (href, label) => `
  <p style="text-align:center;margin:24px 0 8px">
    <a href="${escapeHtml(href)}" style="background:${BUTTON};color:#ffffff;padding:11px 18px;border-radius:6px;text-decoration:none;font-weight:bold">${escapeHtml(label)}</a>
  </p>`;

/**
 * Avis de réception envoyé au client juste après « Envoyer ma demande ».
 * Texte fourni par l'agence ; [Prénom du client], [N° de commande] et
 * [Date de la demande] sont les variables dynamiques.
 */
export const rentalRequestAcknowledgement = ({ fullName, sexe, orderNumber, requestedAt }) => {
  const subject = "Avis de réception de votre demande";
  const civility = civilityOf(sexe);
  const date = formatRequestDate(requestedAt);

  const text = [
    `Bonjour ${civility} ${fullName},`,
    "",
    "Nous vous confirmons que votre commande a bien été reçue par NBN Express.",
    "",
    "Les informations concernant votre recherche de bien immobilier ont été enregistrées avec succès. Notre équipe va examiner votre demande et un agent NBN Express vous contactera bientôt pour la suite de votre recherche.",
    "",
    orderNumber ? `N° de commande : ${orderNumber}` : null,
    `Date de la demande : ${date}`,
    "",
    "Merci d'avoir choisi NBN Express – La crédibilité au service de votre projet immobilier.",
    "",
    "L'équipe NBN Express",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = layout(`
    <p>Bonjour ${escapeHtml(civility)} <strong>${escapeHtml(fullName)}</strong>,</p>
    <p>Nous vous confirmons que votre commande a bien été reçue par NBN Express.</p>
    <p>Les informations concernant votre recherche de bien immobilier ont été enregistrées avec succès.
    Notre équipe va examiner votre demande et un agent NBN Express vous contactera bientôt pour la suite
    de votre recherche.</p>
    ${detailRows([
      ["N° de commande", orderNumber],
      ["Date de la demande", date],
    ])}
    <p>Merci d'avoir choisi NBN Express &ndash; <em>La crédibilité au service de votre projet immobilier.</em></p>
    <p style="margin-top:24px">L'équipe NBN Express</p>`);

  return { subject, html, text };
};

// Notification d'équipe : nouvelle demande de location reçue.
export const rentalRequestTeamEmail = ({ fullName, phone, email, localisation, budget, orderNumber, link }) => ({
  subject: `Nouvelle demande de location — ${fullName}`,
  html: layout(`
    <p>Une nouvelle demande de location vient d'être soumise sur le site.</p>
    ${detailRows([
      ["Client", fullName],
      ["Téléphone", phone],
      ["E-mail", email],
      ["Recherche", localisation],
      ["Budget", budget],
      ["N° de dossier", orderNumber],
    ])}
    <p style="color:${MUTED}">Le client a reçu un avis de réception automatique. Il est placé sur le pipeline
    commercial en « Nouveau client ».</p>
    ${actionButton(link, "Ouvrir la fiche client")}`),
});

// Notification d'équipe : nouveau bien collecté.
export const propertyCollectionTeamEmail = ({ title, source, localisation, price, responsable, link }) => ({
  subject: title,
  html: layout(`
    <p>Un nouveau bien vient d'être enregistré par le formulaire de collecte.</p>
    ${detailRows([
      ["Source", source],
      ["Localisation", localisation],
      ["Prix fixé", price],
      ["Responsable", responsable],
    ])}
    ${actionButton(link, "Ouvrir la fiche du bien")}`),
});

// Confirmation au responsable qui a lui-même enregistré son bien.
export const propertyCollectionConfirmation = ({ fullName, localisation, requestedAt }) => ({
  subject: "Votre bien a bien été enregistré",
  html: layout(`
    <p>Bonjour <strong>${escapeHtml(fullName)}</strong>,</p>
    <p>Nous vous confirmons que votre bien a bien été enregistré par NBN Express.</p>
    ${detailRows([
      ["Bien", localisation],
      ["Date d'enregistrement", formatRequestDate(requestedAt)],
    ])}
    <p>Notre équipe va l'examiner et un agent NBN Express vous contactera pour la suite, notamment la visite
    et les photos du bien.</p>
    <p>Merci pour votre confiance &ndash; <em>La crédibilité au service de votre projet immobilier.</em></p>
    <p style="margin-top:24px">L'équipe NBN Express</p>`),
});
