const currentYear = new Date().getFullYear();
const PRIMARY = "#FC963C";
const PRIMARY_DARK = "#F25D1C";
const SECONDARY = "#2C6F5D";
const TEXT = "#141716";
const MUTED = "#555555";

/* -------------------------------------------------------------------------- */
/*                               WELCOME EMAIL                                */
/* -------------------------------------------------------------------------- */
export const welcomeEmailTemplate = (nom, email, url) => `
<div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 24px;">
  <div style="max-width:600px;margin:auto;background:#ffffff;padding:24px;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,.08)">
    
    <h2 style="color:${SECONDARY};margin-bottom:12px;">Bienvenue ${nom} </h2>

    <p style="color:${MUTED};">
      Votre compte Nyumbani Express a été créé avec succès pour l’adresse :
    </p>

    <p style="text-align:center;font-weight:bold;color:${PRIMARY};">${email}</p>

    <p style="color:${MUTED};">
      Votre compte est actif, mais l’accès au système dépend encore de l’attribution des permissions.
    </p>

    <p style="color:${MUTED};">
      Pour finaliser l’accès, veuillez contacter l’administrateur.
    </p>

    <p style="text-align:center;">
      <a href="mailto:support@nyumbaniexpress.com"
         style="background:${PRIMARY};color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
        Contacter l’administrateur
      </a>
    </p>

    <p style="color:${MUTED};margin-top:24px;">
      À très bientôt,<br>
      <strong>Équipe Nyumbani Express</strong>
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">

    <p style="font-size:12px;color:#999;text-align:center;">
      Ce message est automatique, merci de ne pas y répondre.<br>
      &copy; ${currentYear} Nyumbani Express. Tous droits réservés.
    </p>
  </div>
</div>
`;

/* -------------------------------------------------------------------------- */
/*                           NEW USER (PASSWORD)                               */
/* -------------------------------------------------------------------------- */
export const newUserEmailTemplate = (nom, email, defaultPassword, url) => `
<div style="font-family:Arial,sans-serif;background:#f9f9f9;padding:24px">
  <div style="max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,.08)">
    
    <div style="text-align:center;margin-bottom:20px">
      <img src="https://nbnexpress.org/nyumbani-logo.png" height="80" alt="Nyumbani Express">
    </div>

    <h2 style="color:${SECONDARY};">Bienvenue ${nom} 👋</h2>

    <p style="color:${MUTED};">
      Votre compte a été créé avec l’adresse <strong>${email}</strong>.
    </p>

    <p style="color:${MUTED};">Mot de passe temporaire :</p>

    <div style="background:#f4f4f4;padding:12px;border-radius:6px;text-align:center;">
      <strong style="font-size:18px;color:${PRIMARY_DARK};">${defaultPassword}</strong>
    </div>

    <p style="color:${MUTED};margin-top:16px;">
      ⚠️ Pour votre sécurité, veuillez changer ce mot de passe lors de votre première connexion.
    </p>

    <p style="text-align:center;margin:24px 0">
      <a href="${url}"
         style="background:${PRIMARY};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Se connecter
      </a>
    </p>

    <p style="color:${MUTED};">
      Cordialement,<br>
      <strong>Équipe Nyumbani Express</strong>
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">

    <p style="font-size:12px;color:#999;text-align:center;">
      &copy; ${currentYear} Nyumbani Express. Tous droits réservés.
    </p>
  </div>
</div>
`;

/* -------------------------------------------------------------------------- */
/*                           RESET PASSWORD                                    */
/* -------------------------------------------------------------------------- */
export const resetPasswordEmailTemplate = (nom, email, url, resetToken) => `
<div style="font-family:Arial,sans-serif;background:#f9f9f9;padding:24px">
  <div style="max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,.08)">
    
    <div style="text-align:center;margin-bottom:20px">
      <img src="https://nbnexpress.org/nyumbani-logo.png" height="80" alt="Nyumbani Express">
    </div>

    <h2 style="color:${SECONDARY};">Bonjour ${nom},</h2>

    <p style="color:${MUTED};">
      Une demande de réinitialisation a été faite pour le compte <strong>${email}</strong>.
    </p>

    <p style="text-align:center;margin:24px 0">
      <a href="${url}/auth/resetpassword?token=${resetToken}"
         style="background:${PRIMARY};color:#fff;padding:14px 24px;border-radius:6px;text-decoration:none;">
        Réinitialiser le mot de passe 🔐
      </a>
    </p>

    <p style="font-size:14px;color:${MUTED};">
      Si le bouton ne fonctionne pas, utilisez ce lien :<br>
      <a href="${url}/auth/resetpassword?token=${resetToken}" style="color:${PRIMARY};">
        ${url}/auth/resetpassword
      </a>
    </p>

    <p style="color:${MUTED};margin-top:24px;">
      L’équipe Nyumbani Express
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">

    <p style="font-size:12px;color:#999;text-align:center;">
      Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.<br>
      &copy; ${currentYear} Nyumbani Express
    </p>
  </div>
</div>
`;
