import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

interface MemberRow {
  user_id: string;
  role: WorkspaceRole;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  owner: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  editor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  viewer: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function MembersManager() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleAsync } = useErrorHandler();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("editor");
  const [inviting, setInviting] = useState(false);

  const isOwner = currentWorkspace?.owner_id === user?.id;

  useEffect(() => {
    if (!currentWorkspace) return;
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  async function fetchMembers() {
    if (!currentWorkspace) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", currentWorkspace.id);

    if (error || !data) {
      setLoading(false);
      return;
    }

    const userIds = data.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .in("id", userIds);

    const merged: MemberRow[] = data.map((m) => {
      const profile = profiles?.find((p) => p.id === m.user_id);
      return {
        user_id: m.user_id,
        role: m.role,
        email: profile?.email ?? "",
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      };
    });

    setMembers(merged);
    setLoading(false);
  }

  async function handleInvite() {
    if (!currentWorkspace || !inviteEmail.trim()) return;
    setInviting(true);

    const result = await handleAsync(
      async () => {
        // Find user by email
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", inviteEmail.trim().toLowerCase())
          .maybeSingle();

        if (profileErr) throw profileErr;
        if (!profile) throw new Error("No user found with that email. They must sign up first.");

        // Check if already a member
        const existing = members.find((m) => m.user_id === profile.id);
        if (existing) throw new Error("This user is already a workspace member.");

        // Add member
        const { error: insertErr } = await supabase
          .from("workspace_members")
          .insert({
            workspace_id: currentWorkspace.id,
            user_id: profile.id,
            role: inviteRole,
          });

        if (insertErr) throw insertErr;
        return true;
      },
      {
        context: { component: "MembersManager", action: "inviteMember" },
        errorMessage: "Failed to invite member.",
      }
    );

    if (result) {
      toast({ title: "Member invited", description: `${inviteEmail} added as ${inviteRole}.` });
      setInviteEmail("");
      setInviteRole("editor");
      setInviteOpen(false);
      fetchMembers();
    }
    setInviting(false);
  }

  async function handleRemove(memberId: string) {
    if (!currentWorkspace) return;
    if (memberId === user?.id) {
      toast({ title: "Cannot remove yourself", variant: "destructive" });
      return;
    }

    await handleAsync(
      async () => {
        const { error } = await supabase
          .from("workspace_members")
          .delete()
          .eq("workspace_id", currentWorkspace.id)
          .eq("user_id", memberId);

        if (error) throw error;
      },
      {
        context: { component: "MembersManager", action: "removeMember" },
        errorMessage: "Failed to remove member.",
      }
    );

    toast({ title: "Member removed" });
    fetchMembers();
  }

  async function handleRoleChange(memberId: string, newRole: WorkspaceRole) {
    if (!currentWorkspace) return;

    await handleAsync(
      async () => {
        const { error } = await supabase
          .from("workspace_members")
          .update({ role: newRole })
          .eq("workspace_id", currentWorkspace.id)
          .eq("user_id", memberId);

        if (error) throw error;
      },
      {
        context: { component: "MembersManager", action: "changeRole" },
        errorMessage: "Failed to update role.",
      }
    );

    toast({ title: "Role updated", description: `Changed to ${newRole}.` });
    fetchMembers();
  }

  function getInitials(name: string | null, email: string): string {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return email.charAt(0).toUpperCase();
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading members...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Members</h3>
          <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>

        {isOwner && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="w-full">
                  {inviting ? "Inviting..." : "Send Invite"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {isOwner && <TableHead className="w-[60px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.user_id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(member.full_name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.full_name || member.email.split("@")[0]}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{member.email}</TableCell>
                <TableCell>
                  {isOwner && member.role !== "owner" ? (
                    <Select value={member.role} onValueChange={(v) => handleRoleChange(member.user_id, v as WorkspaceRole)}>
                      <SelectTrigger className="h-8 w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className={ROLE_COLORS[member.role]}>
                      {member.role}
                    </Badge>
                  )}
                </TableCell>
                {isOwner && (
                  <TableCell>
                    {member.user_id !== user?.id && member.role !== "owner" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemove(member.user_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
