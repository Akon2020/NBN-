import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"
import { COMPANY } from "@/lib/company"

export const metadata: Metadata = {
  title: "Politique de confidentialité | Nyumbani Express",
  description: "Comment Nyumbani Express collecte, utilise et protège vos informations personnelles.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt="24 novembre 2026"
      intro={
        <p>
          Cette page explique quelles informations {COMPANY.name} recueille lorsque vous utilisez ce site, pourquoi nous
          les recueillons, qui peut y accéder et comment exercer vos droits. Nous ne recueillons que ce qui est utile à
          votre demande, et nous ne vendons jamais vos informations.
        </p>
      }
      sections={[
        {
          id: "responsable",
          title: "Qui est responsable de vos données",
          content: (
            <p>
              Le responsable du traitement est <strong>{COMPANY.legalName}</strong>, agence immobilière située{" "}
              {COMPANY.address}. Pour toute question sur vos données, écrivez à{" "}
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
            </p>
          ),
        },
        {
          id: "donnees",
          title: "Les informations que nous recueillons",
          content: (
            <>
              <p>
                <strong>Demande de location.</strong> Votre nom, votre téléphone, votre adresse e-mail, le bien
                recherché (type, quartier, budget, date d&apos;entrée, composition du ménage) et, si vous en avez un,
                le code du commissionnaire qui vous a orienté.
              </p>
              <p>
                <strong>Bien confié à l&apos;agence.</strong> L&apos;identité et les coordonnées du propriétaire ou de
                son représentant, sa pièce d&apos;identité, la description, la localisation et les photos du bien.
              </p>
              <p>
                <strong>Comptes de l&apos;équipe et des commissionnaires.</strong> Le nom, l&apos;adresse e-mail, le
                téléphone, le rôle et, pour un commissionnaire, la pièce d&apos;identité. Pour la sécurité des
                comptes, nous enregistrons le type d&apos;appareil et la date de dernière activité de chaque session.
                Nous ne gardons pas d&apos;historique de localisation ni d&apos;empreinte détaillée de votre appareil.
              </p>
              <p>
                <strong>Messages.</strong> Le contenu des e-mails et messages que vous nous envoyez.
              </p>
            </>
          ),
        },
        {
          id: "finalites",
          title: "Pourquoi nous les utilisons",
          content: (
            <ul>
              <li>traiter votre demande et vous proposer des biens adaptés ;</li>
              <li>organiser les visites et la mise en relation avec les propriétaires ;</li>
              <li>vous envoyer un accusé de réception et suivre votre dossier ;</li>
              <li>enregistrer et présenter les biens confiés à l&apos;agence ;</li>
              <li>protéger les comptes et prévenir les fraudes ou les contournements.</li>
            </ul>
          ),
        },
        {
          id: "destinataires",
          title: "Qui peut y accéder",
          content: (
            <>
              <p>
                Seuls les membres de l&apos;équipe qui en ont besoin pour leur travail accèdent à vos informations :
                chaque accès dépend du rôle de la personne et est vérifié par nos serveurs. Les pièces d&apos;identité
                sont stockées à part, en accès restreint.
              </p>
              <p>
                Les informations nécessaires à l&apos;organisation d&apos;une visite peuvent être communiquées au
                propriétaire concerné. Nos prestataires techniques (hébergement du site, envoi des e-mails) traitent
                certaines données pour notre compte, sans pouvoir les utiliser à d&apos;autres fins.
              </p>
              <p>Nous ne vendons ni ne louons vos informations, et nous ne les utilisons pas à des fins publicitaires.</p>
            </>
          ),
        },
        {
          id: "conservation",
          title: "Combien de temps nous les gardons",
          content: (
            <p>
              Vos informations sont conservées le temps de traiter votre demande et de suivre la relation avec
              l&apos;agence, puis archivées ou supprimées selon notre politique interne de conservation. Les données
              financières et les journaux de sécurité sont gardés plus longtemps, pour la traçabilité des opérations.
            </p>
          ),
        },
        {
          id: "securite",
          title: "Comment nous les protégeons",
          content: (
            <ul>
              <li>le site est accessible uniquement en connexion chiffrée (HTTPS) ;</li>
              <li>les mots de passe ne sont jamais stockés en clair ;</li>
              <li>les liens de réinitialisation de mot de passe ne servent qu&apos;une fois et expirent rapidement ;</li>
              <li>les actions sensibles sont enregistrées dans un journal qui ne peut pas être modifié.</li>
            </ul>
          ),
        },
        {
          id: "cookies",
          title: "Cookies et stockage sur votre appareil",
          content: (
            <>
              <p>Nous n&apos;utilisons aucun cookie publicitaire. Le site enregistre seulement :</p>
              <ul>
                <li>un cookie de session, indispensable à la connexion de l&apos;équipe ;</li>
                <li>votre choix de thème (clair ou sombre) ;</li>
                <li>
                  le brouillon des formulaires, sur votre appareil uniquement, pour que vous puissiez reprendre plus
                  tard. Il n&apos;est envoyé qu&apos;au moment où vous validez le formulaire, et vous pouvez
                  l&apos;effacer à tout moment.
                </li>
              </ul>
              <p>Des statistiques de fréquentation anonymes peuvent être mesurées, sans cookie.</p>
            </>
          ),
        },
        {
          id: "droits",
          title: "Vos droits",
          content: (
            <>
              <p>
                Vous pouvez demander à consulter vos informations, à les corriger, à les supprimer ou à ne plus être
                contacté. Écrivez à <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ou appelez le{" "}
                <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>{COMPANY.phone}</a>. Nous pourrons vous demander de
                confirmer votre identité avant de répondre.
              </p>
              <p>
                Certaines informations peuvent être conservées quand la loi ou la traçabilité d&apos;une opération
                financière l&apos;exige.
              </p>
            </>
          ),
        },
        {
          id: "modifications",
          title: "Modifications de cette politique",
          content: (
            <p>
              Nous pouvons mettre à jour cette page, par exemple quand un nouveau service est ajouté. La date de
              dernière mise à jour figure en haut de la page.
            </p>
          ),
        },
      ]}
    />
  )
}
