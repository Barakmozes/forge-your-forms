import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useTickets } from "@/hooks/useTickets";
import { useSupportAnalytics } from "@/hooks/useSupportAnalytics";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Headphones,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Search,
  Filter,
  Inbox,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupportDashboardProps {
  formId: string;
  formTitle: string;
  formStatus: string;
}

type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "#22c55e",
  medium: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

const PRIORITY_BADGE_CLASSES: Record<TicketPriority, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "#3b82f6",
  in_progress: "#f59e0b",
  waiting: "#8b5cf6",
  resolved: "#22c55e",
  closed: "#6b7280",
};

const STATUS_BADGE_CLASSES: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  waiting: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-950/50 dark:text-gray-400",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
};

const KANBAN_COLUMNS: TicketStatus[] = ["open", "in_progress", "waiting", "resolved"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

// ─── Skeleton Components ──────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 3 }).map((_, j) => (
            <Skeleton key={j} className="h-32 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Custom Tooltip Components ────────────────────────────────────────────────

function VolumeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium mb-1">{formatDate(label ?? "")}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
            style={{ backgroundColor: entry.color }}
          />
          Tickets:{" "}
          <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function PriorityTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: { priority: string; count: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium capitalize">{item.payload.priority}</p>
      <p className="text-muted-foreground">
        Count:{" "}
        <span className="font-medium text-foreground">{item.payload.count}</span>
      </p>
    </div>
  );
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { category: string; count: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{item.payload.category}</p>
      <p className="text-muted-foreground">
        Tickets:{" "}
        <span className="font-medium text-foreground">{item.payload.count}</span>
      </p>
    </div>
  );
}

// ─── Kanban DnD Components ───────────────────────────────────────────────────

interface KanbanCardProps {
  ticket: { id: string; ticket_number: string; subject: string; priority: string; submitted_by_email: string | null; category: string | null; created_at: string };
  isDragOverlay?: boolean;
}

