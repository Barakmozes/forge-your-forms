import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Paintbrush, UploadCloud, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FormBranding {
  primaryColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  font?: string;
  borderRadius?: string;
  showPoweredBy?: boolean;
}

interface BrandingPanelProps {
  branding: FormBranding;
  onChange: (branding: FormBranding) => void;
  formId: string;
}

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "system-ui", label: "System Default" },
];

const RADIUS_OPTIONS = [
  { value: "0px", label: "Sharp" },
  { value: "8px", label: "Rounded" },
  { value: "9999px", label: "Pill" },
];

export default function BrandingPanel({ branding, onChange, formId }: BrandingPanelProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<FormBranding>(branding);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocal(branding);
  }, [branding]);

  const update = (patch: Partial<FormBranding>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Logo must be under 2 MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${formId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      update({ logoUrl: data.publicUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setUploading(false);
  };

  const removeLogo = () => {
    update({ logoUrl: undefined });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Paintbrush className="h-4 w-4" /> Branding
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display">Branding</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Colors */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Colors
            </h3>

            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={local.primaryColor ?? "#22c55e"}
                  onChange={(e) => update({ primaryColor: e.target.value })}
                  className="h-9 w-9 rounded border cursor-pointer p-0.5"
                />
                <Input
                  value={local.primaryColor ?? "#22c55e"}
                  onChange={(e) => update({ primaryColor: e.target.value })}
                  placeholder="#22c55e"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={local.backgroundColor ?? "#ffffff"}
                  onChange={(e) => update({ backgroundColor: e.target.value })}
                  className="h-9 w-9 rounded border cursor-pointer p-0.5"
                />
                <Input
                  value={local.backgroundColor ?? "#ffffff"}
                  onChange={(e) => update({ backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo</Label>
            {local.logoUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <img
                  src={local.logoUrl}
                  alt="Form logo"
                  className="h-10 w-10 rounded object-contain"
                />
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  Logo uploaded
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={removeLogo}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed hover:border-primary/50 cursor-pointer transition-colors">
                <UploadCloud className="h-6 w-6 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Click to upload logo"}
                </span>
                <span className="text-xs text-muted-foreground">Max 2 MB</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                  }}
                />
              </label>
            )}
          </div>

          <Separator />

          {/* Font */}
          <div className="space-y-2">
            <Label>Font</Label>
            <Select
              value={local.font ?? "Inter"}
              onValueChange={(v) => update({ font: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    <span style={{ fontFamily: f.value }}>{f.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Corner Radius */}
          <div className="space-y-2">
            <Label>Corner Radius</Label>
            <Select
              value={local.borderRadius ?? "8px"}
              onValueChange={(v) => update({ borderRadius: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Powered By */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="cursor-pointer" htmlFor="powered-by-toggle">
                Show "Powered by FormForge"
              </Label>
              <p className="text-xs text-muted-foreground">
                Display branding badge on the public form.
              </p>
            </div>
            <Switch
              id="powered-by-toggle"
              checked={local.showPoweredBy ?? true}
              onCheckedChange={(v) => update({ showPoweredBy: v })}
            />
          </div>

          {/* Preview */}
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Preview
            </h3>
            <div
              className="rounded-lg border p-6 transition-all"
              style={{
                backgroundColor: local.backgroundColor ?? "#ffffff",
                fontFamily: local.font ?? "Inter",
                borderRadius: local.borderRadius ?? "8px",
              }}
            >
              {local.logoUrl && (
                <img src={local.logoUrl} alt="" className="h-8 mb-3 object-contain" />
              )}
              <div className="h-3 rounded-full mb-2" style={{ backgroundColor: local.primaryColor ?? "#22c55e", width: "60%" }} />
              <div className="h-2 rounded-full bg-gray-200 mb-1.5" style={{ width: "80%" }} />
              <div className="h-2 rounded-full bg-gray-200 mb-4" style={{ width: "50%" }} />
              <div
                className="h-8 rounded text-white text-xs flex items-center justify-center font-medium"
                style={{
                  backgroundColor: local.primaryColor ?? "#22c55e",
                  borderRadius: local.borderRadius ?? "8px",
                }}
              >
                Submit
              </div>
              {(local.showPoweredBy ?? true) && (
                <p className="text-[10px] text-gray-400 text-center mt-3">
                  Powered by FormForge
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
