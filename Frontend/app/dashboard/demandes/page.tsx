"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClipboardList, Loader2, Phone, Search, ShieldAlert, User } from "lucide-react"
import { getAllRentalRequests } from "@/actions/rentalRequests"
import {
  CLIENT_PIPELINE_LABELS,
  MODALITE_PAIEMENT_CHOICES,
  TYPE_BIEN_SOUHAITE_CHOICES,
  URGENCE_CHOICES,
  USAGE_BIEN_CHOICES,
  type RentalRequest,
} from "@/lib/types"
import { toast } from "sonner"

const labelOf = (choices: { value: string; label: string }[], value?: string | null) =>
  choices.find((c) => c.value === value)?.label || value || "—"

const labelsOf = (choices: { value: string; label: string }[], values?: string[] | null) =>
  values && values.length ? values.map((v) => labelOf(choices, v)).join(", ") : "—"

function DetailLine({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "" || value === "—") return null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="w-56 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm break-words">{value}</span>
    </div>
  )
}

// Les demandes reçues via le formulaire public. La trace est immuable ici
// — le suivi commercial se fait sur la fiche client liée (pipeline), pas
// sur cet écran.
export default function DemandesPage() {
  const [requests, setRequests] = useState<RentalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<RentalRequest | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setRequests(await getAllRentalRequests())
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter(
      (r) => r.fullName.toLowerCase().includes(q) || (r.phone || "").toLowerCase().includes(q)
    )
  }, [requests, search])

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les demandes.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Demandes de location</h1>
        <p className="text-muted-foreground mt-2">
          Reçues via le formulaire public — chaque demande crée ou met à jour une fiche client sur le pipeline
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucune demande</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Aucun résultat pour cette recherche" : "Les demandes du formulaire public apparaîtront ici"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((request) => (
            <Card
              key={request.idRentalRequest}
              className="border-border cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setSelected(request)}
            >
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold">{request.fullName}</span>
                    {request.client && (
                      <Badge variant="outline">
                        {CLIENT_PIPELINE_LABELS[request.client.statutPipeline]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {request.phone}
                    </span>
                    <span>{labelsOf(TYPE_BIEN_SOUHAITE_CHOICES, request.typesBien)}</span>
                    {request.loyerMax && (
                      <span>
                        Max {Number(request.loyerMax).toLocaleString()} {request.devise}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(request.createdAt).toLocaleString("fr-FR")}
                    {request.client?.dossierNumber ? ` · ${request.client.dossierNumber}` : ""}
                  </p>
                </div>
                {request.client && (
                  <Link
                    href={`/dashboard/clients/${request.client.idClient}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-medium text-primary hover:underline shrink-0"
                  >
                    Voir la fiche client
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.fullName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-2">
                <section className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Identification</h4>
                  <DetailLine label="Téléphone" value={selected.phone} />
                  <DetailLine label="Lieu de provenance" value={selected.lieuProvenance} />
                  <DetailLine label="Résidence actuelle" value={selected.residenceActuelle} />
                  <DetailLine label="Sexe" value={selected.sexe} />
                  <DetailLine label="Type de client" value={selected.typeClient} />
                  <DetailLine
                    label="Canal de contact"
                    value={selected.canalContact === "AUTRE" ? selected.canalContactAutre : selected.canalContact}
                  />
                </section>

                <section className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Besoin</h4>
                  <DetailLine
                    label="Types de bien"
                    value={labelsOf(TYPE_BIEN_SOUHAITE_CHOICES, selected.typesBien)}
                  />
                  <DetailLine label="Autre type précisé" value={selected.typeBienAutre} />
                  <DetailLine label="Usage" value={labelOf(USAGE_BIEN_CHOICES, selected.usageBien)} />
                  <DetailLine
                    label="Localisation"
                    value={[selected.ville === "AUTRE" ? selected.villeAutre : selected.ville, selected.commune, selected.quartier]
                      .filter(Boolean)
                      .join(" — ")}
                  />
                  <DetailLine label="Avenues préférées" value={selected.avenues} />
                </section>

                <section className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Budget</h4>
                  <DetailLine
                    label="Loyer maximum"
                    value={selected.loyerMax ? `${Number(selected.loyerMax).toLocaleString()} ${selected.devise}` : null}
                  />
                  <DetailLine
                    label="Modalité de paiement"
                    value={
                      selected.modalitePaiement === "AUTRE"
                        ? selected.modalitePaiementAutre
                        : labelOf(MODALITE_PAIEMENT_CHOICES, selected.modalitePaiement)
                    }
                  />
                  <DetailLine label="Charges incluses" value={selected.chargesIncluses} />
                </section>

                <section className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Caractéristiques</h4>
                  <DetailLine
                    label="Chambres"
                    value={selected.nombreChambres === "AUTRE" ? selected.nombreChambresAutre : selected.nombreChambres}
                  />
                  <DetailLine label="Salons" value={selected.nombreSalons} />
                  <DetailLine label="Toilettes" value={selected.nombreToilettes} />
                  <DetailLine label="Équipements" value={selected.equipements?.join(", ")} />
                  <DetailLine label="Avantages" value={selected.avantages?.join(", ")} />
                  <DetailLine label="Autre avantage" value={selected.avantageAutre} />
                </section>

                <section className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Disponibilité</h4>
                  <DetailLine
                    label="Urgence"
                    value={selected.urgence === "AUTRE" ? selected.urgenceAutre : labelOf(URGENCE_CHOICES, selected.urgence)}
                  />
                  <DetailLine
                    label="Date d'entrée"
                    value={selected.dateEntree ? new Date(selected.dateEntree).toLocaleDateString("fr-FR") : null}
                  />
                </section>

                <section className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Compléments</h4>
                  <DetailLine label="Occupants" value={selected.nombreOccupants} />
                  <DetailLine label="Éléments à considérer" value={selected.elementsParticuliers?.join(", ")} />
                  <DetailLine
                    label="Orienté par un partenaire"
                    value={selected.orienteParAgent ? selected.codeCommissionnaire || "Oui" : "Non"}
                  />
                  <DetailLine label="Autres informations" value={selected.autresInfos} />
                  <DetailLine
                    label="Conditions acceptées le"
                    value={new Date(selected.conditionsAcceptedAt).toLocaleString("fr-FR")}
                  />
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
