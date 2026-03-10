import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Inbox, ClipboardList, Users, MessageSquare, Headphones } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type FormMode = Database["public"]["Enums"]["form_mode"];

interface Form {
  id: string;
  title: string;
  description: string | null;
  status: string;
  mode: FormMode;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

const MODE_CONFIG: Record<FormMode, { label: string; icon: React.ElementType; color: string; badgeClass: string; description: string; available: boolean }> = {
  standard: { label: "Standard Form", icon: ClipboardList, color: "border-blue-500/50 bg-blue-500/5", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", description: "Collect responses with custom fields", available: true },
  waitlist: { label: "Waitlist", icon: Users, color: "border-purple-500/50 bg-purple-500/5", badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", description: "Capture leads with referral tracking", available: true },
  feedback: { label: "Feedback / NPS", icon: MessageSquare, color: "border-amber-500/50 bg-amber-500/5", badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", description: "Measure satisfaction & NPS scores", available: true },
  support: { label: "Support Tickets", icon: Headphones, color: "border-green-500/50 bg-green-500/5", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", description: "Track & resolve customer issues", available: true },
};

function ModeBadge({ mode }: { mode: FormMode }) {
  const config = MODE_CONFIG[mode];
  return (
    <Badge variant="secondary" className={`text-[10px] font-medium ${config.badgeClass}`}>
      {config.label}
    </Badge>
  );
}

export default function Forms() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedMode, setSelectedMode] = useState<FormMode>("standard");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchForms = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("forms")
        .select("id, title, description, status, mode, submission_count, created_at, updated_at")
        .eq("workspace_id", currentWorkspace.id)
        .order("updated_at", { ascending: false });
      setForms(data ?? []);
      setLoading(false);
    };
    fetchForms();

    // Real-time: update submission_count when new submissions arrive
    const channel = supabase
      .channel(`workspace-submissions-${currentWorkspace.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        (payload) => {
          const newSub = payload.new as { form_id: string };
          setForms((prev) =>
            prev.map((f) =>
              f.id === newSub.form_id
                ? { ...f, submission_count: f.submission_count + 1 }
                : f
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentWorkspace]);

  const createForm = async () => {
    if (!currentWorkspace || !user || !newTitle.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("forms")
      .insert({ workspace_id: currentWorkspace.id, created_by: user.id, title: newTitle.trim(), description: newDesc.trim() || null, mode: selectedMode })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      navigate(`/forms/${data.id}/edit`);
    }
    setCreating(false);
    setDialogOpen(false);
    setSelectedMode("standard");
    setNewTitle("");
    setNewDesc("");
  };

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-success/15 text-success",
    closed: "bg-destructive/15 text-destructive",
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Forms, waitlists, feedback surveys & support desks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Form
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create a new form</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(MODE_CONFIG) as [FormMode, typeof MODE_CONFIG[FormMode]][]).map(([mode, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={mode}
                        type="button"
                        disabled={!config.available}
                        className={`relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all ${
                          selectedMode === mode ? config.color + " ring-1 ring-offset-1" : "border-border hover:border-muted-foreground/30"
                        } ${!config.available ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        onClick={() => config.available && setSelectedMode(mode)}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{config.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{config.description}</span>
                        {!config.available && (
                          <Badge variant="outline" className="absolute top-2 right-2 text-[9px]">Soon</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Onboarding Checklist" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What's this form for?" rows={3} />
              </div>
              <Button onClick={createForm} disabled={creating || !newTitle.trim()} className="w-full">
                {creating ? "Creating..." : "Create Form"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 w-2/3 bg-muted rounded" /><div className="h-3 w-1/2 bg-muted rounded mt-2" /></CardHeader>
            </Card>
          ))}
        </div>
      ) : forms.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg">No forms yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">Create your first form to start collecting responses from your team.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card
              key={form.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(form.mode === "standard" ? `/forms/${form.id}/edit` : `/forms/${form.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold line-clamp-1">{form.title}</CardTitle>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ModeBadge mode={form.mode} />
                    <Badge variant="secondary" className={`text-xs ${statusColor[form.status] ?? ""}`}>
                      {form.status}
                    </Badge>
                  </div>
                </div>
                {form.description && <CardDescription className="line-clamp-2 mt-1">{form.description}</CardDescription>}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/forms/${form.id}/submissions`);
                    }}
                    title="View submissions"
                  >
                    <Inbox className="h-3.5 w-3.5" />
                    <span className="font-medium tabular-nums">
                      {form.submission_count}
                    </span>
                    <span>{form.submission_count === 1 ? "response" : "responses"}</span>
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(form.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
