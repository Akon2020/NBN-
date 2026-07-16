import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// CLAUDE.md §7/§10 — "état de caisse" stylisé, un des rapports officiels
// explicitement cités. Généré à la demande (V1), jamais stocké — même
// principe que utils/requisitionPdf.js.
export const generateCaisseStatementPdf = async (caisse, ledgerEntries, { from, to }) => {
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
  const drawText = (text, size = 11, color = rgb(0, 0, 0), fontToUse = font) => {
    page.drawText(text, { x: left, y, size, font: fontToUse, color });
    y -= size + 8;
  };

  drawTitle(`État de caisse — ${caisse.label}`);
  drawText(`Période : ${from.toLocaleDateString("fr-FR")} — ${to.toLocaleDateString("fr-FR")}`, 10, rgb(0.4, 0.4, 0.4));
  drawText(`Statut : ${caisse.statut}`, 10, rgb(0.4, 0.4, 0.4));
  y -= 10;

  drawText("Soldes actuels", 13, rgb(0, 0, 0), bold);
  for (const balance of caisse.balances || []) {
    drawText(`${balance.currencyCode} : ${Number(balance.balance).toLocaleString("fr-FR")}`);
  }
  y -= 10;

  drawText(`Mouvements (${ledgerEntries.length})`, 13, rgb(0, 0, 0), bold);
  y -= 4;
  for (const entry of ledgerEntries) {
    if (y < 60) break; // V1 : une seule page, pagination hors scope initial.
    const sign = entry.type === "ENTREE" ? "+" : "-";
    drawText(
      `${new Date(entry.createdAt).toLocaleDateString("fr-FR")}  ${sign}${Number(entry.amount).toLocaleString("fr-FR")} ${entry.currencyCode}  (solde : ${Number(entry.balanceAfter).toLocaleString("fr-FR")})`,
      9,
      rgb(0.2, 0.2, 0.2)
    );
  }

  return pdfDoc.save();
};