function KanbanCard({ ticket, isDragOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
  });

  const slaHours = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
  const slaClass = slaHours > 48 ? "border-l-red-500" : slaHours > 24 ? "border-l-amber-500" : "";

  return (
    <Card
      ref={isDragOverlay ? undefined : setNodeRef}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
      className={`shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border-l-4 ${slaClass} ${
        isDragging ? "opacity-40" : ""
      } ${isDragOverlay ? "shadow-lg rotate-2" : ""}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {ticket.ticket_number}
          </span>
          <Badge
            variant="secondary"
            className={`text-xs px-1.5 py-0 ${
              PRIORITY_BADGE_CLASSES[ticket.priority as TicketPriority]
            }`}
          >
            {ticket.priority}
          </Badge>
        </div>
        <p className="text-sm font-medium text-foreground line-clamp-2">
          {ticket.subject}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate">
            {ticket.submitted_by_email ?? "Unknown"}
          </p>
          <span className="text-xs text-muted-foreground shrink-0">
            {timeAgo(ticket.created_at)}
          </span>
        </div>
        {ticket.category && (
          <Badge variant="outline" className="text-xs">
            {ticket.category}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

interface KanbanColumnProps {
  status: TicketStatus;
  tickets: Array<{ id: string; ticket_number: string; subject: string; priority: string; submitted_by_email: string | null; category: string | null; created_at: string; status: string }>;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  onNavigate: (ticketId: string) => void;
}

function KanbanColumn({ status, tickets: columnTickets }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div key={status} className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: STATUS_COLORS[status] }}
          />
          <h3 className="text-sm font-semibold text-foreground">
            {STATUS_LABELS[status]}
          </h3>
        </div>
        <Badge variant="secondary" className="tabular-nums text-xs">
          {columnTickets.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[200px] p-1 rounded-lg transition-colors ${
          isOver ? "bg-primary/5 ring-2 ring-primary/20" : ""
        }`}
      >
        {columnTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
            <Inbox className="h-6 w-6 mb-1.5 opacity-40" />
            <p className="text-xs">Drop tickets here</p>
          </div>
        ) : (
          columnTickets.map((ticket) => (
            <KanbanCard key={ticket.id} ticket={ticket} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SupportDashboard({
  formId,
  formTitle,
  formStatus,
}: SupportDashboardProps) {
  const navigate = useNavigate();
  const { tickets, loading, updateTicket, bulkUpdateStatus, ticketsByStatus } =
    useTickets(formId);
  const {
    stats,
    volumeByDay,
    priorityBreakdown,
    agentWorkload,
    categoryBreakdown,
    slaBreaches,
  } = useSupportAnalytics(tickets);

  const [copyLabel, setCopyLabel] = useState("Copy Submit Link");
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [bulkStatus, setBulkStatus] = useState<TicketStatus | "">("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const publicLink = `${window.location.origin}/f/${formId}`;

  // ─── Filtered Tickets for Table ────────────────────────────────────────────

  const filteredTickets = useMemo(() => {
    let result = tickets;

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(query) ||
          t.subject.toLowerCase().includes(query) ||
          (t.submitted_by_email?.toLowerCase().includes(query) ?? false) ||
          (t.submitted_by_name?.toLowerCase().includes(query) ?? false) ||
          (t.category?.toLowerCase().includes(query) ?? false)
      );
    }

    return result;
  }, [tickets, statusFilter, priorityFilter, searchQuery]);

  const filteredByStatus = (status: TicketStatus) =>
    filteredTickets.filter((t) => t.status === status);

  const activeDragTicket = activeDragId
    ? tickets.find((t) => t.id === activeDragId) ?? null
    : null;

  // ─── Donut Chart Data ──────────────────────────────────────────────────────

  const pieData = priorityBreakdown.filter((p) => p.count > 0);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopyLabel("Copied!");
      toast.success("Submit link copied to clipboard");
      setTimeout(() => setCopyLabel("Copy Submit Link"), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  async function handleStatusChange(ticketId: string, newStatus: TicketStatus) {
    const { error } = await updateTicket(ticketId, { status: newStatus });
    if (error) {
      toast.error("Failed to update ticket status");
    } else {
      toast.success(`Ticket moved to ${STATUS_LABELS[newStatus]}`);
    }
  }

  async function handleBulkAction() {
    if (!bulkStatus || selectedTickets.size === 0) return;

    const ids = Array.from(selectedTickets);
    const { error } = await bulkUpdateStatus(ids, bulkStatus);
    if (error) {
      toast.error("Failed to update tickets");
    } else {
      toast.success(`${ids.length} ticket${ids.length > 1 ? "s" : ""} updated`);
      setSelectedTickets(new Set());
      setBulkStatus("");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const ticketId = active.id as string;
    const newStatus = over.id as TicketStatus;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    handleStatusChange(ticketId, newStatus);
  }

  function toggleTicketSelection(ticketId: string) {
    setSelectedTickets((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedTickets.size === filteredTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredTickets.map((t) => t.id)));
    }
  }

  // ─── Stat Card Config ──────────────────────────────────────────────────────

  const statCards = [
    {
      title: "Total Tickets",
      value: stats.total.toLocaleString(),
      subtitle: "All time",
      icon: Headphones,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Open",
      value: stats.open.toLocaleString(),
      subtitle: "Awaiting response",
      icon: Inbox,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "In Progress",
      value: stats.inProgress.toLocaleString(),
      subtitle: "Being worked on",
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      title: "Resolved",
      value: stats.resolved.toLocaleString(),
      subtitle: "Resolved & closed",
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Avg Resolution",
      value: stats.avgResolutionHours > 0 ? `${stats.avgResolutionHours}h` : "--",
      subtitle: "Average hours to resolve",
      icon: Clock,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant={formStatus === "active" ? "default" : "secondary"}>
            {formStatus}
          </Badge>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {stats.total.toLocaleString()} ticket
              {stats.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="mr-1.5 h-4 w-4" />
            {copyLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/forms/${formId}/tickets`)}
          >
            <ExternalLink className="mr-1.5 h-4 w-4" />
            View All Tickets
          </Button>
        </div>
      </div>

      {/* SLA Breaches Alert */}
      {!loading && slaBreaches.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                {slaBreaches.length} ticket{slaBreaches.length > 1 ? "s" : ""} over SLA
                -- no first response within 24 hours
              </p>
              <div className="space-y-2">
                {slaBreaches.slice(0, 5).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md bg-amber-100/50 dark:bg-amber-900/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                      <span className="font-mono text-sm font-medium text-amber-900 dark:text-amber-200 shrink-0">
                        {ticket.ticket_number}
                      </span>
                      <span className="text-sm text-amber-800 dark:text-amber-300 truncate">
                        {ticket.subject}
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                        {ticket.submitted_by_email ?? "Unknown"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 text-xs text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                      onClick={() => navigate(`/forms/${formId}/tickets`)}
                    >
                      View Ticket
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              {slaBreaches.length > 5 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  And {slaBreaches.length - 5} more...
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Bar — applies to Kanban + Table */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets..."
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.entries(STATUS_LABELS) as Array<[TicketStatus, string]>).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as TicketPriority | "all")}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {(["low", "medium", "high", "urgent"] as TicketPriority[]).map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="tickets">Tickets Table</TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Overview ─────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Row */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {statCards.map((card) => (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <div className={`rounded-md p-2 ${card.bg}`}>
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tabular-nums">
                      {card.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.subtitle}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Charts Row */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ticket Volume Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Ticket Volume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {volumeByDay.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm">
                      <Inbox className="h-8 w-8 mb-2 opacity-40" />
                      <p>No ticket data yet</p>
                      <p className="text-xs mt-1">
                        Tickets will appear here as they are submitted.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={volumeByDay}
                        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border/50"
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          tick={{ fontSize: 12 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                          width={30}
                          allowDecimals={false}
                        />
                        <Tooltip content={<VolumeTooltip />} />
                        <Bar
                          dataKey="count"
                          name="Tickets"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Priority Breakdown Donut */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Priority Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm">
                      <Filter className="h-8 w-8 mb-2 opacity-40" />
                      <p>No priority data yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="priority"
                            stroke="none"
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PRIORITY_COLORS[entry.priority as TicketPriority]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<PriorityTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Legend */}
                      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                        {priorityBreakdown.map((item) => (
                          <div key={item.priority} className="flex items-center gap-1.5">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  PRIORITY_COLORS[item.priority as TicketPriority],
                              }}
                            />
                            <span className="text-muted-foreground capitalize">
                              {item.priority}
                            </span>
                            <span className="font-medium tabular-nums">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Category Breakdown */}
          {loading ? (
            <ChartSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Tickets by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryBreakdown.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm">
                    <Filter className="h-8 w-8 mb-2 opacity-40" />
                    <p>No category data yet</p>
                    <p className="text-xs mt-1">
                      Categories will appear once tickets include them.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(200, categoryBreakdown.length * 48)}
                  >
                    <BarChart
                      data={categoryBreakdown}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/50"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        width={120}
                      />
                      <Tooltip content={<CategoryTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Tickets"
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Tab 2: Kanban Board (DnD) ────────────────────────────────── */}
        <TabsContent value="kanban" className="space-y-6">
          {loading ? (
            <KanbanSkeleton />
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {KANBAN_COLUMNS.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    tickets={filteredByStatus(status)}
                    onStatusChange={handleStatusChange}
                    onNavigate={(ticketId) =>
                      navigate(`/forms/${formId}/tickets/${ticketId}`)
                    }
                  />
                ))}
              </div>
              <DragOverlay>
                {activeDragTicket && (
                  <KanbanCard ticket={activeDragTicket} isDragOverlay />
                )}
              </DragOverlay>
            </DndContext>
          )}
        </TabsContent>

        {/* ─── Tab 3: Tickets Table ─────────────────────────────────────── */}
        <TabsContent value="tickets" className="space-y-4">
          {loading ? (
            <TableSkeleton />
          ) : (
            <>
              {/* Bulk Actions */}
              {selectedTickets.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">
                    {selectedTickets.size} selected
                  </span>
                  <Select
                    value={bulkStatus}
                    onValueChange={(v) => setBulkStatus(v as TicketStatus)}
                  >
                    <SelectTrigger className="h-9 w-36">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(STATUS_LABELS) as Array<
                          [TicketStatus, string]
                        >
                      ).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!bulkStatus}
                    onClick={handleBulkAction}
                  >
                    Apply
                  </Button>
                </div>
              )}

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  {filteredTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                      <Inbox className="h-8 w-8 mb-2 opacity-40" />
                      <p>No tickets found</p>
                      {searchQuery || statusFilter !== "all" ? (
                        <p className="text-xs mt-1">
                          Try adjusting your search or filter.
                        </p>
                      ) : (
                        <p className="text-xs mt-1">
                          Tickets will appear here once submitted.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  filteredTickets.length > 0 &&
                                  selectedTickets.size === filteredTickets.length
                                }
                                onCheckedChange={toggleSelectAll}
                                aria-label="Select all tickets"
                              />
                            </TableHead>
                            <TableHead className="w-28">Ticket #</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead className="w-28">Status</TableHead>
                            <TableHead className="w-24">Priority</TableHead>
                            <TableHead className="hidden md:table-cell w-28">
                              Category
                            </TableHead>
                            <TableHead className="hidden sm:table-cell">
                              Submitted By
                            </TableHead>
                            <TableHead className="hidden lg:table-cell w-32">
                              Created
                            </TableHead>
                            <TableHead className="hidden lg:table-cell w-28">
                              Assignee
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTickets.map((ticket) => (
                            <TableRow
                              key={ticket.id}
                              className="cursor-pointer hover:bg-muted/50"
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedTickets.has(ticket.id)}
                                  onCheckedChange={() =>
                                    toggleTicketSelection(ticket.id)
                                  }
                                  aria-label={`Select ticket ${ticket.ticket_number}`}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {ticket.ticket_number}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-sm font-medium">
                                {ticket.subject}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    STATUS_BADGE_CLASSES[
                                      ticket.status as TicketStatus
                                    ]
                                  }`}
                                >
                                  {STATUS_LABELS[ticket.status as TicketStatus]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    PRIORITY_BADGE_CLASSES[
                                      ticket.priority as TicketPriority
                                    ]
                                  }`}
                                >
                                  {ticket.priority}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {ticket.category ?? "--"}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground truncate max-w-[160px]">
                                {ticket.submitted_by_email ?? "Unknown"}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground whitespace-nowrap">
                                {formatDateTime(ticket.created_at)}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[120px]">
                                {ticket.assigned_to ?? "--"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
