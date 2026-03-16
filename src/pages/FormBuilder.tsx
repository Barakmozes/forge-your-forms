import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Save, GripVertical, Plus, Trash2, Eye, LayoutTemplate, Type, Hash, Mail, Phone, Calendar, CheckSquare, List, CheckCircle2, UploadCloud, Heading1, AlignLeft, BarChart2, Sparkles } from "lucide-react";
// === AGENT 12: AI Generate Fields ===
import AiFormGenerator from "@/components/ai/AiFormGenerator";
import FeatureGate from "@/components/upgrade/FeatureGate";
import type { AiFormField } from "@/lib/ai";
// === END AGENT 12 ===
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import FormResponsesTab from "@/components/FormResponsesTab";
import FormSettingsPanel, { type FormSettings } from "@/components/builder/FormSettingsPanel";
import ConditionalLogic from "@/components/builder/ConditionalLogic";
import SharePanel from "@/components/embed/SharePanel";
import BrandingPanel, { type FormBranding } from "@/components/builder/BrandingPanel";
import type { Database } from "@/integrations/supabase/types";
// Import canonical types from single source of truth
import type { FieldType, FormField } from "@/types/forms";

type FormMode = Database["public"]["Enums"]["form_mode"];

const FIELD_CATEGORIES = [
  {
    name: "Basic",
    items: [
      { type: "text", label: "Text", icon: Type },
      { type: "textarea", label: "Textarea", icon: AlignLeft },
      { type: "number", label: "Number", icon: Hash },
      { type: "email", label: "Email", icon: Mail },
      { type: "phone", label: "Phone", icon: Phone },
    ],
  },
  {
    name: "Choice",
    items: [
      { type: "select", label: "Dropdown", icon: List },
      { type: "multi_select", label: "Multi-select", icon: List },
      { type: "radio", label: "Radio buttons", icon: CheckCircle2 },
      { type: "checkbox", label: "Checkboxes", icon: CheckSquare },
    ],
  },
  {
    name: "Other",
    items: [
      { type: "date", label: "Date picker", icon: Calendar },
      { type: "file_upload", label: "File upload", icon: UploadCloud },
      { type: "section_header", label: "Section header", icon: Heading1 },
      { type: "paragraph_text", label: "Paragraph", icon: LayoutTemplate },
    ],
  },
] as const;

const FIELD_TYPE_KEYS: Record<string, string> = {
  text: "builder.fieldText",
  textarea: "builder.fieldTextarea",
  number: "builder.fieldNumber",
  email: "builder.fieldEmail",
  phone: "builder.fieldPhone",
  select: "builder.fieldDropdown",
  multi_select: "builder.fieldMultiSelect",
  radio: "builder.fieldRadio",
  checkbox: "builder.fieldCheckboxes",
  date: "builder.fieldDate",
  file_upload: "builder.fieldFileUpload",
  section_header: "builder.fieldSectionHeader",
  paragraph_text: "builder.fieldParagraph",
};

const CATEGORY_KEYS: Record<string, string> = {
  Basic: "builder.categoryBasic",
  Choice: "builder.categoryChoice",
  Other: "builder.categoryOther",
};

const createNewField = (type: FieldType): FormField => ({
  id: crypto.randomUUID(),
  type,
  label: type === "section_header" ? "New Section" : type === "paragraph_text" ? "Paragraph" : "New Field",
  placeholder: "",
  helpText: "",
  required: false,
  options: ["Option 1", "Option 2", "Option 3"],
  validation: {},
});

function PaletteItem({ type, label, icon: Icon, onAdd }: { type: string; label: string; icon: React.ElementType; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type: 'palette_item', fieldType: type }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
      onClick={(e) => { if (!isDragging) { e.stopPropagation(); onAdd(); } }}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
      <Plus className="h-3 w-3 ms-auto text-muted-foreground opacity-0 group-hover:opacity-100" />
    </div>
  );
}

