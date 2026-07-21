"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from "@/actions/notifications"
import { getSocket } from "@/lib/socket"
import type { Notification } from "@/lib/types"

// ADMIN-G07 — Socket.IO ne fait que déclencher un refetch REST (jamais
// poussé de données brutes, CLAUDE.md §6 "quasi temps réel") ; un
// intervalle de repli (60s) garantit que la cloche reste à jour même si
// la connexion socket est indisponible — jamais une dépendance dure.
const POLL_INTERVAL_MS = 60_000

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setNotifications(await getMyNotifications())
    } catch {
      // Silencieux : la cloche ne doit jamais bloquer le reste du dashboard.
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    const socket = getSocket()
    const handleNew = () => load()
    socket.on("notification:new", handleNew)

    const interval = setInterval(load, POLL_INTERVAL_MS)

    return () => {
      socket.off("notification:new", handleNew)
      clearInterval(interval)
    }
  }, [load])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleMarkRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.idNotification === id ? { ...n, isRead: true } : n))
    )
    try {
      await markNotificationRead(id)
    } catch {
      load()
    }
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await markAllNotificationsRead()
    } catch {
      load()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Tout lire
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucune notification
            </p>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.idNotification}
                onClick={() => !notification.isRead && handleMarkRead(notification.idNotification)}
                className={`w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-accent ${
                  notification.isRead ? "" : "bg-primary/5"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{notification.title}</p>
                  {!notification.isRead && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                {notification.message && (
                  <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleString("fr-FR")}
                </p>
              </button>
            ))
          )}
        </div>
        <Link
          href="/dashboard/notifications"
          onClick={() => setOpen(false)}
          className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-accent"
        >
          Voir toutes les notifications
        </Link>
      </PopoverContent>
    </Popover>
  )
}
