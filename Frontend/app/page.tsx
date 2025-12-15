import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, MapPin, Search, Smartphone, TrendingUp, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/nyumbani-logo.png" alt="Nyumbani Express" width={120} height={40} className="h-10 w-auto" />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Fonctionnalités
            </Link>
            <Link href="#about" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              À propos
            </Link>
            <Link href="#contact" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden md:inline-flex">
              <Link href="/auth/login">Connexion</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/auth/login">Commencer</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-background via-background to-muted">
        <div className="container mx-auto px-4 py-20 md:px-6 md:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
                  Trouvez votre <span className="text-primary">maison idéale</span> à Bukavu
                </h1>
                <p className="text-lg text-muted-foreground text-pretty leading-relaxed md:text-xl">
                  La plateforme immobilière moderne qui connecte les propriétaires et les chercheurs de logement au
                  Sud-Kivu. Découvrez des milliers de propriétés à louer et à vendre.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8">
                  <Link href="/auth/login">Commencer maintenant</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-8 bg-transparent">
                  <Link href="#features">En savoir plus</Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-8 pt-4">
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">Propriétés</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-secondary">1000+</div>
                  <div className="text-sm text-muted-foreground">Clients satisfaits</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-accent">24/7</div>
                  <div className="text-sm text-muted-foreground">Support</div>
                </div>
              </div>
            </div>
            <div className="relative lg:h-[600px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/modern-real-estate-property-in-africa.jpg"
                  alt="Propriété immobilière moderne"
                  className="h-full w-full rounded-2xl object-cover shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-b border-border py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Pourquoi choisir Nyumbani Express ?
            </h2>
            <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
              Notre plateforme offre des fonctionnalités avancées pour faciliter votre recherche immobilière
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Recherche intelligente</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Trouvez rapidement votre propriété idéale avec nos filtres avancés et notre recherche par quartier
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  <MapPin className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold">Localisation GPS</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Chaque propriété est géolocalisée automatiquement pour faciliter vos visites
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Smartphone className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold">Propositions WhatsApp</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Envoyez directement des propositions aux clients via WhatsApp avec photos et détails
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Scoring automatique</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Les biens sont évalués automatiquement pour vous aider à proposer plus rapidement
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  <Building2 className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold">Gestion complète</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Gérez facilement vos biens à louer et à vendre depuis une interface intuitive
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold">Multi-utilisateurs</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Travaillez en équipe avec des rôles différents : Admin, Agent, Consultant
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-border py-20 md:py-32 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center space-y-8">
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Prêt à trouver votre prochaine maison ?
            </h2>
            <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
              Rejoignez des centaines de personnes qui font confiance à Nyumbani Express pour leurs besoins immobiliers
              à Bukavu
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8">
                <Link href="/auth/login">Créer un compte</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 bg-transparent">
                <Link href="#contact">Nous contacter</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <Image src="/nyumbani-logo.png" alt="Nyumbani Express" width={120} height={40} className="h-10 w-auto" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                La plateforme immobilière moderne pour Bukavu, Sud-Kivu, RDC
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Entreprise</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    À propos
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary transition-colors">
                    Carrières
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Avenue de la Paix, Bukavu</li>
                <li>Sud-Kivu, RDC</li>
                <li>contact@nyumbani.cd</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Nyumbani Express. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
