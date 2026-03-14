import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/use-toast";
import FeatureGate from "@/components/upgrade/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";
import { InfoTooltip, ActionTooltip } from "@/components/ui/info-tooltip";
import { format } from "date-fns";

export default function ApiKeyManager() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { apiKeys, loading, createApiKey, revokeApiKey } = useApiKeys(currentWorkspace?.id);
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!keyName.trim()) return;
    setCreating(true);
    const { rawKey, error } = await createApiKey(keyName.trim());
    setCreating(false);

    if (error) {
      toast({ title: t("api.createFailed"), description: error, variant: "destructive" });
    } else if (rawKey) {
      setNewRawKey(rawKey);
      setKeyName("");
    }
  }

  async function handleCopyKey() {
    if (!newRawKey) return;
    try {
      await navigator.clipboard.writeText(newRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }

  async function handleRevoke() {
    if (!revokingId) return;
    const { error } = await revokeApiKey(revokingId);
    if (error) {
      toast({ title: t("api.revokeFailed"), description: error, variant: "destructive" });
    } else {
      toast({ title: t("api.keyRevoked") });
    }
    setRevokingId(null);
  }

  function closeCreateDialog() {
    setShowCreateDialog(false);
    setNewRawKey(null);
    setKeyName("");
    setCopied(false);
  }

  return (
    <FeatureGate feature="api" requiredPlan="growth" featureName="REST API">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t("api.apiKeys")}
              <InfoTooltip contentKey="tooltips.api.info" />
            </CardTitle>
            <CardDescription>{t("api.apiKeysDescription")}</CardDescription>
          </div>
          <ActionTooltip contentKey="tooltips.api.generateKey">
            <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              {t("api.generateKey")}
            </Button>
          </ActionTooltip>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Key className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{t("api.noKeys")}</p>
              <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
                {t("api.generateFirst")}
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("api.keyName")}</TableHead>
                    <TableHead>{t("api.prefix")}</TableHead>
                    <TableHead>{t("api.created")}</TableHead>
                    <TableHead>{t("api.lastUsed")}</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs" dir="ltr">
                          {key.key_prefix}...
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(key.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.last_used_at
                          ? format(new Date(key.last_used_at), "MMM d, yyyy")
                          : t("api.never")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
                          onClick={() => setRevokingId(key.id)}
                          title={t("tooltips.api.revokeKey")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={closeCreateDialog}>
        <DialogContent>
          {!newRawKey ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("api.generateApiKey")}</DialogTitle>
                <DialogDescription>{t("api.generateDescription")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">{t("api.keyName")}</Label>
                  <Input
                    id="key-name"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder={t("api.keyNamePlaceholder")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeCreateDialog}>{t("common.cancel")}</Button>
                <Button onClick={handleCreate} disabled={creating || !keyName.trim()}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("api.generate")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("api.keyCreated")}</DialogTitle>
                <DialogDescription>{t("api.keyCreatedDescription")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  <p className="text-sm text-muted-foreground">{t("api.keyShowOnce")}</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newRawKey}
                    readOnly
                    dir="ltr"
                    className="font-mono text-sm bg-muted"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyKey} title={t("tooltips.api.copyKey")}>
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeCreateDialog}>{t("common.done")}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <AlertDialog open={!!revokingId} onOpenChange={() => setRevokingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("api.revokeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("api.revokeConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("api.revokeKey")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FeatureGate>
  );
}
