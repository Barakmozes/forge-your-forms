import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Pencil, Trash2, MessageSquare } from "lucide-react";
import { useCannedResponses } from "@/hooks/useCannedResponses";
import { useToast } from "@/hooks/use-toast";

export default function CannedResponses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { responses, loading, create, update, remove } = useCannedResponses(currentWorkspace?.id ?? "");
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setCategory("");
    setDialogOpen(true);
  };

  const openEdit = (r: typeof responses[0]) => {
    setEditingId(r.id);
    setTitle(r.title);
    setContent(r.content);
    setCategory(r.category ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: t('common.error'), description: "Title and content are required", variant: "destructive" });
      return;
    }
    setSaving(true);

    if (editingId) {
      const { error } = await update(editingId, {
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || null,
      });
      if (error) toast({ title: t('common.error'), description: "Failed to update", variant: "destructive" });
      else toast({ title: t('common.update') });
    } else {
      const { error } = await create(title.trim(), content.trim(), category.trim() || undefined);
      if (error) toast({ title: t('common.error'), description: "Failed to create", variant: "destructive" });
      else toast({ title: t('common.create') });
    }

    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await remove(id);
    if (error) toast({ title: t('common.error'), description: "Failed to delete", variant: "destructive" });
    else toast({ title: t('common.delete') });
  };

  return (
    <AppLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">{t('support.cannedResponses')}</h1>
          <p className="text-muted-foreground text-sm">{t('support.preWrittenReplies')}</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t('support.newResponse')}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">{t('common.loading')}</div>
      ) : responses.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-semibold">{t('support.noCannedResponses')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t('support.createPreWritten')} {t('support.personalizationHint', { placeholder: '{{customer_name}}' })}
            </p>
            <Button onClick={openCreate} className="gap-2 mt-2">
              <Plus className="h-4 w-4" /> {t('support.createFirstResponse')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {responses.map((r) => (
            <Card key={r.id} className="group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium">{r.title}</CardTitle>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {r.category && (
                  <Badge variant="outline" className="text-[10px] w-fit">{r.category}</Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{r.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t('support.editCannedResponse') : t('support.createCannedResponse')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t('support.titleLabel')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Welcome Reply" />
            </div>
            <div className="space-y-2">
              <Label>{t('support.categoryOptional')}</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('support.categoryPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('support.content')}</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"Hi {{customer_name}},\n\nThank you for reaching out..."}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {t('support.autoFillHint', { placeholder: '{{customer_name}}' })}
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? t('common.saving') : editingId ? t('common.update') : t('common.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
