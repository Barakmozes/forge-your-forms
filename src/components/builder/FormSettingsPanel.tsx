import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Settings2 } from "lucide-react";

export interface FormSettings {
  thankYouMessage?: string;
  redirectUrl?: string;
  limitOnePerEmail?: boolean;
  closeAfterCount?: number | null;
}

interface FormSettingsPanelProps {
  settings: FormSettings;
  onChange: (settings: FormSettings) => void;
}

export default function FormSettingsPanel({ settings, onChange }: FormSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<FormSettings>(settings);

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const update = (patch: Partial<FormSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Settings2 className="h-4 w-4" /> Settings
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display">Form Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Submission Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Submission
            </h3>

            <div className="space-y-2">
              <Label>Thank You Message</Label>
              <Textarea
                value={local.thankYouMessage ?? ""}
                onChange={(e) => update({ thankYouMessage: e.target.value || undefined })}
                placeholder="Thank you — your response has been recorded successfully."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Shown after a successful submission. Leave blank for default.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Redirect URL</Label>
              <Input
                type="url"
                value={local.redirectUrl ?? ""}
                onChange={(e) => update({ redirectUrl: e.target.value || undefined })}
                placeholder="https://example.com/thank-you"
              />
              <p className="text-xs text-muted-foreground">
                Redirect users here after submission instead of showing a message.
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="cursor-pointer" htmlFor="limit-email-toggle">
                  Limit one per email
                </Label>
                <p className="text-xs text-muted-foreground">
                  Prevent duplicate submissions from the same email.
                </p>
              </div>
              <Switch
                id="limit-email-toggle"
                checked={local.limitOnePerEmail ?? false}
                onCheckedChange={(v) => update({ limitOnePerEmail: v })}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Close after N submissions</Label>
              <Input
                type="number"
                min={0}
                value={local.closeAfterCount ?? ""}
                onChange={(e) =>
                  update({
                    closeAfterCount: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
                placeholder="Unlimited"
              />
              <p className="text-xs text-muted-foreground">
                Automatically close the form after this many responses. Leave blank for unlimited.
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
