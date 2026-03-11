import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Hammer, ChevronDown, FileText, Inbox, LogOut, Settings, LayoutTemplate, Zap } from "lucide-react";
import NotificationPanel from "@/components/NotificationPanel";
import LanguageToggle from "@/components/LanguageToggle";
// === AGENT 6: Plan Badge ===
import PlanBadge from "@/components/billing/PlanBadge";
// === END AGENT 6 ===
// === AGENT 14: White Label ===
import { useEnterprise } from "@/hooks/useEnterprise";
// === END AGENT 14 ===

export default function Navbar() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace();
  const location = useLocation();
  // === AGENT 14: White Label ===
  const { settings: enterprise, whiteLabelEnabled } = useEnterprise();
  // === END AGENT 14 ===

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? "?";

  const navLinks = [
    { to: "/", label: t("nav.forms"), icon: FileText },
    { to: "/submissions", label: t("nav.submissions"), icon: Inbox },
    // === AGENT 11: Templates Link ===
    { to: "/templates", label: "Templates", icon: LayoutTemplate },
    // === END AGENT 11 ===
    // === AGENT 15: Workflows Link ===
    { to: "/workflows", label: "Workflows", icon: Zap },
    // === END AGENT 15 ===
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center gap-4">
        {/* Logo */}
        {/* === AGENT 14: White Label Logo === */}
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          {whiteLabelEnabled && enterprise?.custom_logo_url ? (
            <img src={enterprise.custom_logo_url} alt="" className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-colored">
              <Hammer className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <span>{whiteLabelEnabled && enterprise?.custom_app_name ? enterprise.custom_app_name : "FormForge"}</span>
        </Link>
        {/* === END AGENT 14 === */}

        {/* Nav links */}
        <nav className="ms-6 flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to}>
                <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-3">
          {/* Workspace switcher */}
          {currentWorkspace && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 max-w-[200px]">
                  <span className="truncate">{currentWorkspace.name}</span>
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {workspaces.map((ws) => (
                  <DropdownMenuItem key={ws.id} onClick={() => setCurrentWorkspace(ws)} className={ws.id === currentWorkspace.id ? "bg-accent" : ""}>
                    {ws.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* === AGENT 6: Plan Badge === */}
          <PlanBadge />
          {/* === END AGENT 6 === */}

          {/* === AGENT 5: Language toggle === */}
          <LanguageToggle />
          {/* === END AGENT 5 === */}

          {/* === AGENT 3: Notifications === */}
          <NotificationPanel />
          {/* === END AGENT 3 === */}

          {/* === AGENT 1: Settings link === */}
          <Link to="/settings">
            <Button variant={location.pathname === "/settings" ? "secondary" : "ghost"} size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          {/* === END AGENT 1 === */}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium truncate">{user?.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="me-2 h-4 w-4" /> {t("nav.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
