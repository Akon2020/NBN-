import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { COMPANY } from "@/lib/company"

export const metadata: Metadata = {
  title: "Mentions légales | Nyumbani Express",
  description: "Informations sur l'éditeur du site Nyumbani Express.",
}

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Mentions légales"
      updatedAt="24 novembre 2026"
      intro={<p>Informations sur l&apos;éditeur du site {COMPANY.website.replace("https://", "")}.</p>}
      sections={[
        {
          id: "editeur",
          title: "Éditeur du site",
          content: (
            <ul>
              <li>
                <strong>{COMPANY.legalName}</strong>, agence immobilière
              </li>
              <li>{COMPANY.address}</li>
              <li>
                Téléphone : <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>{COMPANY.phone}</a>
              </li>
              <li>
                E-mail : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              </li>
            </ul>
          ),
        },
        {
          id: "hebergement",
          title: "Hébergement",
          content: (
            <p>
              Le site et ses données sont hébergés par un prestataire d&apos;hébergement professionnel, sur des
              serveurs accessibles uniquement en connexion chiffrée.
            </p>
          ),
        },
        {
          id: "propriete",
          title: "Propriété intellectuelle",
          content: (
            <p>
              La marque {COMPANY.name}, le logo, les textes et les photos du site sont protégés. Toute reproduction
              sans autorisation écrite de l&apos;agence est interdite.
            </p>
          ),
        },
        {
          id: "liens",
          title: "Pour aller plus loin",
          content: (
            <p>
              Consultez nos <Link href="/conditions">conditions d&apos;utilisation</Link> et notre{" "}
              <Link href="/confidentialite">politique de confidentialité</Link>.
            </p>
          ),
        },
      ]}
    />
  )
}
