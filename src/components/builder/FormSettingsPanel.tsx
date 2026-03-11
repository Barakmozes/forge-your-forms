import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
          <Settings2 className="h-4 w-4" /> {t("builder.settings")}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display">{t("builder.formSettings")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Submission Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("builder.submission")}
            </h3>

            <div className="space-y-2">
              <Label>{t("builder.thankYouMessage")}</Label>
              <Textarea
                value={local.thankYouMessage ?? ""}
                onChange={(e) => update({ thankYouMessage: e.target.value || undefined })}
                placeholder={t("builder.thankYouPlaceholder")}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {t("builder.thankYouHint")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("builder.redirectUrl")}</Label>
              <Input
                type="url"
                value={local.redirectUrl ?? ""}
                onChange={(e) => update({ redirectUrl: e.target.value || undefined })}
                placeholder="https://example.com/thank-you"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                {t("builder.redirectHint")}
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="cursor-pointer" htmlFor="limit-email-toggle">
                  {t("builder.limitOnePerEmail")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("builder.limitOneHint")}
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
              <Label>{t("builder.closeAfterCount")}</Label>
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
                placeholder={t("builder.unlimited")}
              />
              <p className="text-xs text-muted-foreground">
                {t("builder.closeAfterHint")}
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
