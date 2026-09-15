import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Fiche PDF d'une demande de location : jointe à l'e-mail d'une tâche
// assignée, et téléchargeable depuis « Demandes reçues ». Générée à la
// demande, jamais stockée (même principe que les autres rapports).

const A4 = [595.28, 841.89];
const MARGIN = 50;
const CONTENT_WIDTH = A4[0] - MARGIN * 2;
const LABEL_WIDTH = 170;
const NAVY = rgb(0.078, 0.161, 0.29);
const MUTED = rgb(0.36, 0.39, 0.45);
const TEXT = rgb(0.086, 0.094, 0.114);

const TYPES_BIEN = {
  APPARTEMENT: "Appartement",
  MAISON: "Maison",
  STUDIO: "Studio",
  CHAMBRE: "Chambre",
  BUREAU: "Bureau",
  LOCAL_COMMERCIAL: "Local commercial",
  AUTRE: "Autre",
};
const USAGES = {
  HABITATION: "Habitation personnelle",
  BUREAU: "Bureau professionnel",
  COMMERCIAL: "Activité commerciale",
  MIXTE: "Mixte",
};
const MODALITES = {
  AVANCE_1_GARANTIE_3: "1 mois d'avance + 3 mois de garantie",
  MENSUEL: "Mensuel",
  AVANCE_2_GARANTIE_3: "2 mois d'avance + 3 mois de garantie",
  AVANCE_3_GARANTIE_2: "3 mois d'avance + 2 mois de garantie",
  AVANCE_3_GARANTIE_3: "3 mois d'avance + 3 mois de garantie",
  GARANTIE_6: "6 mois de garantie",
};
const URGENCES = {
  IMMEDIAT: "Immédiat",
  "1_2_SEMAINES": "1 à 2 semaines",
  "1_MOIS": "Dans 1 mois",
  FLEXIBLE: "Flexible",
};
const OCCUPANTS = {
  FAMILLE_NOMBREUSE: "Famille nombreuse",
  FAMILLE_PEU_NOMBREUSE: "Famille moins nombreuse",
  COUPLE: "Couple",
};
const CANAUX = {
  TERRAIN: "Terrain",
  APPEL: "Appel téléphonique",
  WHATSAPP: "WhatsApp",
  RESEAU: "Réseau / Recommandation",
};

// Les polices standard PDF ne couvrent que le jeu WinAnsi (latin + accents
// français) : tout autre caractère (emoji, écritures non latines) ferait
// échouer la génération entière, on le retire.
const safe = (value) =>
  String(value ?? "")
    .replace(/[\r\t]/g, " ")
    .replace(/[^\n\x20-\x7E -ÿ–—‘’“”…€•Œœ]/g, "")
    .trim();

const orOther = (map, value, other) => (value === "AUTRE" ? other : map[value] || value);
const money = (value, devise) =>
  value === null || value === undefined || value === "" ? null : `${Number(value).toLocaleString("fr-FR")} ${devise || "USD"}`;

