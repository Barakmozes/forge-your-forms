import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";

interface FormOption { id: string; title: string; }
interface Submission {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  submitted_by_email: string | null;
  submitted_at: string;
}

type RawSubmission = {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  submitted_by_email: string | null;
  submitted_at: string;
}

export default function Submissions() {
  const { currentWorkspace } = useWorkspace();
  const [forms, setForms] = useState<FormOption[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>("all");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    supabase.from("forms").select("id, title").eq("workspace_id", currentWorkspace.id).then(({ data }) => {
      setForms(data ?? []);
    });
  }, [currentWorkspace]);

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchSubmissions = async () => {
      setLoading(true);
      let query = supabase
        .from("submissions")
        .select("id, form_id, data, submitted_by_email, submitted_at")
        .order("submitted_at", { ascending: false });

      if (selectedForm !== "all") {
        query = query.eq("form_id", selectedForm);
      } else {
        const formIds = forms.map((f) => f.id);
        if (formIds.length > 0) query = query.in("form_id", formIds);
      }

      const { data } = await query;
      setSubmissions((data ?? []).map((s) => ({ ...s, data: (s.data as Record<string, unknown>) ?? {} })));
      setLoading(false);
    };
    fetchSubmissions();
  }, [currentWorkspace, selectedForm, forms]);

  const getFormTitle = (formId: string) => forms.find((f) => f.id === formId)?.title ?? "Unknown";

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Submissions</h1>
          <p className="text-muted-foreground text-sm mt-1">Review form responses</p>
        </div>
        <Select value={selectedForm} onValueChange={setSelectedForm}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by form" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All forms</SelectItem>
            {forms.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="animate-pulse"><CardContent className="py-12" /></Card>
      ) : submissions.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Inbox className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg">No submissions yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">Submissions will appear here when forms are filled out.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Data Preview</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{getFormTitle(sub.form_id)}</TableCell>
                  <TableCell>{sub.submitted_by_email || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {Object.entries(sub.data).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(", ")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(sub.submitted_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </AppLayout>
  );
}
