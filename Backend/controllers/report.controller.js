import { Op } from "sequelize";
import {
  Caisse,
  CaisseBalance,
  LedgerEntry,
  Property,
  RentalProperty,
  SaleProperty,
  Commission,
  Client,
  Commissionnaire,
  Person,
  Currency,
  RentalRequest,
  User,
} from "../models/index.model.js";
import { serializeProperties } from "../utils/serializers/property.serializer.js";
import { generateCaisseStatementPdf } from "../utils/reports/caisseStatementPdf.js";
import { toCsv, toExcelBuffer } from "../utils/reports/tabularExport.js";

const parseRange = (query) => {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
};

// CLAUDE.md §7/§10 — "état de caisse" (rapport officiel stylisé),
// génération à la demande, jamais stocké.
export const getCaisseStatementPdf = async (req, res, next) => {
  try {
    const { from, to } = parseRange(req.query);

    const caisse = await Caisse.findByPk(req.params.id, {
      include: [{ model: CaisseBalance, as: "balances", include: [{ model: Currency, as: "currency" }] }],
    });
    if (!caisse) {
      return res.status(404).json({ message: "Caisse non trouvée" });
    }

    const ledgerEntries = await LedgerEntry.findAll({
      where: { idCaisse: caisse.idCaisse, createdAt: { [Op.between]: [from, to] } },
      order: [["createdAt", "ASC"]],
    });

    const pdfBytes = await generateCaisseStatementPdf(caisse.toJSON(), ledgerEntries, { from, to });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="etat-caisse-${caisse.idCaisse}.pdf"`
    );
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const PROPERTY_COLUMNS_BASE = [
  { header: "ID", key: "idProperty" },
  { header: "Catégorie", key: "category" },
  { header: "Type", key: "propertyType" },
  { header: "Quartier", key: "quartier" },
  { header: "Statut", key: "statut" },
  { header: "Prix", key: "price" },
];

// BACK-G20 — respecte le même field-level authorization que l'API REST :
// `serializeProperties(properties, req.user)` retire `margin` si
// l'utilisateur n'a pas `property:margin:read`, jamais une règle isolée
// codée en dur ici (CLAUDE.md §15 critère 3).
export const exportProperties = async (req, res, next) => {
  try {
    const format = req.query.format === "xlsx" ? "xlsx" : "csv";
    const properties = await Property.findAll({
      include: [
        { model: RentalProperty, as: "rentalDetails" },
        { model: SaleProperty, as: "saleDetails" },
      ],
    });
    const serialized = await serializeProperties(properties, req.user);

    const hasMarginColumn = serialized.some((p) => p.margin !== undefined);
    const columns = hasMarginColumn
      ? [...PROPERTY_COLUMNS_BASE, { header: "Marge", key: "margin" }]
      : PROPERTY_COLUMNS_BASE;

    if (format === "xlsx") {
      const buffer = await toExcelBuffer(serialized, columns, "Biens");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", 'attachment; filename="biens.xlsx"');
      return res.status(200).send(buffer);
    }

    const csv = toCsv(serialized, columns);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="biens.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const RENTAL_REQUEST_COLUMNS = [
  { header: "N° de dossier", key: "dossier" },
  { header: "Reçue le", key: "receivedAt" },
  { header: "Client", key: "fullName" },
  { header: "Téléphone", key: "phone" },
  { header: "E-mail", key: "email" },
  { header: "Commune", key: "commune" },
  { header: "Quartier", key: "quartier" },
  { header: "Budget minimum", key: "budgetMin" },
  { header: "Budget maximum", key: "loyerMax" },
  { header: "Devise", key: "devise" },
  { header: "Urgence", key: "urgence" },
  { header: "Statut", key: "statut" },
  { header: "Supprimée le", key: "deletedAtLabel" },
  { header: "Supprimée par", key: "deletedByName" },
  { header: "Motif de suppression", key: "deletionReason" },
];

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("fr-FR", { timeZone: "Africa/Lubumbashi" }) : "";

// Rapport des demandes de location, fiches supprimées comprises : c'est ici
// que le commentaire obligatoire d'une suppression reste consultable.
export const exportRentalRequests = async (req, res, next) => {
  try {
    const format = req.query.format === "xlsx" ? "xlsx" : "csv";
    const { from, to } = parseRange(req.query);
    const where = { createdAt: { [Op.between]: [from, to] } };
    if (req.query.deleted === "only") where.deletedAt = { [Op.ne]: null };

    const requests = await RentalRequest.findAll({
      where,
      paranoid: false,
      include: [
        { model: Client, as: "client", attributes: ["dossierNumber"], paranoid: false },
        { model: User, as: "deleter", attributes: ["fullName"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    const rows = requests.map((request) => ({
      dossier: request.client?.dossierNumber || `DL-${request.idRentalRequest}`,
      receivedAt: formatDateTime(request.createdAt),
      fullName: request.fullName,
      phone: request.phone,
      email: request.email || "",
      commune: request.commune || "",
      quartier: request.quartier || "",
      budgetMin: request.budgetMin ?? "",
      loyerMax: request.loyerMax ?? "",
      devise: request.devise,
      urgence: request.urgence === "AUTRE" ? request.urgenceAutre : request.urgence || "",
      statut: request.deletedAt ? "Supprimée" : "Active",
      deletedAtLabel: formatDateTime(request.deletedAt),
      deletedByName: request.deleter?.fullName || "",
      deletionReason: request.deletionReason || "",
    }));

    if (format === "xlsx") {
      const buffer = await toExcelBuffer(rows, RENTAL_REQUEST_COLUMNS, "Demandes");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="demandes-location.xlsx"');
      return res.status(200).send(buffer);
    }

    const csv = toCsv(rows, RENTAL_REQUEST_COLUMNS);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="demandes-location.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const COMMISSION_COLUMNS = [
  { header: "ID", key: "idCommission" },
  { header: "Bénéficiaire", key: "beneficiaireLabel" },
  { header: "Type", key: "beneficiaireType" },
  { header: "Montant transaction", key: "montantTransaction" },
  { header: "Montant commission", key: "montantCommission" },
  { header: "Devise", key: "currencyCode" },
  { header: "Statut", key: "statut" },
];

export const exportCommissions = async (req, res, next) => {
  try {
    const format = req.query.format === "xlsx" ? "xlsx" : "csv";
    const { from, to } = parseRange(req.query);

    const commissions = await Commission.findAll({
      where: { createdAt: { [Op.between]: [from, to] } },
      include: [
        { model: Client, as: "client", attributes: ["idClient"] },
        {
          model: Commissionnaire,
          as: "commissionnaire",
          attributes: ["code"],
          include: [{ model: Person, as: "person", attributes: ["fullName"] }],
        },
      ],
    });

    const rows = commissions.map((c) => ({
        idCommission: c.idCommission,
        beneficiaireLabel:
          c.beneficiaireType === "COMMISSIONNAIRE"
            ? c.commissionnaire?.person?.fullName || c.commissionnaire?.code
            : c.beneficiaireType === "AGENCE"
              ? "Agence"
              : `Agent #${c.beneficiaireUserId}`,
        beneficiaireType: c.beneficiaireType,
        montantTransaction: Number(c.montantTransaction),
        montantCommission: Number(c.montantCommission),
        currencyCode: c.currencyCode,
        statut: c.statut,
      }));

    if (format === "xlsx") {
      const buffer = await toExcelBuffer(rows, COMMISSION_COLUMNS, "Commissions");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", 'attachment; filename="commissions.xlsx"');
      return res.status(200).send(buffer);
    }

    const csv = toCsv(rows, COMMISSION_COLUMNS);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="commissions.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const LEDGER_COLUMNS = [
  { header: "Date", key: "date" },
  { header: "Type", key: "type" },
  { header: "Montant", key: "amount" },
  { header: "Devise", key: "currencyCode" },
  { header: "Solde après", key: "balanceAfter" },
  { header: "Description", key: "description" },
];

