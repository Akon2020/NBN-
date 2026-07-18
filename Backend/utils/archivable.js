// BACK-G21 — Archivage métier (CLAUDE.md §11), factorisé une seule fois car
// la forme est identique pour les quatre ressources concernées (biens,
// clients, réquisitions, missions) : marquer/démarquer `archivedAt` +
// `archiveReason`, jamais un `deletedAt` (soft delete Sequelize paranoid,
// concept distinct géré séparément par `.destroy()`/`.restore()`).
export const createArchiveHandlers = (Model, pkField, notFoundMessage) => {
  const archiveResource = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: "Le motif d'archivage est obligatoire" });
      }

      const resource = await Model.findByPk(id);
      if (!resource) {
        return res.status(404).json({ message: notFoundMessage });
      }
      if (resource.archivedAt) {
        return res.status(400).json({ message: "Déjà archivé" });
      }

      await resource.update({ archivedAt: new Date(), archiveReason: reason.trim() });
      return res.status(200).json({ message: "Archivé avec succès", data: resource });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
      next(error);
    }
  };

  const unarchiveResource = async (req, res, next) => {
    try {
      const { id } = req.params;
      const resource = await Model.findByPk(id);
      if (!resource) {
        return res.status(404).json({ message: notFoundMessage });
      }
      if (!resource.archivedAt) {
        return res.status(400).json({ message: "N'est pas archivé" });
      }

      await resource.update({ archivedAt: null, archiveReason: null });
      return res.status(200).json({ message: "Désarchivé avec succès", data: resource });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
      next(error);
    }
  };

  return { archiveResource, unarchiveResource };
};
