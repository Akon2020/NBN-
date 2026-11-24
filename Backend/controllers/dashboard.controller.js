import { fn, col, Op } from "sequelize";
import { PERIODS, periodBounds } from "../shared/periods.js";
import { PROPERTY_KINDS, propertyKindOf } from "../shared/propertyKinds.js";
import {
  Property,
  PropertyImage,
  Favorite,
  Proposal,
  Client,
  Person,
  User,
  Mission,
  Requisition,
  Caisse,
  Commission,
  CashMovement,
  Commissionnaire,
  RentalRequest,
} from "../models/index.model.js";
import { getEffectivePermissions } from "../utils/rbac.js";

// ADMIN-G00 - le tableau de bord (page d'accueil du dashboard) affichait
// jusqu'ici des chiffres et une "activité récente" entièrement inventés en
// dur côté Frontend. Cet endpoint agrège des compteurs réels, chaque bloc
// n'étant renvoyé que si l'utilisateur a la permission de lire le domaine
// correspondant (jamais de logique d'autorisation dupliquée côté client,
// CLAUDE.md §2.2) - les biens/favoris restent visibles de tous les
// utilisateurs authentifiés, comme le reste de l'API properties/favorites.
export const getDashboardStats = async (req, res, next) => {
  try {
    const permissions = await getEffectivePermissions(req.user);
    const can = (key) => permissions === "ALL" || permissions.has(key);

    const [rentals, sales, totalImages, favoritesCount] = await Promise.all([
      Property.count({ where: { category: "RENT", archivedAt: null } }),
      Property.count({ where: { category: "SALE", archivedAt: null } }),
      PropertyImage.count(),
      Favorite.count(),
    ]);

    const stats = {
      properties: { rentals, sales, totalImages },
      favorites: favoritesCount,
    };

    const activityQueries = [
      Property.findAll({
        limit: 5,
        order: [["createdAt", "DESC"]],
        attributes: ["idProperty", "category", "propertyType", "quartier", "createdAt"],
      }).then((rows) =>
        rows.map((p) => ({
          type: "PROPERTY",
          id: p.idProperty,
          label: `Nouveau bien ${p.category === "RENT" ? "à louer" : "à vendre"}`,
          detail: [p.propertyType, p.quartier].filter(Boolean).join(" - "),
          date: p.createdAt,
        }))
      ),
    ];

    if (can("clients:read")) {
      const [clientsCount, proposalsCount] = await Promise.all([
        Client.count({ where: { archivedAt: null } }),
        Proposal.count(),
      ]);
      stats.clients = clientsCount;
      stats.proposals = proposalsCount;

      activityQueries.push(
        Client.findAll({
          limit: 5,
          order: [["createdAt", "DESC"]],
          include: [{ model: Person, as: "person", attributes: ["fullName"] }],
        }).then((rows) =>
          rows.map((c) => ({
            type: "CLIENT",
            id: c.idClient,
            label: "Nouveau client",
            detail: c.person?.fullName || `Client #${c.idClient}`,
            date: c.createdAt,
          }))
        )
      );
    }

    if (can("users:read")) {
      stats.activeUsers = await User.count({ where: { status: "ACTIVE" } });
    }

    if (can("missions:read")) {
      stats.pendingMissions = await Mission.count({
        where: { statut: "SOUMISE", archivedAt: null },
      });

      activityQueries.push(
        Mission.findAll({ limit: 5, order: [["createdAt", "DESC"]] }).then((rows) =>
          rows.map((m) => ({
            type: "MISSION",
            id: m.idMission,
            label: "Mission terrain soumise",
            detail: m.type,
            date: m.createdAt,
          }))
        )
      );
    }

    if (can("requisitions:read")) {
      stats.pendingRequisitions = await Requisition.count({
        where: { statut: "SOUMISE", archivedAt: null },
      });

      activityQueries.push(
        Requisition.findAll({ limit: 5, order: [["createdAt", "DESC"]] }).then((rows) =>
          rows.map((r) => ({
            type: "REQUISITION",
            id: r.idRequisition,
            label: "Réquisition soumise",
            detail: r.nature,
            date: r.createdAt,
          }))
        )
      );
    }

    if (can("treasury:read")) {
      stats.openCaisses = await Caisse.count({ where: { statut: "OUVERTE" } });
    }

    if (can("commissions:read")) {
      stats.pendingCommissions = await Commission.count({ where: { statut: "DUE" } });
    }

    const activityLists = await Promise.all(activityQueries);
    stats.recentActivity = activityLists
      .flat()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    return res.status(200).json({ data: stats });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const MONTH_BUCKET = fn("DATE_FORMAT", col("createdAt"), "%Y-%m");

// GOAL 19 - répartitions et tendances réelles pour le dashboard exécutif,
// même patron RBAC que `getDashboardStats` ci-dessus (permissions
// résolues une seule fois, chaque bloc n'est renvoyé que si l'appelant a
// le droit de lire le domaine correspondant). CLAUDE.md §4 - jamais de
// somme implicite entre devises différentes : les séries financières sont
// groupées par (mois, currencyCode), jamais fusionnées.
export const getDashboardCharts = async (req, res, next) => {
  try {
    const permissions = await getEffectivePermissions(req.user);
    const can = (key) => permissions === "ALL" || permissions.has(key);

    const charts = {};

    const [propertiesByType, propertiesByStatut] = await Promise.all([
      Property.findAll({
        where: { archivedAt: null },
        attributes: ["propertyType", [fn("COUNT", col("idProperty")), "count"]],
        group: ["propertyType"],
        raw: true,
      }),
      Property.findAll({
        where: { archivedAt: null },
        attributes: ["statut", [fn("COUNT", col("idProperty")), "count"]],
        group: ["statut"],
        raw: true,
      }),
    ]);
    charts.propertiesByType = propertiesByType.map((row) => ({
      propertyType: row.propertyType,
      count: Number(row.count),
    }));
    charts.propertiesByStatut = propertiesByStatut.map((row) => ({
      statut: row.statut,
      count: Number(row.count),
    }));

    if (can("clients:read")) {
      const clientPipeline = await Client.findAll({
        where: { archivedAt: null },
        attributes: ["statutPipeline", [fn("COUNT", col("idClient")), "count"]],
        group: ["statutPipeline"],
        raw: true,
      });
      charts.clientPipeline = clientPipeline.map((row) => ({
        statutPipeline: row.statutPipeline,
        count: Number(row.count),
      }));
    }

    if (can("treasury:read")) {
      const cashflowByMonth = await CashMovement.findAll({
        attributes: [
          [MONTH_BUCKET, "month"],
          "currencyCode",
          "type",
          [fn("SUM", col("amount")), "total"],
        ],
        group: [MONTH_BUCKET, "currencyCode", "type"],
        order: [[MONTH_BUCKET, "ASC"]],
        limit: 72,
        raw: true,
      });
      charts.cashflowByMonth = cashflowByMonth.map((row) => ({
        month: row.month,
        currencyCode: row.currencyCode,
        type: row.type,
        total: Number(row.total),
      }));
    }

    if (can("commissions:read")) {
      const commissionsByMonth = await Commission.findAll({
        attributes: [
          [MONTH_BUCKET, "month"],
          "currencyCode",
          "statut",
          [fn("SUM", col("montantCommission")), "total"],
        ],
        group: [MONTH_BUCKET, "currencyCode", "statut"],
        order: [[MONTH_BUCKET, "ASC"]],
        limit: 72,
        raw: true,
      });
      charts.commissionsByMonth = commissionsByMonth.map((row) => ({
        month: row.month,
        currencyCode: row.currencyCode,
        statut: row.statut,
        total: Number(row.total),
      }));
    }

    if (can("commissionnaires:read")) {
      const topCommissionnaires = await Commissionnaire.findAll({
        where: { statut: "ACTIF" },
        include: [{ model: Person, as: "person", attributes: ["fullName"] }],
        order: [["scoreGlobal", "DESC"]],
        limit: 8,
      });
      charts.commissionnairePerformance = topCommissionnaires.map((c) => ({
        idCommissionnaire: c.idCommissionnaire,
        fullName: c.person?.fullName || c.code,
        code: c.code,
        scoreGlobal: Number(c.scoreGlobal),
      }));
    }

    return res.status(200).json({ data: charts });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

/**
 * Bloc « Aperçu » du tableau de bord (P1.10), calculé côté serveur sur la
 * période choisie, bornes à l'heure de Bukavu (shared/periods.js).
 * - demandesRecues : demandes de location reçues (fiches supprimées
 *   comprises : elles ont bien été reçues).
 * - demandesTraitees : parmi elles, celles dont le client a dépassé l'étape
 *   « Nouveau » du pipeline (biens proposés, visite, négociation, conclu ou
 *   perdu). Définition proposée, à confirmer par l'agence.
 * - collectes : biens enregistrés sur la période, au total et par type de
 *   la liste unique.
 * - commissionnaires : actifs (actif, observation) et inactifs (suspendu,
 *   exclu), à date.
 * Chaque bloc n'est renvoyé qu'avec la permission de lecture du domaine.
 */
export const getDashboardOverview = async (req, res, next) => {
  try {
    const period = PERIODS.includes(req.query.period) ? req.query.period : "day";
    const { start, end } = periodBounds(period);
    const inPeriod = { createdAt: { [Op.gte]: start, [Op.lt]: end } };
    const permissions = await getEffectivePermissions(req.user);
    const can = (key) => permissions === "ALL" || permissions.has(key);

    const overview = { period, start, end };

    if (can("clients:read")) {
      const requests = await RentalRequest.findAll({
        where: inPeriod,
        paranoid: false,
        attributes: ["idRentalRequest"],
        include: [{ model: Client, as: "client", attributes: ["statutPipeline"], paranoid: false }],
      });
      overview.demandes = {
        recues: requests.length,
        traitees: requests.filter((r) => r.client && r.client.statutPipeline !== "NOUVEAU").length,
      };
    }

    const byType = await Property.findAll({
      where: inPeriod,
      attributes: ["propertyType", [fn("COUNT", col("idProperty")), "total"]],
      group: ["propertyType"],
      raw: true,
    });
    const parType = Object.fromEntries(PROPERTY_KINDS.map((kind) => [kind.value, 0]));
    let totalCollectes = 0;
    for (const row of byType) {
      const count = Number(row.total);
      totalCollectes += count;
      const kind = propertyKindOf(row.propertyType);
      if (kind) parType[kind] += count;
    }
    overview.collectes = { total: totalCollectes, parType };

    if (can("commissionnaires:read")) {
      const agents = await Commissionnaire.findAll({ attributes: ["statut"] });
      const actifs = agents.filter((a) => ["ACTIF", "OBSERVATION"].includes(a.statut)).length;
      overview.commissionnaires = { actifs, inactifs: agents.length - actifs };
    }

    return res.status(200).json({ data: overview });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