// GOAL 10 — export tabulaire (CSV/Excel) du ledger d'une caisse, en
// complément du PDF déjà existant (`getCaisseStatementPdf`) — même source
// de données (LedgerEntry, append-only), même filtrage par période.
export const exportCaisseLedger = async (req, res, next) => {
  try {
    const format = req.query.format === "xlsx" ? "xlsx" : "csv";
    const { from, to } = parseRange(req.query);

    const caisse = await Caisse.findByPk(req.params.id);
    if (!caisse) {
      return res.status(404).json({ message: "Caisse non trouvée" });
    }

    const ledgerEntries = await LedgerEntry.findAll({
      where: { idCaisse: caisse.idCaisse, createdAt: { [Op.between]: [from, to] } },
      order: [["createdAt", "ASC"]],
    });

    const rows = ledgerEntries.map((entry) => ({
      date: entry.createdAt.toISOString(),
      type: entry.type,
      amount: Number(entry.amount),
      currencyCode: entry.currencyCode,
      balanceAfter: Number(entry.balanceAfter),
      description: entry.description || "",
    }));

    if (format === "xlsx") {
      const buffer = await toExcelBuffer(rows, LEDGER_COLUMNS, "Ledger");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename="caisse-${caisse.idCaisse}-ledger.xlsx"`);
      return res.status(200).send(buffer);
    }

    const csv = toCsv(rows, LEDGER_COLUMNS);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="caisse-${caisse.idCaisse}-ledger.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
