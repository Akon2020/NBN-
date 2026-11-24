// Coordonnées publiques de l'agence (clé `company.info` des Paramètres),
// dupliquées ici : les pages publiques ne peuvent pas lire `/api/settings`,
// qui exige une permission.
export const COMPANY = {
  name: "Nyumbani Express",
  legalName: "NBN Express (Nyumbani Express)",
  phone: "+243 977 103 143",
  whatsapp: "243977103143",
  address: "22 Av. Résidence, en face de Gardaworld, Bukavu, Sud-Kivu, RDC",
  email: "contact@nbnexpress.org",
  website: "https://nbnexpress.org",
}

export const whatsappHref = (message: string) =>
  `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(message)}`

export const LEGAL_LINKS = [
  { href: "/confidentialite", label: "Politique de confidentialité" },
  { href: "/conditions", label: "Conditions d'utilisation" },
  { href: "/mentions-legales", label: "Mentions légales" },
]

// Engagements acceptés par le client à la fin de la demande de location,
// repris tels quels dans les conditions d'utilisation.
export const RENTAL_CONDITIONS = [
  {
    title: "Informations fournies",
    body: "Je m'engage à fournir des informations exactes et sincères. Toute fausse déclaration peut entraîner le rejet de ma demande.",
  },
  {
    title: "Rôle de l'agence",
    body: "Je comprends que Nyumbani Express agit comme intermédiaire entre moi et les propriétaires, et que les biens proposés sont issus de son réseau.",
  },
  {
    title: "Mise en relation officielle",
    body: "Je reconnais que tout bien présenté par l'agence constitue une mise en relation officielle.",
  },
  {
    title: "Engagement de non-contournement",
    body: "Je m'engage à ne pas contacter directement le propriétaire d'un bien présenté par l'agence, à ne pas chercher à conclure une transaction sans passer par l'agence, et à ne pas utiliser les informations reçues pour la contourner. Cet engagement reste valable pendant toute la recherche et jusqu'à 12 mois après.",
  },
  {
    title: "Confidentialité",
    body: "Je m'engage à ne pas partager les contacts des propriétaires, les informations sur les biens, ni les détails reçus via l'agence.",
  },
  {
    title: "Frais de service",
    body: "Je comprends que certains services peuvent être payants (visites, mise en relation, accompagnement) et que les conditions me seront expliquées avant toute transaction.",
  },
  {
    title: "Respect de la collaboration",
    body: "Je m'engage à collaborer de manière sérieuse et respectueuse avec l'équipe.",
  },
  {
    title: "En cas de non-respect",
    body: "Je comprends que tout contournement ou comportement frauduleux peut entraîner l'annulation du service, des pénalités, ou des actions conformément aux règles en vigueur.",
  },
]

export const FAQ = [
  {
    question: "Comment faire une demande de location ?",
    answer:
      "Remplissez le formulaire de demande en ligne depuis votre téléphone : type de bien, quartier, budget et date d'entrée. Comptez 3 à 4 minutes. Vous recevez un numéro de dossier et un conseiller vous recontacte.",
  },
  {
    question: "Envoyer une demande est-il payant ?",
    answer:
      "Non, la demande est gratuite. Certains services peuvent ensuite être payants (visites, mise en relation, accompagnement) : votre conseiller vous explique les conditions avant toute transaction.",
  },
  {
    question: "Dans quels quartiers intervenez-vous ?",
    answer:
      "Nous couvrons les trois communes de Bukavu (Ibanda, Kadutu et Bagira) et leurs quartiers. Pour une recherche ailleurs au Sud-Kivu, écrivez-nous : nous vous dirons si notre réseau peut vous aider.",
  },
  {
    question: "Les biens sont-ils vraiment vérifiés ?",
    answer:
      "Oui. Chaque bien est visité par notre équipe avant d'être proposé, et vous recevez des photos et vidéos réelles avant de vous déplacer.",
  },
  {
    question: "Combien de temps pour trouver un logement ?",
    answer:
      "Cela dépend de votre budget, du quartier et de la date d'entrée. Plus votre demande est précise, plus vite votre conseiller peut vous envoyer des propositions adaptées.",
  },
  {
    question: "Je suis propriétaire, comment confier mon bien ?",
    answer:
      "Remplissez le formulaire « Confier un bien » ou contactez-nous par téléphone ou sur WhatsApp. Notre équipe enregistre le bien et vous tient informé des visites et des propositions.",
  },
  {
    question: "Que deviennent mes informations personnelles ?",
    answer:
      "Elles servent uniquement à traiter votre demande et ne sont jamais vendues. Vous pouvez demander à les consulter, les corriger ou les supprimer. Tous les détails sont dans notre politique de confidentialité.",
  },
]
