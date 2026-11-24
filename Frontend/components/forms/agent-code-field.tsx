"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { lookupFieldAgent, type FieldAgentLookup } from "@/actions/propertyCollections"
import { TextField } from "@/components/forms/form-fields"

type Props = {
  value: string
  onChange: (value: string) => void
  // Normalise la saisie ("cmr 42" → "CMR-042") ; null si le format est faux.
  normalize: (raw: string) => string | null
  placeholder: string
  // Fiche vérifiée en base, ou null tant que le code n'est pas confirmé.
  onVerified: (agent: FieldAgentLookup | null) => void
  readOnly?: boolean
}

/**
 * Code commissionnaire (CMR) ou collecteur (CTR) vérifié auprès de l'API dès
 * que le format est bon : le nom et le téléphone de la fiche s'affichent, le
 * formulaire ne passe pas l'étape tant que le code n'est pas confirmé.
 */
export function AgentCodeField({ value, onChange, normalize, placeholder, onVerified, readOnly }: Props) {
  const [state, setState] = useState<"idle" | "checking" | "ok" | "error">("idle")
  const [agent, setAgent] = useState<FieldAgentLookup | null>(null)
  const [message, setMessage] = useState("")
  const lastChecked = useRef<string | null>(null)
  const onVerifiedRef = useRef(onVerified)
  onVerifiedRef.current = onVerified

  useEffect(() => {
    const code = normalize(value)
    if (!code) {
      lastChecked.current = null
      setAgent(null)
      setState(value.trim() ? "error" : "idle")
      setMessage(value.trim() ? `Format attendu : ${placeholder}` : "")
      onVerifiedRef.current(null)
      return
    }
    if (code === lastChecked.current) return
    lastChecked.current = code
    setState("checking")
    const timer = setTimeout(() => {
      lookupFieldAgent(code)
        .then((found) => {
          setAgent(found)
          setState("ok")
          setMessage("")
          onVerifiedRef.current(found)
        })
        .catch((error) => {
          setAgent(null)
          setState("error")
          setMessage(error instanceof Error ? error.message : "Code introuvable.")
          onVerifiedRef.current(null)
        })
    }, 350)
    return () => clearTimeout(timer)
  }, [value, normalize, placeholder])

  return (
    <div className="space-y-2">
      <TextField
        value={value}
        onChange={onChange}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        placeholder={`Ex. ${placeholder}`}
        readOnly={readOnly}
      />
      <div aria-live="polite" className="min-h-5 text-sm">
        {state === "checking" && (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Vérification du code...
          </span>
        )}
        {state === "ok" && agent && (
          <span className="flex items-start gap-2 rounded-lg bg-success-500/10 p-2.5 text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" aria-hidden />
            <span>
              <strong>{agent.fullName}</strong>
              {agent.phone ? ` · ${agent.phone}` : ""}
              <span className="block text-xs text-muted-foreground">Code {agent.code} vérifié</span>
            </span>
          </span>
        )}
        {state === "error" && message && (
          <span className="flex items-center gap-2 text-error-500">
            <XCircle className="h-4 w-4 shrink-0" aria-hidden />
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
