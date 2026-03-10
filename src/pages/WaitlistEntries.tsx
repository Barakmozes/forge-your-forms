import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, Mail, Search, Trash2, Users } from "lucide-react";
import { useWaitlist } from "@/hooks/useWaitlist";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  waiting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  invited: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  joined: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  removed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function WaitlistEntries() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entries, loading, totalCount, bulkInvite, deleteEntry, exportCSV } = useWaitlist(id ?? "");

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);

  const filtered = entries.filter(
    (e) =>
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (entryId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((e) => e.id)));
    }
  };

  const handleBulkInvite = async () => {
    if (selected.size === 0) return;
    setInviting(true);
    const { error } = await bulkInvite(
      [...selected],
      inviteMessage.trim() || undefined
    );
    if (error) {
      toast.error("Failed to send invites: " + error.message);
    } else {
      toast.success(`Invited ${selected.size} entries`);
      setSelected(new Set());
      setInviteDialogOpen(false);
      setInviteMessage("");
    }
    setInviting(false);
  };

  const handleDelete = async (entryId: string) => {
    const { error } = await deleteEntry(entryId);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Entry removed");
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  if (!id) return null;

  return (
    <AppLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/forms/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">Waitlist Entries</h1>
          <p className="text-muted-foreground text-sm">{totalCount} total signups</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => setInviteDialogOpen(true)}
                >
                  <Mail className="h-4 w-4" />
                  Invite ({selected.size})
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading entries...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                {search ? "No entries match your search" : "No signups yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(entry.id)}
                          onCheckedChange={() => toggleSelect(entry.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {entry.position}
                      </TableCell>
                      <TableCell className="font-medium">{entry.email}</TableCell>
                      <TableCell>{entry.name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {entry.referral_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={STATUS_COLORS[entry.status] ?? ""}
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive/60 hover:text-destructive"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite {selected.size} people</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <Textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal message to include with the invite..."
                rows={3}
              />
            </div>
            <Button
              onClick={handleBulkInvite}
              disabled={inviting}
              className="w-full gap-2"
            >
              <Mail className="h-4 w-4" />
              {inviting ? "Sending..." : `Send Invites (${selected.size})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
