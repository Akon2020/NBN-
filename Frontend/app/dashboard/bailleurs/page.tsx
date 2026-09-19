"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BellRing, Building2, Eye, Home, Loader2, Mail, Phone, Plus, Search, ShieldAlert, UserRound } from "lucide-react"
import { BailleurContactsDialog } from "@/components/bailleur-contacts-dialog"
import { BailleurEmailsDialog } from "@/components/bailleur-emails-dialog"
import {
  BAILLEUR_PRIORITE_BADGE_CLASS,
  BAILLEUR_PRIORITE_LABELS,
  BAILLEUR_PRIORITES,
  BAILLEUR_STATUT_LABELS,
  BAILLEUR_TYPE_LABELS,
  type Bailleur,
  type BailleurPriorite,
} from "@/lib/types"
import { getAllBailleurs } from "@/actions/bailleurs"
import { sortBailleurs } from "@/lib/bailleurs"
import { AddBailleurModal } from "@/components/bailleur-modals/add-bailleur-modal"
import { BailleurAvatar } from "@/components/bailleur-avatar"
import { BailleurPropertiesDialog } from "@/components/bailleur-properties-dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Listing des bailleurs : classés par profil (VIP → Inactif) puis par ordre
// alphabétique, chacun avec ses biens (« Aperçu ») et son identité (« Profil »).
export default function BailleursPage() {
  const [bailleurs, setBailleurs] = useState<Bailleur[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState("")
  const [prioriteFilter, setPrioriteFilter] = useState<BailleurPriorite | "">("")
  const [previewBailleur, setPreviewBailleur] = useState<Bailleur | null>(null)
  const [showContacts, setShowContacts] = useState(false)
  const [showEmails, setShowEmails] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setBailleurs(sortBailleurs(await getAllBailleurs()))
      } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
          setForbidden(true)
        } else {
          toast.error(error instanceof Error ? error.message : "Erreur inconnue")
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const countsByPriorite = useMemo(
    () =>
      Object.fromEntries(
        BAILLEUR_PRIORITES.map((priorite) => [priorite, bailleurs.filter((b) => b.priorite === priorite).length])
      ) as Record<BailleurPriorite, number>,
    [bailleurs]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bailleurs.filter(
      (b) =>
        (!prioriteFilter || b.priorite === prioriteFilter) &&
        (!q ||
          (b.person?.fullName || "").toLowerCase().includes(q) ||
          (b.person?.phone || "").includes(q) ||
          (b.dossierNumber || "").toLowerCase().includes(q))
    )
  }, [bailleurs, search, prioriteFilter])

  const handleAdd = (bailleur: Bailleur) => setBailleurs((prev) => sortBailleurs([bailleur, ...prev]))

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les bailleurs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Bailleurs</h1>
          <p className="text-muted-foreground mt-2">Classés par profil (VIP → Inactif) puis par ordre alphabétique</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowContacts(true)}>
            <Phone className="mr-2 h-4 w-4" />
            Contacts
          </Button>
          <Button variant="outline" onClick={() => setShowEmails(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Emails
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/bailleurs/relances">
              <BellRing className="mr-2 h-4 w-4" />
              Relances
            </Link>
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-accent-600 text-white hover:bg-accent-600/90">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un bailleur
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:max-w-sm lg:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nom, téléphone ou n° de dossier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={prioriteFilter === "" ? "default" : "outline"} onClick={() => setPrioriteFilter("")}>
            Tous ({bailleurs.length})
          </Button>
          {BAILLEUR_PRIORITES.map((priorite) => (
            <Button
              key={priorite}
              size="sm"
              variant={prioriteFilter === priorite ? "default" : "outline"}
              onClick={() => setPrioriteFilter(prioriteFilter === priorite ? "" : priorite)}
            >
              {BAILLEUR_PRIORITE_LABELS[priorite]} ({countsByPriorite[priorite] ?? 0})
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{bailleurs.length ? "Aucun résultat" : "Aucun bailleur"}</h3>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((bailleur) => (
            <Card key={bailleur.idBailleur} className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <BailleurAvatar photo={bailleur.photo} fullName={bailleur.person?.fullName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold text-lg">{bailleur.person?.fullName}</h3>
                      <Badge className={cn("shrink-0", BAILLEUR_PRIORITE_BADGE_CLASS[bailleur.priorite])}>
                        {BAILLEUR_PRIORITE_LABELS[bailleur.priorite]}
                      </Badge>
                    </div>
                    {bailleur.dossierNumber && (
                      <p className="text-[10px] font-mono text-muted-foreground">{bailleur.dossierNumber}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {BAILLEUR_TYPE_LABELS[bailleur.type]}
                      </Badge>
                      {bailleur.statutRelation !== "ACTIF" && (
                        <Badge variant="secondary" className="text-xs">
                          {BAILLEUR_STATUT_LABELS[bailleur.statutRelation]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {bailleur.person?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {bailleur.person.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    {bailleur.propertiesCount ?? 0} bien(s)
                  </span>
                </div>

                {/* `!= null` : un bailleur créé par la collecte n'a pas encore de marge. */}
                {bailleur.margeAgence != null && (
                  <div className="text-sm font-semibold text-primary">
                    Marge : ${Number(bailleur.margeAgence).toLocaleString("fr-FR")}
                  </div>
                )}

                <div className="flex gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewBailleur(bailleur)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Aperçu
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/dashboard/bailleurs/${bailleur.idBailleur}`}>
                      <UserRound className="mr-2 h-4 w-4" />
                      Profil
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddBailleurModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
      <BailleurContactsDialog bailleurs={bailleurs} open={showContacts} onOpenChange={setShowContacts} />
      <BailleurEmailsDialog bailleurs={bailleurs} open={showEmails} onOpenChange={setShowEmails} />
      <BailleurPropertiesDialog
        bailleur={previewBailleur}
        open={previewBailleur !== null}
        onOpenChange={(open) => !open && setPreviewBailleur(null)}
      />
    </div>
  )
}