export const generateRentalRequestPdf = async (request) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dossier = request.client?.dossierNumber || `DL-${request.idRentalRequest}`;
  pdf.setTitle(`Fiche demande de location ${dossier}`);
  pdf.setAuthor("NBN Express");

  let page;
  let y;

  const newPage = () => {
    page = pdf.addPage(A4);
    page.drawRectangle({ x: 0, y: A4[1] - 56, width: A4[0], height: 56, color: NAVY });
    page.drawText("NBN Express", { x: MARGIN, y: A4[1] - 34, size: 16, font: bold, color: rgb(1, 1, 1) });
    page.drawText(safe(`Fiche de demande de location — ${dossier}`), {
      x: MARGIN + 110,
      y: A4[1] - 33,
      size: 11,
      font,
      color: rgb(1, 1, 1),
    });
    y = A4[1] - 90;
  };

  const ensureSpace = (height) => {
    if (y - height < MARGIN) newPage();
  };

  // Découpe un texte en lignes qui tiennent dans `width`, en respectant les
  // retours à la ligne saisis par le client.
  const wrap = (text, fontToUse, size, width) =>
    safe(text)
      .split("\n")
      .flatMap((paragraph) => {
        const lines = [];
        let line = "";
        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
          const candidate = line ? `${line} ${word}` : word;
          if (fontToUse.widthOfTextAtSize(candidate, size) <= width) {
            line = candidate;
          } else {
            if (line) lines.push(line);
            line = word;
          }
        }
        lines.push(line);
        return lines;
      });

  const section = (title) => {
    ensureSpace(40);
    y -= 8;
    page.drawText(safe(title), { x: MARGIN, y, size: 12, font: bold, color: NAVY });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: MARGIN + CONTENT_WIDTH, y },
      thickness: 0.5,
      color: rgb(0.85, 0.86, 0.88),
    });
    y -= 16;
  };

  const row = (label, value) => {
    if (value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)) return;
    const lines = wrap(Array.isArray(value) ? value.join(", ") : value, font, 10, CONTENT_WIDTH - LABEL_WIDTH);
    ensureSpace(lines.length * 14 + 4);
    page.drawText(safe(label), { x: MARGIN, y, size: 10, font, color: MUTED });
    lines.forEach((line, index) => {
      page.drawText(line, { x: MARGIN + LABEL_WIDTH, y: y - index * 14, size: 10, font: bold, color: TEXT });
    });
    y -= lines.length * 14 + 4;
  };

  newPage();
  page.drawText(safe(request.fullName), { x: MARGIN, y, size: 18, font: bold, color: TEXT });
  y -= 18;
  page.drawText(
    safe(`Demande reçue le ${new Date(request.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Lubumbashi" })}`),
    { x: MARGIN, y, size: 10, font, color: MUTED }
  );
  y -= 20;

  section("Identification");
  row("Téléphone", request.phone);
  row("E-mail", request.email);
  row("Lieu de provenance", request.lieuProvenance);
  row("Résidence actuelle", request.residenceActuelle);
  row("Sexe", request.sexe === "MASCULIN" ? "Masculin" : request.sexe === "FEMININ" ? "Féminin" : null);
  row("Type de client", request.typeClient);
  row("Nous a connus par", orOther(CANAUX, request.canalContact, request.canalContactAutre));

  section("Recherche");
  row(
    "Types de bien",
    (request.typesBien || []).map((type) => (type === "AUTRE" ? request.typeBienAutre : TYPES_BIEN[type] || type))
  );
  row("Usage", USAGES[request.usageBien]);
  row("Ville", request.ville === "AUTRE" ? request.villeAutre : request.ville === "BUKAVU" ? "Bukavu" : request.ville);
  row("Commune", request.commune);
  row("Quartier", request.quartier);
  row("Avenue(s)", request.avenues);

  section("Budget");
  row("Budget minimum", money(request.budgetMin, request.devise));
  row("Budget maximum", money(request.loyerMax, request.devise));
  row("Modalité de paiement", orOther(MODALITES, request.modalitePaiement, request.modalitePaiementAutre));
  row("Charges incluses", request.chargesIncluses);

  section("Bien idéal");
  row("Chambres", request.nombreChambres === "AUTRE" ? request.nombreChambresAutre : request.nombreChambres);
  row("Salons", request.nombreSalons);
  row("Toilettes", request.nombreToilettes);
  row("Équipements", request.equipements);
  row("Avantages", [...(request.avantages || []).filter((a) => a !== "AUTRE"), request.avantageAutre].filter(Boolean));

  section("Disponibilité et occupants");
  row("Urgence", orOther(URGENCES, request.urgence, request.urgenceAutre));
  row("Date d'entrée souhaitée", request.dateEntree ? new Date(request.dateEntree).toLocaleDateString("fr-FR") : null);
  row(
    "Occupants",
    request.typeOccupants === "AUTRE" ? `${request.nombreOccupants} personne(s)` : OCCUPANTS[request.typeOccupants]
  );
  row("Éléments à considérer", request.elementsParticuliers);
  row("Orienté par", request.orienteParAgent ? request.codeCommissionnaire || "Oui" : "Non");
  row("Autres informations", request.autresInfos);

  ensureSpace(30);
  y -= 10;
  page.drawText("Document interne NBN Express — confidentiel, ne pas transmettre au client.", {
    x: MARGIN,
    y,
    size: 8,
    font,
    color: MUTED,
  });

  return pdf.save();
};
