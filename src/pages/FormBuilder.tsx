import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from "lucide-react";

const FIELD_TYPES = [
  "text", "textarea", "number", "email", "phone", "date",
  "select", "multi_select", "checkbox", "radio",
  "file_upload", "section_header", "paragraph_text",
] as const;

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
  validation: Record<string, unknown>;
}

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("forms")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate("/");
          return;
        }
        setTitle(data.title);
        setDescription(data.description ?? "");
        setStatus(data.status);
        setFields(Array.isArray(data.fields) ? (data.fields as unknown as FormField[]) : []);
        setLoading(false);
      });
  }, [id]);

  const addField = () => {
    setFields([
      ...fields,
      { id: crypto.randomUUID(), type: "text", label: "", placeholder: "", required: false, options: [], validation: {} },
    ]);
  };

  const updateField = (idx: number, updates: Partial<FormField>) => {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("forms")
      .update({ title, description: description || null, status: status as any, fields: fields as any })
      .eq("id", id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!" });
    }
    setSaving(false);
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div></AppLayout>;

  const needsOptions = (type: string) => ["select", "multi_select", "radio"].includes(type);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-display font-bold border-none px-0 focus-visible:ring-0 h-auto"
              placeholder="Form title"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          className="mb-6 text-muted-foreground"
        />

        <div className="space-y-3">
          {fields.map((field, idx) => (
            <Card key={field.id} className="animate-fade-in">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground/40 mt-2 shrink-0 cursor-grab" />
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input value={field.label} onChange={(e) => updateField(idx, { label: e.target.value })} placeholder="Field label" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select value={field.type} onValueChange={(v) => updateField(idx, { type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Placeholder</Label>
                        <Input value={field.placeholder} onChange={(e) => updateField(idx, { placeholder: e.target.value })} placeholder="Placeholder text" />
                      </div>
                      <div className="flex items-end gap-4 pb-1">
                        <div className="flex items-center gap-2">
                          <Switch checked={field.required} onCheckedChange={(v) => updateField(idx, { required: v })} />
                          <Label className="text-xs">Required</Label>
                        </div>
                      </div>
                    </div>
                    {needsOptions(field.type) && (
                      <div className="space-y-1">
                        <Label className="text-xs">Options (comma-separated)</Label>
                        <Input
                          value={field.options.join(", ")}
                          onChange={(e) => updateField(idx, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive/60 hover:text-destructive shrink-0" onClick={() => removeField(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-4 gap-2 border-dashed" onClick={addField}>
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      </div>
    </AppLayout>
  );
}
