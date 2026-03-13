import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  FileText,
  AlertTriangle,
  UserCheck,
  MessageSquare,
  Users,
  Check,
  X,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, typeof FileText> = {
  submission: FileText,
  detractor_alert: AlertTriangle,
  ticket_assigned: UserCheck,
  ticket_message: MessageSquare,
  waitlist_signup: Users,
};

const TYPE_COLORS: Record<string, string> = {
  submission: "text-blue-500",
  detractor_alert: "text-red-500",
  ticket_assigned: "text-green-500",
  ticket_message: "text-purple-500",
  waitlist_signup: "text-cyan-500",
};

export default function NotificationPanel() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(user?.id ?? "");
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const handleClick = async (notif: (typeof notifications)[0]) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" title={t("tooltips.nav.notifications")}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 ltr:-right-1 rtl:-left-1 h-4 min-w-4 px-1 text-[10px] font-bold flex items-center justify-center bg-destructive text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">{t("notifications.title")}</h3>
          <div className="flex items-center gap-1">
            <Button
              variant={filter === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setFilter("all")}
            >
              {t("notifications.all")}
            </Button>
            <Button
              variant={filter === "unread" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setFilter("unread")}
            >
              {t("notifications.unread")}
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Inbox className="h-6 w-6 mb-2 opacity-40" />
              <p className="text-sm">
                {filter === "unread" ? t("notifications.noUnreadNotifications") : t("notifications.noNotifications")}
              </p>
            </div>
          ) : (
            filtered.map((notif) => {
              const Icon = TYPE_ICONS[notif.type] ?? FileText;
              const iconColor = TYPE_COLORS[notif.type] ?? "text-muted-foreground";

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                    !notif.read && "bg-primary/5"
                  )}
                  onClick={() => handleClick(notif)}
                >
                  <div
                    className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      !notif.read ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-tight",
                        !notif.read ? "font-medium" : "text-muted-foreground"
                      )}
                    >
                      {notif.title}
                    </p>
                    {notif.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo(notif.created_at, t, language)}
                    </p>
                  </div>
                  <button
                    className="shrink-0 mt-0.5 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {unreadCount > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-xs h-7"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3 w-3" />
              {t("notifications.markAllRead")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string, language: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return t("notifications.justNow");
  if (diffMins < 60) return t("notifications.minutesAgo", { count: diffMins });
  if (diffHours < 24) return t("notifications.hoursAgo", { count: diffHours });
  if (diffDays < 7) return t("notifications.daysAgo", { count: diffDays });
  return new Date(dateStr).toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
    month: "short",
    day: "numeric",
  });
}
