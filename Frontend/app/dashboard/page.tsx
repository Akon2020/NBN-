"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  ClipboardCheck,
  FileText,
  Home,
  ImageIcon,
  Loader2,
  Percent,
  Star,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuthUser } from "@/lib/auth";
import { getDashboardStats } from "@/actions/dashboard";
import type { DashboardStats, RecentActivityEntry, RecentActivityType } from "@/lib/types";
import { toast } from "sonner";

const ACTIVITY_ICON: Record<RecentActivityType, typeof Home> = {
  PROPERTY: Home,
  CLIENT: UserRound,
  MISSION: ClipboardCheck,
  REQUISITION: FileText,
};

const ACTIVITY_COLOR: Record<RecentActivityType, string> = {
  PROPERTY: "text-primary bg-primary/10",
  CLIENT: "text-secondary bg-secondary/10",
  MISSION: "text-accent bg-accent/10",
  REQUISITION: "text-primary bg-primary/10",
};

const timeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
};

export default function DashboardPage() {
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = getAuthUser();
    setUserName(user?.fullName || "Utilisateur");

    const load = async () => {
      try {
        setStats(await getDashboardStats());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  type StatCard = {
    title: string;
    value: number;
    icon: typeof Home;
    color: string;
    bgColor: string;
    link: string;
  };

  const cards: StatCard[] = [];
  if (stats) {
    cards.push(
      {
        title: "Biens à louer",
        value: stats.properties.rentals,
        icon: Home,
        color: "text-primary",
        bgColor: "bg-primary/10",
        link: "/dashboard/rentals",
      },
      {
        title: "Biens à vendre",
        value: stats.properties.sales,
        icon: Building2,
        color: "text-secondary",
        bgColor: "bg-secondary/10",
        link: "/dashboard/sales",
      },
      {
        title: "Total d'images",
        value: stats.properties.totalImages,
        icon: ImageIcon,
        color: "text-accent",
        bgColor: "bg-accent/10",
        link: "/dashboard/gallery",
      },
      {
        title: "Favoris",
        value: stats.favorites,
        icon: Star,
        color: "text-secondary",
        bgColor: "bg-secondary/10",
        link: "/dashboard/favorites",
      }
    );
    if (stats.proposals !== undefined) {
      cards.push({
        title: "Propositions envoyées",
        value: stats.proposals,
        icon: FileText,
        color: "text-primary",
        bgColor: "bg-primary/10",
        link: "/dashboard/favorites",
      });
    }
    if (stats.clients !== undefined) {
      cards.push({
        title: "Clients",
        value: stats.clients,
        icon: UserRound,
        color: "text-primary",
        bgColor: "bg-primary/10",
        link: "/dashboard/clients",
      });
    }
    if (stats.pendingMissions !== undefined) {
      cards.push({
        title: "Missions à valider",
        value: stats.pendingMissions,
        icon: ClipboardCheck,
        color: "text-accent",
        bgColor: "bg-accent/10",
        link: "/dashboard/missions",
      });
    }
    if (stats.pendingRequisitions !== undefined) {
      cards.push({
        title: "Réquisitions à traiter",
        value: stats.pendingRequisitions,
        icon: FileText,
        color: "text-secondary",
        bgColor: "bg-secondary/10",
        link: "/dashboard/requisitions",
      });
    }
    if (stats.openCaisses !== undefined) {
      cards.push({
        title: "Caisses ouvertes",
        value: stats.openCaisses,
        icon: Wallet,
        color: "text-primary",
        bgColor: "bg-primary/10",
        link: "/dashboard/caisses",
      });
    }
    if (stats.pendingCommissions !== undefined) {
      cards.push({
        title: "Commissions dues",
        value: stats.pendingCommissions,
        icon: Percent,
        color: "text-accent",
        bgColor: "bg-accent/10",
        link: "/dashboard/commissions",
      });
    }
    if (stats.activeUsers !== undefined) {
      cards.push({
        title: "Utilisateurs actifs",
        value: stats.activeUsers,
        icon: Users,
        color: "text-secondary",
        bgColor: "bg-secondary/10",
        link: "/dashboard/users",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">
          Bienvenue, {userName}
        </h1>
        <p className="text-muted-foreground mt-2">
          Voici un aperçu réel de votre activité sur Nyumbani Express
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((stat) => (
              <Link key={stat.title} href={stat.link}>
                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}
                    >
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivity.map((entry: RecentActivityEntry) => {
                    const Icon = ACTIVITY_ICON[entry.type];
                    return (
                      <div
                        key={`${entry.type}-${entry.id}`}
                        className="flex items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${ACTIVITY_COLOR[entry.type]}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {entry.detail ? `${entry.detail} — ` : ""}
                            {timeAgo(entry.date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune activité récente</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
