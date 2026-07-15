"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ShieldCheck } from "lucide-react";
import { getAllUsers } from "@/actions/users";
import {
  createAccessGrant,
  getAllAccessGrants,
  getAllPermissions,
  revokeAccessGrant,
} from "@/actions/accessGrants";
import { AccessGrant, Permission, User } from "@/types/type";

// ADMIN-G02 — écran de gestion des AccessGrant. Le rôle "consultant" naît
// avec zéro permission de base (CLAUDE.md §5) ; c'est ici qu'un admin lui
// accorde des permissions unitaires, motivées et traçables.
export default function AccessGrantsPage() {
  const [consultants, setConsultants] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [users, perms, accessGrants] = await Promise.all([
        getAllUsers(),
        getAllPermissions(),
        getAllAccessGrants(),
      ]);
      setConsultants(users.filter((u) => u.role === "consultant"));
      setPermissions(perms);
      setGrants(accessGrants);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedPermission("");
    setReason("");
    setExpiresAt("");
    setFormError("");
  };

  const handleCreate = async () => {
    setFormError("");
    if (!selectedUserId || !selectedPermission || !reason.trim()) {
      setFormError("Utilisateur, permission et motif sont obligatoires.");
      return;
    }
    setSubmitting(true);
    try {
      await createAccessGrant({
        idUser: Number(selectedUserId),
        permissionKey: selectedPermission,
        reason: reason.trim(),
        expiresAt: expiresAt || undefined,
      });
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la création de l'accès");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await revokeAccessGrant(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la révocation");
    }
  };

  const grantStatus = (grant: AccessGrant) => {
    if (grant.revokedAt) return { label: "Révoqué", variant: "secondary" as const };
    if (grant.expiresAt && new Date(grant.expiresAt) < new Date())
      return { label: "Expiré", variant: "secondary" as const };
    return { label: "Actif", variant: "default" as const };
  };

  const userLabel = (idUser: number) => {
    const user = consultants.find((c) => c.idUser === idUser);
    return user ? `${user.fullName} (${user.email})` : `Utilisateur #${idUser}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            Accès consultants
          </h1>
          <p className="text-muted-foreground mt-2">
            Le rôle consultant n'a aucune permission de base — tout accès
            passe par une exception explicite et motivée.
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-primary text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvel accès
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Chargement...</p>
          ) : grants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Aucun accès accordé</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Les consultants n'ont accès à rien tant qu'aucune exception
                n'est créée.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.map((grant) => {
                  const status = grantStatus(grant);
                  return (
                    <TableRow key={grant.idAccessGrant}>
                      <TableCell>{userLabel(grant.idUser)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {grant.permissionKey}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={grant.reason}>
                        {grant.reason}
                      </TableCell>
                      <TableCell>
                        {grant.expiresAt
                          ? new Date(grant.expiresAt).toLocaleDateString("fr-FR")
                          : "Permanent"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!grant.revokedAt && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive bg-transparent"
                            onClick={() => handleRevoke(grant.idAccessGrant)}
                          >
                            Révoquer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accorder un accès</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="space-y-2">
              <Label>Consultant</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un consultant" />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map((c) => (
                    <SelectItem key={c.idUser} value={String(c.idUser)}>
                      {c.fullName} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {consultants.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun utilisateur avec le rôle consultant pour le moment.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Permission</Label>
              <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une permission" />
                </SelectTrigger>
                <SelectContent>
                  {permissions.map((p) => (
                    <SelectItem key={p.idPermission} value={p.key}>
                      {p.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Motif (obligatoire)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Pourquoi cet accès est-il accordé ?"
              />
            </div>

            <div className="space-y-2">
              <Label>Expiration (optionnelle)</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Création..." : "Accorder l'accès"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
