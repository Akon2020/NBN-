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
import { updateClient } from "@/actions/clients"
import {
  CLIENT_PIPELINE_LABELS,
  CLIENT_PIPELINE_STAGES,
  type Client,
  type ClientScore,
  type ClientStatutPipeline,
  type ClientStatutRelance,
} from "@/lib/types"
import { toast } from "sonner"

interface EditClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client | null
  onEdit: (client: Client) => void
}

export function EditClientModal({ open, onOpenChange, client, onEdit }: EditClientModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [statutPipeline, setStatutPipeline] = useState<ClientStatutPipeline>("NOUVEAU")
  const [statutRelance, setStatutRelance] = useState<ClientStatutRelance | "">("")
  const [score, setScore] = useState<ClientScore | "">("")
  const [budgetMin, setBudgetMin] = useState("")
  const [budgetMax, setBudgetMax] = useState("")
  const [localisationQuartiers, setLocalisationQuartiers] = useState("")
  const [besoinTypeBien, setBesoinTypeBien] = useState("")
  const [notesAgent, setNotesAgent] = useState("")
  const [sourceCommissionnaireCode, setSourceCommissionnaireCode] = useState("")

  useEffect(() => {
    if (client) {
      setStatutPipeline(client.statutPipeline)
      setStatutRelance(client.statutRelance || "")
      setScore(client.score || "")
      setBudgetMin(client.budgetMin?.toString() || "")
      setBudgetMax(client.budgetMax?.toString() || "")
      setLocalisationQuartiers(client.localisationQuartiers || "")
      setBesoinTypeBien(client.besoinTypeBien || "")
      setNotesAgent(client.notesAgent || "")
      setSourceCommissionnaireCode(client.sourceCommissionnaireCode || "")
    }
  }, [client])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client) return

    setIsLoading(true)
    try {
      const updated = await updateClient(client.idClient, {
        statutPipeline,
        statutRelance: statutRelance || undefined,
        score: score || undefined,
        budgetMin: budgetMin ? Number.parseFloat(budgetMin) : undefined,
        budgetMax: budgetMax ? Number.parseFloat(budgetMax) : undefined,
        localisationQuartiers: localisationQuartiers || undefined,
        besoinTypeBien: besoinTypeBien || undefined,
        notesAgent: notesAgent || undefined,
        sourceCommissionnaireCode: sourceCommissionnaireCode || null,
      })
      onEdit(updated)
      onOpenChange(false)
      toast.success("Client mis à jour avec succès")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le client</DialogTitle>
          <DialogDescription>{client.person?.fullName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Statut pipeline</Label>
              <Select
                value={statutPipeline}
                onValueChange={(value: ClientStatutPipeline) => setStatutPipeline(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_PIPELINE_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {CLIENT_PIPELINE_LABELS[stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut de relance</Label>
              <Select
                value={statutRelance}
                onValueChange={(value: ClientStatutRelance) => setStatutRelance(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Non défini" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A_RELANCER">À relancer</SelectItem>
                  <SelectItem value="RELANCE">Relancé</SelectItem>
                  <SelectItem value="INACTIF">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Score de sérieux</Label>
              <Select value={score} onValueChange={(value: ClientScore) => setScore(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Non évalué" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SERIEUX">Sérieux</SelectItem>
                  <SelectItem value="MOYEN">Moyen</SelectItem>
                  <SelectItem value="FAIBLE">Faible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="besoinTypeBien">Type de bien recherché</Label>
              <Input
                id="besoinTypeBien"
                placeholder="Appartement 2 chambres..."
                value={besoinTypeBien}
                onChange={(e) => setBesoinTypeBien(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budgetMin">Budget min ($)</Label>
              <Input
                id="budgetMin"
                type="number"
                min="0"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetMax">Budget max ($)</Label>
              <Input
                id="budgetMax"
                type="number"
                min="0"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="localisationQuartiers">Quartiers recherchés</Label>
            <Input
              id="localisationQuartiers"
              placeholder="Ibanda, Nyalukemba..."
              value={localisationQuartiers}
              onChange={(e) => setLocalisationQuartiers(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceCommissionnaireCode">Code commissionnaire source</Label>
            <Input
              id="sourceCommissionnaireCode"
              placeholder="Ex. CMR-001 (laisser vide pour retirer l'attribution)"
              value={sourceCommissionnaireCode}
              onChange={(e) => setSourceCommissionnaireCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notesAgent">Notes de l'agent</Label>
            <Textarea
              id="notesAgent"
              rows={3}
              value={notesAgent}
              onChange={(e) => setNotesAgent(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground" disabled={isLoading}>
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
