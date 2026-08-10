"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from "@/actions/notifications"
import { getSocket } from "@/lib/socket"
import type { Notification } from "@/lib/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// GOAL 20 — historique complet des notifications (au-delà de la cloche,
// plafonnée à un aperçu déroulant) : même source `GET /api/notifications/me`,
// affichage plein écran groupé par jour, avec marquage individuel ou groupé.
const RELATED_ENTITY_HREF: Record<string, (id: number) => string> = {
  Task: (id) => `/dashboard/tasks/${id}`,
  Mission: (id) => `/dashboard/missions/${id}`,
  Alert: () => `/dashboard/alertes`,
  CalendarEvent: () => `/dashboard/calendrier`,
  Requisition: () => `/dashboard/requisitions`,
}

const groupByDay = (notifications: Notification[]) => {
  const groups = new Map<string, Notification[]>()
  for (const n of notifications) {
    const key = new Date(n.createdAt).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(n)
  }
  return groups
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const load = async () => {
    try {
      setNotifications(await getMyNotifications())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    const socket = getSocket()
    const refetch = () => load()
    socket.on("notification:new", refetch)
    return () => {
      socket.off("notification:new", refetch)
    }
  }, [])

  const handleMarkRead = async (notification: Notification) => {
    if (notification.isRead) return
    setNotifications((prev) =>
      prev.map((n) => (n.idNotification === notification.idNotification ? { ...n, isRead: true } : n))
    )
    try {
      await markNotificationRead(notification.idNotification)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
      load()
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast.success("Toutes les notifications ont été marquées comme lues")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const groups = groupByDay(notifications)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Notifications</h1>
          <p className="text-muted-foreground mt-2">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est à jour"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead} disabled={markingAll}>
            <CheckCheck className="mr-2 h-4 w-4" />
            {markingAll ? "Marquage..." : "Tout marquer comme lu"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucune notification</h3>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, dayNotifications]) => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-muted-foreground capitalize mb-2">{day}</h2>
              <div className="grid gap-2">
                {dayNotifications.map((notification) => {
                  const href =
                    notification.relatedEntityType && notification.relatedEntityId
                      ? RELATED_ENTITY_HREF[notification.relatedEntityType]?.(notification.relatedEntityId)
                      : undefined

                  const content = (
                    <CardContent className="p-4 flex items-start gap-3">
                      {!notification.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <div className={cn("min-w-0 flex-1", notification.isRead && "pl-5")}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{notification.title}</p>
                          {!notification.isRead && (
                            <Badge variant="outline" className="text-[10px]">
                              Nouveau
                            </Badge>
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground mt-1 break-words">{notification.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.createdAt).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </CardContent>
                  )

                  return (
                    <Card
                      key={notification.idNotification}
                      className={cn(
                        "border-border cursor-pointer transition-colors hover:bg-muted/50",
                        !notification.isRead && "bg-primary/5"
                      )}
                      onClick={() => handleMarkRead(notification)}
                    >
                      {href ? (
                        <Link
                          href={href}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkRead(notification)
                          }}
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
