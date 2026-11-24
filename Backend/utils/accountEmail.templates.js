import { actionButton, escapeHtml, layout } from "./formEmail.templates.js";

// E-mails de compte : lien de réinitialisation et clé d'accès. Le lien
// mène toujours au site de l'agence (FRONT_URL), jamais à l'API.

export const passwordResetEmail = ({ fullName, link, minutes }) => ({
  subject: "Réinitialisation de votre mot de passe NBN Express",
  html: layout(`
    <p>Bonjour ${escapeHtml(fullName)},</p>
    <p>Vous avez demandé à réinitialiser le mot de passe de votre compte NBN Express.
    Ce lien est valable <strong>${minutes} minutes</strong> et ne peut servir qu'une seule fois.</p>
    ${actionButton(link, "Choisir un nouveau mot de passe")}
    <p style="font-size:13px;color:#5B6472">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <a href="${escapeHtml(link)}" style="color:#C13F0B;word-break:break-all">${escapeHtml(link)}</a></p>
    <p style="font-size:13px;color:#5B6472">Vous n'êtes pas à l'origine de cette demande ? Ignorez ce message :
    votre mot de passe actuel reste valable.</p>`),
});

export const accessKeyEmail = ({ fullName, code, accessKey, link, hours }) => ({
  subject: "Votre accès à l'espace commissionnaire NBN Express",
  html: layout(`
    <p>Bonjour ${escapeHtml(fullName)},</p>
    <p>L'agence NBN Express vous ouvre un espace personnel pour suivre vos biens collectés,
    vos tâches et vos commissions${code ? ` (code commissionnaire <strong>${escapeHtml(code)}</strong>)` : ""}.</p>
    <p>Votre clé d'accès, valable <strong>${hours} heures</strong> et utilisable une seule fois :</p>
    <p style="text-align:center;font-size:24px;font-weight:bold;letter-spacing:3px;margin:16px 0">${escapeHtml(accessKey)}</p>
    ${actionButton(link, "Activer mon espace")}
    <p style="font-size:13px;color:#5B6472">Vous choisirez ensuite votre mot de passe. Les connexions suivantes se feront
    avec votre adresse e-mail et ce mot de passe.</p>`),
});
