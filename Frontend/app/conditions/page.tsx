import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { COMPANY, RENTAL_CONDITIONS } from "@/lib/company"

export const metadata: Metadata = {
  title: "Conditions d'utilisation | Nyumbani Express",
  description: "Les règles d'utilisation du site et des services de Nyumbani Express.",
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      updatedAt="24 novembre 2026"
      intro={
        <p>
          Ces conditions s&apos;appliquent à toute personne qui utilise le site de {COMPANY.name}, envoie une demande
          ou confie un bien à l&apos;agence. En utilisant le site, vous les acceptez.
        </p>
      }
      sections={[
        {
          id: "objet",
          title: "Nos services",
          content: (
            <p>
              {COMPANY.name} est une agence immobilière basée à Bukavu. Le site permet de nous décrire votre recherche
              de logement, de nous confier un bien et, pour l&apos;équipe, de gérer les dossiers. Les informations
              publiées sur le site sont données à titre indicatif : la disponibilité et les conditions d&apos;un bien
              sont confirmées par votre conseiller.
            </p>
          ),
        },
        {
          id: "demande",
          title: "Engagements lors d'une demande de location",
          content: (
            <>
              <p>En envoyant une demande de location, vous acceptez les engagements suivants :</p>
              <ol className="space-y-3">
                {RENTAL_CONDITIONS.map((condition, index) => (
                  <li key={condition.title} className="!ml-0 !list-none">
                    <strong>
                      {index + 1}. {condition.title}.
                    </strong>{" "}
                    {condition.body}
                  </li>
                ))}
              </ol>
            </>
          ),
        },
        {
          id: "bien",
          title: "Confier un bien",
          content: (
            <p>
              La personne qui confie un bien déclare en être le propriétaire ou être autorisée à le présenter, et
              fournit des informations exactes. L&apos;agence peut refuser ou retirer un bien dont les informations
              ne peuvent pas être vérifiées.
            </p>
          ),
        },
        {
          id: "compte",
          title: "Espace équipe et comptes",
          content: (
            <ul>
              <li>chaque compte est personnel : ne partagez jamais votre mot de passe ni votre clé d&apos;accès ;</li>
              <li>chaque personne ne voit que ce que son rôle lui permet de voir ;</li>
              <li>
                les informations des clients et des propriétaires sont confidentielles et ne doivent pas être
                utilisées en dehors de l&apos;agence ;
              </li>
              <li>un compte peut être suspendu en cas d&apos;usage contraire à ces règles.</li>
            </ul>
          ),
        },
        {
          id: "propriete",
          title: "Contenus du site",
          content: (
            <p>
              Les textes, photos, logos et la marque {COMPANY.name} appartiennent à l&apos;agence ou sont utilisés avec
              autorisation. Ils ne peuvent pas être copiés ou réutilisés sans notre accord écrit.
            </p>
          ),
        },
        {
          id: "responsabilite",
          title: "Responsabilité",
          content: (
            <p>
              Nous faisons notre possible pour que le site soit disponible et que les informations soient exactes,
              mais une interruption ou une erreur peut arriver, notamment en cas de coupure du réseau. Signalez-nous
              toute erreur, nous la corrigerons rapidement.
            </p>
          ),
        },
        {
          id: "donnees",
          title: "Vos informations personnelles",
          content: (
            <p>
              L&apos;utilisation de vos informations est décrite dans notre{" "}
              <Link href="/confidentialite">politique de confidentialité</Link>.
            </p>
          ),
        },
        {
          id: "droit",
          title: "Droit applicable et contact",
          content: (
            <p>
              Ces conditions sont régies par le droit de la République démocratique du Congo. En cas de désaccord,
              nous cherchons d&apos;abord une solution à l&apos;amiable : écrivez à{" "}
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ou appelez le{" "}
              <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>{COMPANY.phone}</a>.
            </p>
          ),
        },
      ]}
    />
  )
}