function SortableFieldItem({ field, activeId, onClick, onRemove, t }: { field: FormField, activeId: string | null, onClick: () => void, onRemove: () => void, t: (key: string) => string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const isActive = activeId === field.id;

  return (
    <div ref={setNodeRef} style={style} className={`p-4 rounded-lg border bg-card cursor-pointer transition-colors ${isActive ? 'ring-2 ring-primary border-transparent' : 'hover:border-primary/50'}`} onClick={onClick}>
      <div className="flex items-start gap-3">
        <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1 pointer-events-none">
          <div className="font-medium text-sm flex items-center gap-2">
            {field.label || t("builder.untitledField")}
            {field.required && <span className="text-destructive">*</span>}
            <Badge variant="secondary" className="text-[10px] ms-2 font-normal">{field.type}</Badge>
          </div>
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          <div className="mt-2 text-sm text-muted-foreground/60 border border-dashed p-2 rounded bg-muted/20">
            {['select', 'multi_select', 'radio', 'checkbox'].includes(field.type) ? (
              <div className="flex gap-2 flex-wrap">
                {field.options.map((opt, i) => <Badge key={i} variant="outline" className="text-[10px]">{opt}</Badge>)}
              </div>
            ) : field.type === "section_header" ? (
              <div className="text-lg font-bold text-foreground">{field.label}</div>
            ) : field.type === "paragraph_text" ? (
              <div className="text-sm text-foreground">{field.label}</div>
            ) : (
              <div>{field.placeholder || t("builder.userInputPlaceholder")}</div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function FormBuilder() {
  useDocumentTitle("Form Builder");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [mode, setMode] = useState<FormMode>("standard");
  const [fields, setFields] = useState<FormField[]>([]);
  const [settings, setSettings] = useState<FormSettings>({});
  const [branding, setBranding] = useState<FormBranding>({});

  const isMobile = useIsMobile();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Unsaved">("Saved");
  // === AGENT 12: AI Generate Fields ===
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const handleAiFieldsGenerated = (aiFields: AiFormField[]) => {
    const mapped: FormField[] = aiFields.map((f) => ({
      id: f.id,
      type: f.type as FieldType,
      label: f.label,
      placeholder: f.placeholder || "",
      helpText: f.helpText || "",
      required: f.required,
      options: f.options || [],
      validation: (f.validation || {}) as FormField["validation"],
    }));
    setFields(mapped);
    setSaveStatus("Unsaved");
  };
  // === END AGENT 12 ===

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

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
        setMode((data as { mode?: FormMode }).mode ?? "standard");
        setFields(Array.isArray(data.fields) ? (data.fields as unknown as FormField[]) : []);
        setSettings((data.settings as FormSettings) ?? {});
        setBranding((data.branding as FormBranding) ?? {});
        setLoading(false);
        isInitialLoad.current = false;
      });
  }, [id, navigate]);

  const save = useCallback(async () => {
    if (!id) return;
    setSaveStatus("Saving...");
    const { error } = await supabase
      .from("forms")
      .update({
        title,
        description: description || null,
        status: status as Database["public"]["Enums"]["form_status"],
        mode,
        fields: fields as unknown as Database["public"]["Tables"]["forms"]["Update"]["fields"],
        settings: settings as unknown as Database["public"]["Tables"]["forms"]["Update"]["settings"],
        branding: branding as unknown as Database["public"]["Tables"]["forms"]["Update"]["branding"],
      })
      .eq("id", id);

    if (error) {
      setSaveStatus("Unsaved");
      toast({ title: t("builder.saveFailed"), description: error.message, variant: "destructive" });
    } else {
      setSaveStatus("Saved");
    }
  }, [id, title, description, status, mode, fields, settings, branding, toast, t]);

  // Auto-save — depends on `save` (which captures all state) so adding save to deps is sufficient
  useEffect(() => {
    if (isInitialLoad.current || loading) return;
    setSaveStatus("Unsaved");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [save, loading]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePaletteItem, setActivePaletteItem] = useState<string | null>(null);

  const { setNodeRef: setDroppableRef } = useDroppable({ id: 'canvas' });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'palette_item') {
      setActivePaletteItem(active.data.current.fieldType);
    } else {
      setActiveId(active.id as string);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActivePaletteItem(null);

    if (!over) return;

    if (active.data.current?.type === 'palette_item') {
      const fieldType = active.data.current.fieldType as FieldType;
      const newField = createNewField(fieldType);
      
      const overIndex = fields.findIndex((f) => f.id === over.id);
      if (overIndex !== -1) {
        const newFields = [...fields];
        newFields.splice(overIndex + (event.delta.y > 0 ? 1 : 0), 0, newField);
        setFields(newFields);
      } else {
        setFields([...fields, newField]);
      }
      setSelectedFieldId(newField.id);
      return;
    }

    if (active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const selectedField = useMemo(() => fields.find(f => f.id === selectedFieldId), [fields, selectedFieldId]);

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const saveStatusLabels: Record<string, string> = {
    "Saved": t("builder.saved"),
    "Saving...": t("builder.saving"),
    "Unsaved": t("builder.unsaved"),
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t("common.loading")}</div>;

  return (
    <div className="flex flex-col h-screen bg-muted/10">
      {/* Top Bar */}
      <header className="h-14 border-b bg-background flex items-center justify-between px-3 sm:px-4 gap-2 sm:gap-4 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/")}>
            <BackArrow className="h-4 w-4" />
          </Button>
          <div className="min-w-0 w-full sm:w-64">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-semibold border-none bg-transparent focus-visible:ring-1 h-8 px-2"
              placeholder={t("builder.formTitlePlaceholder")}
            />
          </div>
          <span className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
            {saveStatus === "Saved" ? <CheckCircle2 className="h-3 w-3 text-success" /> : null}
            {saveStatusLabels[saveStatus]}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t("forms.statusDraft")}</SelectItem>
              <SelectItem value="active">{t("forms.statusActive")}</SelectItem>
              <SelectItem value="closed">{t("forms.statusClosed")}</SelectItem>
            </SelectContent>
          </Select>
          
          <FormSettingsPanel settings={settings} onChange={setSettings} />
          <BrandingPanel branding={branding} onChange={setBranding} formId={id ?? ""} />

          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => window.open(`/forms/${id}/preview`, '_blank')}>
            <Eye className="h-4 w-4" /> <span className="hidden sm:inline">{t("builder.preview")}</span>
          </Button>
          
          <SharePanel formId={id ?? ""} formTitle={title} />

          <Button size="sm" className="h-8 gap-2" onClick={save} disabled={saveStatus === "Saving..."}>
            <Save className="h-4 w-4" /> <span className="hidden sm:inline">{t("common.save")}</span>
          </Button>
        </div>
      </header>

      <Tabs defaultValue="build" className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b bg-background px-4 shrink-0">
          <TabsList className="h-9 bg-transparent gap-1 p-0">
            <TabsTrigger value="build" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm gap-2 px-3">
              <LayoutTemplate className="h-3.5 w-3.5" /> {t("builder.build")}
            </TabsTrigger>
            <TabsTrigger value="responses" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm gap-2 px-3">
              <BarChart2 className="h-3.5 w-3.5" /> {t("builder.responses")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="responses" className="flex-1 overflow-y-auto m-0 data-[state=inactive]:hidden">
          {id && <FormResponsesTab formId={id} fields={fields} />}
        </TabsContent>

        <TabsContent value="build" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Sidebar - Palette */}
          <aside className="hidden md:flex md:w-64 border-e bg-background flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b font-medium text-sm">{t("builder.fieldTypes")}</div>
            <div className="p-4 space-y-6">
              {FIELD_CATEGORIES.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t(CATEGORY_KEYS[cat.name])}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {cat.items.map((item) => (
                      <PaletteItem key={item.type} type={item.type} label={t(FIELD_TYPE_KEYS[item.type])} icon={item.icon} onAdd={() => { const f = createNewField(item.type as FieldType); setFields(prev => [...prev, f]); setSelectedFieldId(f.id); }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Center Canvas */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
            {status === "draft" && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 w-full max-w-2xl mb-4 flex items-center justify-between shrink-0">
                <span className="text-sm text-amber-800 dark:text-amber-200">
                  {t("builder.draftBanner")}
                </span>
                <Button size="sm" onClick={() => setStatus("active")}>
                  {t("builder.publishNow")}
                </Button>
              </div>
            )}
            <div className="w-full max-w-2xl">
              <div className="mb-6 space-y-2">
                <Input 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("builder.addDescription")}
                  className="bg-transparent border-none text-muted-foreground focus-visible:ring-1 shadow-none px-2"
                />
              </div>

              <div ref={setDroppableRef} className={`min-h-[400px] pb-32 space-y-3 ${fields.length === 0 ? 'flex items-center justify-center border-2 border-dashed rounded-xl' : ''}`}>
                {fields.length === 0 ? (
                  <div className="text-center space-y-4 text-muted-foreground">
                    <LayoutTemplate className="h-10 w-10 mx-auto opacity-50" />
                    <p>{t("builder.dragDropHint")}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/templates")}>
                        <LayoutTemplate className="h-4 w-4" /> {t("builder.browseTemplates")}
                      </Button>
                      {/* === AGENT 12: AI Generate Fields === */}
                      <FeatureGate feature="ai" requiredPlan="business" featureName="AI Form Generator" fallback={
                        <Button variant="outline" size="sm" className="gap-2 opacity-60" disabled>
                          <Sparkles className="h-4 w-4" /> {t("ai.generateWithAi")}
                        </Button>
                      }>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setAiDialogOpen(true)}>
                          <Sparkles className="h-4 w-4" /> {t("ai.generateWithAi")}
                        </Button>
                      </FeatureGate>
                      {/* === END AGENT 12 === */}
                    </div>
                  </div>
                ) : (
                  <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {fields.map((field) => (
                      <SortableFieldItem
                        key={field.id}
                        field={field}
                        activeId={selectedFieldId}
                        onClick={() => { setSelectedFieldId(field.id); if (isMobile) setPropertiesOpen(true); }}
                        onRemove={() => removeField(field.id)}
                        t={t}
                      />
                    ))}
                  </SortableContext>
                )}
              </div>
            </div>
          </main>

          {/* Right Sidebar - Properties */}
          <aside className="hidden md:flex md:w-80 border-s bg-background flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b font-medium text-sm">{t("builder.properties")}</div>
            
            {selectedField ? (
              <div className="p-4 space-y-6">
                <div className="space-y-2">
                  <Label>{t("builder.fieldLabel")}</Label>
                  <Input 
                    value={selectedField.label} 
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })} 
                  />
                </div>

                {!['section_header', 'paragraph_text'].includes(selectedField.type) && (
                  <div className="space-y-2">
                    <Label>{t("builder.placeholder")}</Label>
                    <Input 
                      value={selectedField.placeholder} 
                      onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })} 
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t("builder.helpText")}</Label>
                  <Input
                    value={selectedField.helpText}
                    onChange={(e) => updateField(selectedField.id, { helpText: e.target.value })}
                    placeholder={t("builder.helpTextPlaceholder")}
                  />
                </div>

                {!['section_header', 'paragraph_text'].includes(selectedField.type) && (
                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer" htmlFor="req-toggle">{t("builder.requiredField")}</Label>
                    <Switch 
                      id="req-toggle"
                      checked={selectedField.required} 
                      onCheckedChange={(v) => updateField(selectedField.id, { required: v })} 
                    />
                  </div>
                )}

                {/* Options Editor */}
                {['select', 'multi_select', 'radio', 'checkbox'].includes(selectedField.type) && (
                  <div className="space-y-3">
                    <Label>{t("builder.options")}</Label>
                    <div className="space-y-2">
                      {selectedField.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <Input 
                            value={opt} 
                            onChange={(e) => {
                              const newOpts = [...selectedField.options];
                              newOpts[i] = e.target.value;
                              updateField(selectedField.id, { options: newOpts });
                            }} 
                          />
                          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                            updateField(selectedField.id, { options: selectedField.options.filter((_, idx) => idx !== i) });
                          }}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => {
                      updateField(selectedField.id, { options: [...selectedField.options, `Option ${selectedField.options.length + 1}`] });
                    }}>
                      <Plus className="h-4 w-4" /> {t("builder.addOption")}
                    </Button>
                  </div>
                )}

                {/* Number Validation */}
                {selectedField.type === 'number' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("builder.minValue")}</Label>
                      <Input 
                        type="number" 
                        value={selectedField.validation.min ?? ''} 
                        onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, min: e.target.value ? Number(e.target.value) : undefined } })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("builder.maxValue")}</Label>
                      <Input 
                        type="number" 
                        value={selectedField.validation.max ?? ''} 
                        onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, max: e.target.value ? Number(e.target.value) : undefined } })} 
                      />
                    </div>
                  </div>
                )}

                {/* Text Validation */}
                {['text', 'textarea'].includes(selectedField.type) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("builder.minLength")}</Label>
                      <Input
                        type="number"
                        value={selectedField.validation.minLength ?? ''}
                        onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("builder.maxLength")}</Label>
                      <Input
                        type="number"
                        value={selectedField.validation.maxLength ?? ''}
                        onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })}
                      />
                    </div>
                  </div>
                )}

                {/* Phone Validation */}
                {selectedField.type === 'phone' && (
                  <div className="space-y-2">
                    <Label>{t("builder.regexPattern")}</Label>
                    <Input
                      value={selectedField.validation.phonePattern ?? ''}
                      onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, phonePattern: e.target.value || undefined } })}
                      placeholder="^[+]?[\d\s()-]{7,20}$"
                      className="font-mono text-xs"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">{t("builder.regexHint")}</p>
                  </div>
                )}

                {/* File Upload Validation */}
                {selectedField.type === 'file_upload' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("builder.maxFileSize")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={selectedField.validation.maxFileSize ?? ''}
                        onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, maxFileSize: e.target.value ? Number(e.target.value) : undefined } })}
                        placeholder="20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("builder.allowedFileTypes")}</Label>
                      <Input
                        value={selectedField.validation.allowedFileTypes?.join(', ') ?? ''}
                        onChange={(e) => {
                          const types = e.target.value
                            ? e.target.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
                            : undefined;
                          updateField(selectedField.id, { validation: { ...selectedField.validation, allowedFileTypes: types } });
                        }}
                        placeholder="pdf, jpg, png, docx"
                      />
                      <p className="text-xs text-muted-foreground">{t("builder.allowedFileTypesHint")}</p>
                    </div>
                  </div>
                )}

                {/* Conditional Logic */}
                {!['section_header', 'paragraph_text'].includes(selectedField.type) && (
                  <ConditionalLogic
                    condition={selectedField.condition}
                    onChange={(condition) => updateField(selectedField.id, { condition })}
                    availableFields={fields
                      .filter(f => f.id !== selectedField.id && !['section_header', 'paragraph_text'].includes(f.type))
                      .map(f => ({ id: f.id, label: f.label }))}
                  />
                )}

              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center h-full gap-3">
                <LayoutTemplate className="h-8 w-8 opacity-20" />
                <p>{t("builder.selectFieldHint")}</p>
              </div>
            )}
          </aside>

        </div>

        <DragOverlay>
          {activePaletteItem ? (
            <div className="flex items-center gap-2 p-2 rounded-md border bg-card shadow-xl opacity-80 scale-105">
              <span className="text-sm font-medium capitalize">{activePaletteItem.replace('_', ' ')}</span>
            </div>
          ) : activeId ? (
            <div className="p-4 rounded-lg border bg-card shadow-xl opacity-80 scale-105 ring-2 ring-primary">
              <div className="flex items-start gap-3">
                <GripVertical className="h-5 w-5 mt-1 text-muted-foreground" />
                <div className="font-medium text-sm pt-1">{fields.find(f => f.id === activeId)?.label || "Field"}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

        {/* Mobile: floating add-field button */}
        <Button className="md:hidden fixed bottom-6 right-6 z-20 h-14 w-14 rounded-full shadow-lg" onClick={() => setPaletteOpen(true)}>
          <Plus className="h-6 w-6" />
        </Button>

        {/* Mobile: Field palette sheet */}
        <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
          <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t("builder.fieldTypes")}</SheetTitle>
            </SheetHeader>
            <div className="p-4 space-y-6">
              {FIELD_CATEGORIES.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t(CATEGORY_KEYS[cat.name])}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.type}
                          className="flex items-center gap-2 p-3 rounded-md border bg-card hover:bg-accent min-h-[44px]"
                          onClick={() => {
                            const f = createNewField(item.type as FieldType);
                            setFields(prev => [...prev, f]);
                            setSelectedFieldId(f.id);
                            setPaletteOpen(false);
                          }}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{t(FIELD_TYPE_KEYS[item.type])}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile: Properties sheet */}
        <Sheet open={propertiesOpen} onOpenChange={setPropertiesOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t("builder.properties")}</SheetTitle>
            </SheetHeader>
            {selectedField ? (
              <div className="p-4 space-y-6">
                <div className="space-y-2">
                  <Label>{t("builder.fieldLabel")}</Label>
                  <Input value={selectedField.label} onChange={(e) => updateField(selectedField.id, { label: e.target.value })} />
                </div>
                {!['section_header', 'paragraph_text'].includes(selectedField.type) && (
                  <div className="space-y-2">
                    <Label>{t("builder.placeholder")}</Label>
                    <Input value={selectedField.placeholder} onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t("builder.helpText")}</Label>
                  <Input value={selectedField.helpText} onChange={(e) => updateField(selectedField.id, { helpText: e.target.value })} placeholder={t("builder.helpTextPlaceholder")} />
                </div>
                {!['section_header', 'paragraph_text'].includes(selectedField.type) && (
                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer" htmlFor="req-toggle-mobile">{t("builder.requiredField")}</Label>
                    <Switch id="req-toggle-mobile" checked={selectedField.required} onCheckedChange={(v) => updateField(selectedField.id, { required: v })} />
                  </div>
                )}
                {['select', 'multi_select', 'radio', 'checkbox'].includes(selectedField.type) && (
                  <div className="space-y-3">
                    <Label>{t("builder.options")}</Label>
                    <div className="space-y-2">
                      {selectedField.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <Input value={opt} onChange={(e) => { const newOpts = [...selectedField.options]; newOpts[i] = e.target.value; updateField(selectedField.id, { options: newOpts }); }} />
                          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => updateField(selectedField.id, { options: selectedField.options.filter((_, idx) => idx !== i) })}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => updateField(selectedField.id, { options: [...selectedField.options, `Option ${selectedField.options.length + 1}`] })}>
                      <Plus className="h-4 w-4" /> {t("builder.addOption")}
                    </Button>
                  </div>
                )}
                <Button variant="destructive" size="sm" className="w-full gap-2" onClick={() => { removeField(selectedField.id); setPropertiesOpen(false); }}>
                  <Trash2 className="h-4 w-4" /> {t("builder.removeField", { defaultValue: "Remove field" })}
                </Button>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <p>{t("builder.selectFieldHint")}</p>
              </div>
            )}
          </SheetContent>
        </Sheet>

        </TabsContent>
      </Tabs>
      {/* === AGENT 12: AI Generate Fields Dialog === */}
      <AiFormGenerator
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onFieldsGenerated={handleAiFieldsGenerated}
        fixedMode={mode}
      />
      {/* === END AGENT 12 === */}
    </div>
  );
}
