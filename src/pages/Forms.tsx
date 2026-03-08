import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, MoreHorizontal } from "lucide-react";
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

interface Form {
  id: string;
  title: string;
  description: string | null;
  status: string;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

export default function Forms() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchForms = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("forms")
        .select("id, title, description, status, submission_count, created_at, updated_at")
        .eq("workspace_id", currentWorkspace.id)
        .order("updated_at", { ascending: false });
      setForms(data ?? []);
      setLoading(false);
    };
    fetchForms();
  }, [currentWorkspace]);

  const createForm = async () => {
    if (!currentWorkspace || !user || !newTitle.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("forms")
      .insert({ workspace_id: currentWorkspace.id, created_by: user.id, title: newTitle.trim(), description: newDesc.trim() || null })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      navigate(`/forms/${data.id}/edit`);
    }
    setCreating(false);
    setDialogOpen(false);
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
          <h1 className="text-2xl font-display font-bold">Forms</h1>
          <p className="text-muted-foreground text-sm mt-1">Build and manage your team's forms</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Form
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new form</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
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
            <Card key={form.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/forms/${form.id}/edit`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold line-clamp-1">{form.title}</CardTitle>
                  <Badge variant="secondary" className={`text-xs shrink-0 ${statusColor[form.status] ?? ""}`}>
                    {form.status}
                  </Badge>
                </div>
                {form.description && <CardDescription className="line-clamp-2 mt-1">{form.description}</CardDescription>}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{form.submission_count} submission{form.submission_count !== 1 ? "s" : ""}</span>
                  <span>Updated {new Date(form.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
