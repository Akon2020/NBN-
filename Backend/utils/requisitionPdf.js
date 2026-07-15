import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// info.md §6, étape "Génération" — document de Réquisition de Fonds avec
// code de validation unique. Généré à la demande (pas stocké sur disque,
// contrainte cPanel/portabilité CLAUDE.md §12) à partir des données déjà
// figées à l'Approbation (`validationCode`, `decidedAt`) — le document est
// donc reproductible à l'identique à chaque téléchargement, jamais recalculé.
export const generateRequisitionPdf = async (requisition) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const left = 50;

  const drawTitle = (text) => {
    page.drawText(text, { x: left, y, size: 18, font: bold, color: rgb(0.08, 0.16, 0.29) });
    y -= 30;
  };
  const drawLine = (label, value) => {
    page.drawText(`${label} :`, { x: left, y, size: 11, font: bold });
    page.drawText(String(value ?? "—"), { x: left + 160, y, size: 11, font });
    y -= 20;
  };

  drawTitle("Réquisition de Fonds — NBN Express Plus");

  page.drawText("Nyumbani Express — document généré automatiquement", {
    x: left,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 30;

  drawLine("Code de validation", requisition.validationCode);
  drawLine("Statut", requisition.statut);
  drawLine("Demandeur", requisition.demandeur?.fullName);
  drawLine("Caisse", requisition.caisse?.label);
  drawLine("Nature du besoin", requisition.nature);
  drawLine("Quantité", requisition.quantite);
  drawLine(
    "Coût estimé",
    `${Number(requisition.coutEstime).toFixed(2)} ${requisition.currencyCode}`
  );
  drawLine("Justificatif", requisition.justificatif);
  drawLine("Approuvé par", requisition.decideur?.fullName);
  drawLine(
    "Date d'approbation",
    requisition.decidedAt ? new Date(requisition.decidedAt).toLocaleString("fr-FR") : "—"
  );

  y -= 20;
  page.drawText(
    "Ce document fait foi de l'approbation de la demande ci-dessus. Le code de",
    { x: left, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) }
  );
  y -= 14;
  page.drawText(
    "validation unique permet de vérifier son authenticité auprès de la trésorerie.",
    { x: left, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) }
  );

  return pdfDoc.save();
};
