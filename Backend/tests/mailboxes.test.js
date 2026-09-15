import { describe, it, expect } from "vitest";
import { getMailbox, getMailboxes } from "../config/mailboxes.js";

describe("Configuration des boîtes professionnelles", () => {
  it("n'active aucune boîte sans MAILBOXES", () => {
    expect(getMailboxes({})).toEqual([]);
  });

  it("applique les audiences demandées par l'agence par défaut", () => {
    const env = {
      MAILBOXES: "contact, direction",
      MAILBOX_CONTACT_ADDRESS: "contact@nbnexpress.org",
      MAILBOX_DIRECTION_ADDRESS: "direction@nbnexpress.org",
    };

    expect(getMailbox("contact", env).roles).toEqual(["admin", "communication", "marketing"]);
    // L'admin ne voit pas les messages de la direction.
    expect(getMailbox("direction", env).roles).toEqual(["direction"]);
  });

  it("ne relève ni n'envoie depuis une boîte sans identifiants", () => {
    const mailbox = getMailbox("contact", {
      MAILBOXES: "contact",
      MAILBOX_CONTACT_ADDRESS: "contact@nbnexpress.org",
      MAILBOX_CONTACT_IMAP_HOST: "mail.nbnexpress.org",
      MAILBOX_CONTACT_SMTP_HOST: "mail.nbnexpress.org",
    });

    expect(mailbox.canReceive).toBe(false);
    expect(mailbox.canSend).toBe(false);
  });

  it("relève le compte Gmail de développement sur demande", () => {
    const mailbox = getMailbox("contact", {
      MAILBOXES: "contact",
      MAILBOX_CONTACT_USE_DEFAULT_ACCOUNT: "true",
      EMAIL: "Agence.Dev@gmail.com",
      EMAIL_PASSWORD: "app-password",
    });

    expect(mailbox.address).toBe("agence.dev@gmail.com");
    expect(mailbox.imapHost).toBe("imap.gmail.com");
    expect(mailbox.smtpHost).toBe("smtp.gmail.com");
    expect(mailbox.canReceive).toBe(true);
    expect(mailbox.canSend).toBe(true);
  });

  it("accepte une future boîte avec ses propres comptes destinataires", () => {
    const mailbox = getMailbox("jean", {
      MAILBOXES: "contact,jean",
      MAILBOX_JEAN_ADDRESS: "Jean.Mukendi@nbnexpress.org",
      MAILBOX_JEAN_USERS: "Assistante@nbnexpress.org",
    });

    expect(mailbox.roles).toEqual([]);
    expect(mailbox.users).toEqual(["assistante@nbnexpress.org"]);
    expect(mailbox.address).toBe("jean.mukendi@nbnexpress.org");
  });
});
