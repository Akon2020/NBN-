"use client"

import type React from "react"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { updateBailleur } from "@/actions/bailleurs"
import { isEmailFormatValid, normalizePhone } from "@/lib/contactValidation"
import {
  BAILLEUR_PRIORITE_LABELS,
  BAILLEUR_PRIORITES,
  BAILLEUR_TYPE_LABELS,
  type Bailleur,
  type BailleurFiabilite,
  type BailleurPriorite,
  type BailleurStatutRelation,
  type BailleurType,
  type BailleurValeur,
} from "@/lib/types"
import { toast } from "sonner"

interface EditBailleurModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bailleur: Bailleur | null
  onEdit: (bailleur: Bailleur) => void
}

// « Profil » modifiable : identité du bailleur + profil défini par l'agence.
export function EditBailleurModal({ open, onOpenChange, bailleur, onEdit }: EditBailleurModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [type, setType] = useState<BailleurType>("PROPRIETAIRE")
  const [priorite, setPriorite] = useState<BailleurPriorite>("STANDARD")
  const [statutRelation, setStatutRelation] = useState<BailleurStatutRelation>("ACTIF")
  const [fiabilite, setFiabilite] = useState<BailleurFiabilite | "">("")
  const [valeurBailleur, setValeurBailleur] = useState<BailleurValeur | "">("")
  const [margeAgence, setMargeAgence] = useState("")
  const [notes, setNotes] = useState("")

  // Le champ marge n'est affiché que si le Backend l'a réellement renvoyé
  // (field-level authorization, bailleur:marge:read) — jamais présumer un
  // droit d'édition à partir d'un champ absent.
  const canSeeMarge = bailleur?.margeAgence !== undefined

  useEffect(() => {
    if (bailleur) {
      setFullName(bailleur.person?.fullName || "")
      setPhone(bailleur.person?.phone || "")
      setEmail(bailleur.person?.email || "")
      setIdNumber(bailleur.person?.idNumber || "")
      setType(bailleur.type)
      setPriorite(bailleur.priorite)
      setStatutRelation(bailleur.statutRelation)
      setFiabilite(bailleur.fiabilite || "")
      setValeurBailleur(bailleur.valeurBailleur || "")
      setMargeAgence(bailleur.margeAgence?.toString() || "")
      setNotes(bailleur.notes || "")
    }
  }, [bailleur])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bailleur) return
    if (!fullName.trim()) return toast.error("Le nom du bailleur est requis.")
    if (phone.trim() && !normalizePhone(phone)) return toast.error("Le numéro de téléphone n'est pas valide.")
    if (email.trim() && !isEmailFormatValid(email)) return toast.error("L'adresse e-mail n'est pas valide.")

    setIsLoading(true)
    try {
      const updated = await updateBailleur(bailleur.idBailleur, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        idNumber: idNumber.trim(),
        type,
        priorite,
        statutRelation,
        fiabilite: fiabilite || undefined,
        valeurBailleur: valeurBailleur || undefined,
        margeAgence: canSeeMarge && margeAgence ? Number.parseFloat(margeAgence) : undefined,
        notes: notes || undefined,
      })
      onEdit(updated)
      onOpenChange(false)
      toast.success("Profil du bailleur mis à jour")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  if (!bailleur) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>{bailleur.dossierNumber || bailleur.person?.fullName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <section className="space-y-4">
            <h4 className="text-sm font-semibold">Identité</h4>
            <div className="space-y-2">
              <Label htmlFor="bailleur-name">
                {type === "SOCIETE" ? "Nom de la société / de l'établissement" : "Nom complet"} *
              </Label>
              <Input id="bailleur-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bailleur-phone">Téléphone</Label>
                <Input id="bailleur-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailleur-email">E-mail</Label>
                <Input
                  id="bailleur-email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bailleur-id-number">N° de pièce d&apos;identité</Label>
                <Input id="bailleur-id-number" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Statut du responsable</Label>
                <Select value={type} onValueChange={(value: BailleurType) => setType(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BAILLEUR_TYPE_LABELS) as BailleurType[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {BAILLEUR_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-semibold">Profil agence</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={priorite} onValueChange={(value: BailleurPriorite) => setPriorite(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BAILLEUR_PRIORITES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {BAILLEUR_PRIORITE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut de la relation</Label>
                <Select
                  value={statutRelation}
                  onValueChange={(value: BailleurStatutRelation) => setStatutRelation(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIF">Actif</SelectItem>
                    <SelectItem value="INACTIF">Inactif</SelectItem>
                    <SelectItem value="A_RELANCER">À relancer</SelectItem>
                    <SelectItem value="SUSPENDU">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fiabilité</Label>
                <Select value={fiabilite} onValueChange={(value: BailleurFiabilite) => setFiabilite(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Non évalué" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERIEUX">Sérieux</SelectItem>
                    <SelectItem value="MOYEN">Moyen</SelectItem>
                    <SelectItem value="DIFFICILE">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valeur du bailleur</Label>
                <Select
                  value={valeurBailleur}
                  onValueChange={(value: BailleurValeur) => setValeurBailleur(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Non évalué" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FAIBLE">Faible</SelectItem>
                    <SelectItem value="MOYEN">Moyen</SelectItem>
                    <SelectItem value="FORT">Fort</SelectItem>
                    <SelectItem value="PARTENAIRE_CLE">Partenaire clé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {canSeeMarge && (
              <div className="space-y-2 sm:max-w-[50%]">
                <Label htmlFor="margeAgence">Marge agence ($)</Label>
                <Input
                  id="margeAgence"
                  type="number"
                  min="0"
                  value={margeAgence}
                  onChange={(e) => setMargeAgence(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-accent-600 text-white hover:bg-accent-600/90" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
