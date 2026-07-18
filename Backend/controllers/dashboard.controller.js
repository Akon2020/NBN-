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
} from "../models/index.model.js";
import { getEffectivePermissions } from "../utils/rbac.js";

// ADMIN-G00 — le tableau de bord (page d'accueil du dashboard) affichait
// jusqu'ici des chiffres et une "activité récente" entièrement inventés en
// dur côté Frontend. Cet endpoint agrège des compteurs réels, chaque bloc
// n'étant renvoyé que si l'utilisateur a la permission de lire le domaine
// correspondant (jamais de logique d'autorisation dupliquée côté client,
// CLAUDE.md §2.2) — les biens/favoris restent visibles de tous les
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
          detail: [p.propertyType, p.quartier].filter(Boolean).join(" — "),
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
