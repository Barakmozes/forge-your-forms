// ============================================
// MailchimpIntegration — Mailchimp API config panel (Agent 10)
// ============================================

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import type { MailchimpConfig } from "@/hooks/useIntegrations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface MailchimpIntegrationProps {
  formId: string;
  config: MailchimpConfig;
  saving: boolean;
  onSave: (config: MailchimpConfig) => Promise<boolean>;
}

interface MailchimpList {
  id: string;
  name: string;
  member_count: number;
}

export default function MailchimpIntegration({ config, saving, onSave }: MailchimpIntegrationProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(config.enabled);
  const [apiKey, setApiKey] = useState(config.api_key);
  const [listId, setListId] = useState(config.list_id);
  const [listName, setListName] = useState(config.list_name);
  const [lists, setLists] = useState<MailchimpList[]>([]);
  const [fetchingLists, setFetchingLists] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(config.field_mapping);

  const isValidApiKey = apiKey.length > 0 && apiKey.includes("-");
  const maskedApiKey = apiKey ? `${apiKey.slice(0, 4)}${"*".repeat(Math.max(0, apiKey.length - 8))}${apiKey.slice(-4)}` : "";

  // Fetch Mailchimp lists when API key changes
  const fetchLists = async () => {
    if (!isValidApiKey) return;
    setFetchingLists(true);
    setListError(null);

    try {
      // Extract datacenter from API key (format: key-dc)
      const dc = apiKey.split("-").pop();
      const response = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists?count=100`, {
        headers: {
          Authorization: `apikey ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Mailchimp API error: ${response.status}`);
      }

      const data = await response.json();
      const fetchedLists = (data.lists || []).map((l: { id: string; name: string; stats: { member_count: number } }) => ({
        id: l.id,
        name: l.name,
        member_count: l.stats?.member_count || 0,
      }));
      setLists(fetchedLists);

      if (fetchedLists.length === 0) {
        setListError(t("integrations.mailchimpNoLists"));
      }
    } catch {
      setListError(t("integrations.mailchimpFetchError"));
      setLists([]);
    }

    setFetchingLists(false);
  };

  useEffect(() => {
    if (enabled && isValidApiKey && lists.length === 0 && !fetchingLists) {
      fetchLists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, apiKey]);

  const handleSave = async () => {
    const selectedList = lists.find((l) => l.id === listId);
    const newConfig: MailchimpConfig = {
      enabled,
      api_key: apiKey.trim(),
      list_id: listId,
      list_name: selectedList?.name || listName,
      field_mapping: fieldMapping,
    };

    const success = await onSave(newConfig);
    if (success) {
      toast({ title: t("integrations.mailchimpSaved"), description: t("integrations.mailchimpSavedDesc") });
    } else {
      toast({ title: t("common.error"), description: t("integrations.mailchimpSaveError"), variant: "destructive" });
    }
  };

  const updateFieldMapping = (formField: string, mailchimpField: string) => {
    setFieldMapping((prev) => ({ ...prev, [formField]: mailchimpField }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFE01B]">
              <Mail className="h-5 w-5 text-black" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("integrations.mailchimp")}</CardTitle>
              <CardDescription>{t("integrations.mailchimpDesc")}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.enabled && config.list_id && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                {t("integrations.connected")}
              </Badge>
            )}
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-6">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="mc-apikey">{t("integrations.mailchimpApiKey")}</Label>
            <Input
              id="mc-apikey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxx-usXX"
              dir="ltr"
              className="font-mono text-sm"
            />
            {apiKey && (
              <p className="text-xs text-muted-foreground">
                {t("integrations.mailchimpStoredAs")}: <code>{maskedApiKey}</code>
              </p>
            )}
            <p className="text-xs text-muted-foreground">{t("integrations.mailchimpApiKeyHelp")}</p>
          </div>

          {/* Fetch Lists Button */}
          {isValidApiKey && (
            <Button variant="outline" size="sm" onClick={fetchLists} disabled={fetchingLists}>
              {fetchingLists && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("integrations.mailchimpFetchLists")}
            </Button>
          )}

          {/* List Selector */}
          {lists.length > 0 && (
            <div className="space-y-2">
              <Label>{t("integrations.mailchimpSelectList")}</Label>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("integrations.mailchimpSelectListPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name} ({list.member_count.toLocaleString()} {t("integrations.mailchimpMembers")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error */}
          {listError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {listError}
            </div>
          )}

          {/* Field Mapping */}
          {listId && (
            <div className="space-y-3">
              <Label>{t("integrations.mailchimpFieldMapping")}</Label>
              <p className="text-xs text-muted-foreground">{t("integrations.mailchimpFieldMappingHelp")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">{t("integrations.mailchimpEmailField")}</Label>
                  <Input
                    value={fieldMapping.email || "email"}
                    onChange={(e) => updateFieldMapping("email", e.target.value)}
                    placeholder="email"
                    dir="ltr"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("integrations.mailchimpNameField")}</Label>
                  <Input
                    value={fieldMapping.name || "name"}
                    onChange={(e) => updateFieldMapping("name", e.target.value)}
                    placeholder="name"
                    dir="ltr"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Auto-push info */}
          {listId && (
            <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{t("integrations.mailchimpAutoPush")}</p>
            </div>
          )}

          {/* Save */}
          <Button onClick={handleSave} disabled={saving || !isValidApiKey}>
            {saving ? t("common.saving") : t("common.saveChanges")}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
