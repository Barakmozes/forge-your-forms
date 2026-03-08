import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Copy, GripVertical, Plus, Trash2, Eye, LayoutTemplate, Type, Hash, Mail, Phone, Calendar, CheckSquare, List, CheckCircle2, UploadCloud, Heading1, AlignLeft } from "lucide-react";
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable, useDroppable } from "@dnd-kit/core";

type FieldType = "text" | "textarea" | "number" | "email" | "phone" | "date" | "select" | "multi_select" | "checkbox" | "radio" | "file_upload" | "section_header" | "paragraph_text";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  options: string[];
  validation: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

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

function PaletteItem({ type, label, icon: Icon }: { type: string; label: string; icon: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type: 'palette_item', fieldType: type }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function SortableFieldItem({ field, activeId, onClick, onRemove }: { field: FormField, activeId: string | null, onClick: () => void, onRemove: () => void }) {
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
            {field.label || "Untitled Field"}
            {field.required && <span className="text-destructive">*</span>}
            <Badge variant="secondary" className="text-[10px] ml-2 font-normal">{field.type}</Badge>
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
              <div>{field.placeholder || "User input goes here..."}</div>
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [fields, setFields] = useState<FormField[]>([]);
  
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Unsaved">("Saved");

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
        setFields(Array.isArray(data.fields) ? (data.fields as unknown as FormField[]) : []);
        setLoading(false);
        setTimeout(() => { isInitialLoad.current = false; }, 500);
      });
  }, [id, navigate]);

  const save = async () => {
    if (!id) return;
    setSaveStatus("Saving...");
    const { error } = await supabase
      .from("forms")
      .update({ title, description: description || null, status: status as any, fields: fields as any })
      .eq("id", id);
    
    if (error) {
      setSaveStatus("Unsaved");
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setSaveStatus("Saved");
    }
  };

  // Auto-save
  useEffect(() => {
    if (isInitialLoad.current || loading) return;
    setSaveStatus("Unsaved");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [fields, title, description, status]);

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

  const copyShareLink = () => {
    const url = `${window.location.origin}/forms/${id}/submit`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-muted/10">
      {/* Top Bar */}
      <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-64">
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="font-semibold border-none bg-transparent focus-visible:ring-1 h-8 px-2"
              placeholder="Form Title"
            />
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {saveStatus === "Saved" ? <CheckCircle2 className="h-3 w-3 text-success" /> : null}
            {saveStatus}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => window.open(`/forms/${id}/submit`, '_blank')}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          
          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={copyShareLink}>
            <Copy className="h-4 w-4" /> Copy Link
          </Button>

          <Button size="sm" className="h-8 gap-2" onClick={save} disabled={saveStatus === "Saving..."}>
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Sidebar - Palette */}
          <aside className="w-64 border-r bg-background flex flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b font-medium text-sm">Field Types</div>
            <div className="p-4 space-y-6">
              {FIELD_CATEGORIES.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat.name}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {cat.items.map((item) => (
                      <PaletteItem key={item.type} type={item.type} label={item.label} icon={item.icon} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Center Canvas */}
          <main className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
            <div className="w-full max-w-2xl">
              <div className="mb-6 space-y-2">
                <Input 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for your form..."
                  className="bg-transparent border-none text-muted-foreground focus-visible:ring-1 shadow-none px-2"
                />
              </div>

              <div ref={setDroppableRef} className={`min-h-[400px] pb-32 space-y-3 ${fields.length === 0 ? 'flex items-center justify-center border-2 border-dashed rounded-xl' : ''}`}>
                {fields.length === 0 ? (
                  <div className="text-center space-y-2 text-muted-foreground">
                    <LayoutTemplate className="h-10 w-10 mx-auto opacity-50" />
                    <p>Drag and drop fields from the left to start building</p>
                  </div>
                ) : (
                  <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {fields.map((field) => (
                      <SortableFieldItem 
                        key={field.id} 
                        field={field} 
                        activeId={selectedFieldId}
                        onClick={() => setSelectedFieldId(field.id)}
                        onRemove={() => removeField(field.id)}
                      />
                    ))}
                  </SortableContext>
                )}
              </div>
            </div>
          </main>

          {/* Right Sidebar - Properties */}
          <aside className="w-80 border-l bg-background flex flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b font-medium text-sm">Properties</div>
            
            {selectedField ? (
              <div className="p-4 space-y-6">
                <div className="space-y-2">
                  <Label>Field Label</Label>
                  <Input 
                    value={selectedField.label} 
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })} 
                  />
                </div>

                {!['section_header', 'paragraph_text'].includes(selectedField.type) && (
                  <div className="space-y-2">
                    <Label>Placeholder</Label>
                    <Input 
                      value={selectedField.placeholder} 
                      onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })} 
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Help Text</Label>
                  <Input 
                    value={selectedField.helpText} 
                    onChange={(e) => updateField(selectedField.id, { helpText: e.target.value })} 
                    placeholder="Small text below the field"
                  />
                </div>

                {!['section_header', 'paragraph_text'].includes(selectedField.type) && (
                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer" htmlFor="req-toggle">Required field</Label>
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
                    <Label>Options</Label>
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
                      <Plus className="h-4 w-4" /> Add Option
                    </Button>
                  </div>
                )}

                {/* Number Validation */}
                {selectedField.type === 'number' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Value</Label>
                      <Input 
                        type="number" 
                        value={selectedField.validation.min ?? ''} 
                        onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, min: e.target.value ? Number(e.target.value) : undefined } })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Value</Label>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Length</Label>
                      <Input 
                        type="number" 
                        value={selectedField.validation.minLength ?? ''} 
                        onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Length</Label>
                      <Input 
                        type="number" 
                        value={selectedField.validation.maxLength ?? ''} 
                        onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })} 
                      />
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center h-full gap-3">
                <LayoutTemplate className="h-8 w-8 opacity-20" />
                <p>Select a field on the canvas to edit its properties here.</p>
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
    </div>
  );
}
