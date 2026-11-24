"use client"

import { useEffect, useState } from "react"
import { Coins, Loader2, Mail, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getAppSettings, updateAppSetting } from "@/actions/appSettings"
import { PROPERTY_KINDS } from "@/lib/propertyKinds"
import { toast } from "sonner"

type AckTemplate = { subject: string; body: string }
type CommissionRule = { mode: "MANUEL" | "POURCENTAGE" | "MONTANT_FIXE"; valeur: number | null; parType: Record<string, number> }

const ACK_KEY = "emails.rentalRequestAcknowledgement"
const RULE_KEY = "commissions.commissionnaireRule"
const VARIABLES = ["[N° de demande]", "[Civilité]", "[Prénom du client]", "[Date de la demande]"]

// Paramètres structurés réglables par l'administration sans toucher au
// code : modèle de l'accusé de réception (P1.8) et règle de commission des
// commissionnaires (P1.2). Le Backend valide la forme de chaque valeur.
export function SettingsTemplatePanels() {
  const [template, setTemplate] = useState<AckTemplate | null>(null)
  const [rule, setRule] = useState<CommissionRule | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [savingRule, setSavingRule] = useState(false)

  useEffect(() => {
    getAppSettings()
      .then((settings) => {
        const ack = settings.find((s) => s.key === ACK_KEY)
        const commission = settings.find((s) => s.key === RULE_KEY)
        if (ack) setTemplate(ack.value as AckTemplate)
        if (commission) {
          const value = commission.value as CommissionRule
          setRule({ ...value, parType: value.parType ?? {} })
        }
      })
      .catch(() => {
        // Sans settings:read, les panneaux ne s'affichent pas.
      })
  }, [])

  const saveTemplate = async () => {
    if (!template) return
    setSavingTemplate(true)
    try {
      await updateAppSetting(ACK_KEY, template)
      toast.success("Modèle d'accusé de réception enregistré")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSavingTemplate(false)
    }
  }

  const saveRule = async () => {
    if (!rule) return
    setSavingRule(true)
    try {
      await updateAppSetting(RULE_KEY, rule)
      toast.success("Règle de commission enregistrée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSavingRule(false)
    }
  }

  return (
    <>
      {template && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" aria-hidden />
              Accusé de réception au client
            </CardTitle>
            <CardDescription>
              Envoyé automatiquement après chaque demande de location. Variables disponibles :{" "}
              {VARIABLES.map((variable) => (
                <code key={variable} className="mx-0.5 rounded bg-muted px-1 text-xs">
                  {variable}
                </code>
              ))}
              . Sans civilité connue, le message commence par « Bonjour » suivi du nom.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ack-subject">Objet</Label>
              <Input
                id="ack-subject"
                value={template.subject}
                maxLength={200}
                onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ack-body">Message</Label>
              <Textarea
                id="ack-body"
                rows={12}
                maxLength={5000}
                value={template.body}
                onChange={(e) => setTemplate({ ...template, body: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveTemplate} disabled={savingTemplate || !template.subject.trim() || !template.body.trim()}>
                {savingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer le modèle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rule && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" aria-hidden />
              Commission des commissionnaires
            </CardTitle>
            <CardDescription>
              La commission d&apos;un commissionnaire est un pourcentage du loyer mensuel (ou du prix pour une vente).
              Tant qu&apos;aucun pourcentage n&apos;est saisi ici, il est demandé à chaque commission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mode de calcul">
              {[
                { value: "MANUEL", label: "Manuel" },
                { value: "POURCENTAGE", label: "Pourcentage du loyer" },
                { value: "MONTANT_FIXE", label: "Montant fixe" },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={rule.mode === option.value}
                  variant={rule.mode === option.value ? "default" : "outline"}
                  onClick={() => setRule({ ...rule, mode: option.value as CommissionRule["mode"] })}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {rule.mode !== "MANUEL" && (
              <>
                <div className="space-y-2 sm:max-w-xs">
                  <Label htmlFor="rule-value">{rule.mode === "POURCENTAGE" ? "Pourcentage du loyer (%)" : "Montant par défaut"}</Label>
                  <Input
                    id="rule-value"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={rule.valeur ?? ""}
                    onChange={(e) => setRule({ ...rule, valeur: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Par type de bien (facultatif, prioritaire sur la valeur par défaut)</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {PROPERTY_KINDS.map((kind) => (
                      <div key={kind.value} className="space-y-1">
                        <Label htmlFor={`rule-${kind.value}`} className="text-xs">
                          {kind.label}
                        </Label>
                        <Input
                          id={`rule-${kind.value}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={rule.parType?.[kind.value] ?? ""}
                          onChange={(e) => {
                            const parType = { ...(rule.parType ?? {}) }
                            if (e.target.value === "") delete parType[kind.value]
                            else parType[kind.value] = Number(e.target.value)
                            setRule({ ...rule, parType })
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-end">
              <Button onClick={saveRule} disabled={savingRule}>
                {savingRule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer la règle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
