"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { ClipboardList, LogIn, Menu, Phone, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/#biens", label: "Nos biens" },
  { href: "/#services", label: "Services" },
  { href: "/#etapes", label: "Comment ça marche" },
  { href: "/#apropos", label: "À propos" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

type Props = { phone: string };

// Barre de navigation fixée en haut de l'écran : vitrée sur la photo du
// hero, puis pleine (bleu de marque) dès que la page défile, pour rester
// lisible sur les sections claires. Sur téléphone, le menu s'ouvre en
// panneau plein écran (zones tactiles de 44 px minimum), rendu dans `body` :
// le flou d'arrière-plan de la barre ferait sinon du panneau `fixed` un
// enfant confiné à la barre.
export function LandingNav({ phone }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="fixed inset-x-0 top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
      <nav
        aria-label="Navigation principale"
        className={`mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl border px-3 py-2 backdrop-blur-xl transition-colors duration-300 sm:px-4 ${
          scrolled
            ? "border-white/10 bg-primary-900/95 shadow-xl shadow-black/20"
            : "border-white/20 bg-white/10 shadow-lg shadow-black/10"
        }`}
      >
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center gap-2.5"
          aria-label="Nyumbani Express, accueil"
        >
          <Image
            src="/nyumbani-logo.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg"
            priority
          />
          <span className="whitespace-nowrap leading-tight text-white">
            <span className="block font-[family-name:var(--font-display)] text-base font-bold tracking-tight">
              Nyumbani Express
            </span>
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-white/70 sm:block">
              Agence immobilière
            </span>
          </span>
        </Link>

        <ul className="hidden min-w-0 items-center gap-0.5 xl:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <ThemeToggle className="text-white hover:bg-white/10 hover:text-white" />
          <Link
            href="/auth/login"
            className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 lg:inline-flex"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Espace équipe
          </Link>
          <Link
            href="/demande-location"
            className="hidden items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#a83608] sm:inline-flex"
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            Faire une demande
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10 xl:hidden"
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            aria-controls="menu-mobile"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </nav>

      {open &&
        createPortal(
          <div
            id="menu-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-primary-900 px-5 pb-8 pt-5 text-white xl:hidden"
          >
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-display)] text-lg font-bold">
                Nyumbani Express
              </span>
              <div className="flex items-center gap-1">
                <ThemeToggle className="text-white hover:bg-white/10 hover:text-white" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10"
                  aria-label="Fermer le menu"
                >
                  <X className="h-6 w-6" aria-hidden />
                </button>
              </div>
            </div>
            <ul className="mt-8 space-y-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-3 text-lg font-medium hover:bg-white/10"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-auto space-y-3 pt-8">
              <Link
                href="/demande-location"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-600 font-semibold"
              >
                <ClipboardList className="h-5 w-5" aria-hidden />
                Faire une demande de location
              </Link>
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 font-medium"
              >
                <Phone className="h-5 w-5" aria-hidden />
                {phone}
              </a>
              <Link
                href="/auth/login"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl font-medium text-white/85"
              >
                <LogIn className="h-5 w-5" aria-hidden />
                Espace équipe
              </Link>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
