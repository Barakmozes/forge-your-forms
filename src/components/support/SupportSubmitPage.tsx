import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Headphones, Send, Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SupportSubmitPageProps {
  formId: string;
  title: string;
  description: string | null;
  branding: Record<string, string> | null;
  settings: Record<string, unknown> | null;
}

type SubmitState = "idle" | "submitting" | "success";

interface SubmittedTicket {
  ticketNumber: string;
  email: string;
}

// ─── Priority Config ─────────────────────────────────────────────────────────

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
] as const;

type PriorityValue = (typeof PRIORITIES)[number]["value"];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SupportSubmitPage({
  formId,
  title,
  description,
  branding,
  settings,
}: SupportSubmitPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<PriorityValue>("medium");
  const [ticketDescription, setTicketDescription] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submittedTicket, setSubmittedTicket] = useState<SubmittedTicket | null>(null);
  const [copied, setCopied] = useState(false);

  // Extract settings
  const categories = Array.isArray(settings?.categories)
    ? (settings.categories as string[])
    : [];
  const hasCategories = categories.length > 0;

  // Extract branding
  const primaryColor = branding?.primaryColor ?? "";
  const logo = branding?.logo ?? "";

  const accentStyle: React.CSSProperties = primaryColor
    ? { backgroundColor: primaryColor }
    : {};

  const ctaBtnStyle: React.CSSProperties = primaryColor
    ? { backgroundColor: primaryColor, borderColor: primaryColor }
    : {};

  // ─── Form Validation ────────────────────────────────────────────────────────

  function validate(): boolean {
    if (!name.trim()) {
      toast.error("Please enter your name.");
      document.getElementById("field-name")?.focus();
      return false;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your email address.");
      document.getElementById("field-email")?.focus();
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      document.getElementById("field-email")?.focus();
      return false;
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject for your ticket.");
      document.getElementById("field-subject")?.focus();
      return false;
    }

    if (!ticketDescription.trim()) {
      toast.error("Please describe your issue.");
      document.getElementById("field-description")?.focus();
      return false;
    }

    if (ticketDescription.trim().length < 20) {
      toast.error("Description must be at least 20 characters long.");
      document.getElementById("field-description")?.focus();
      return false;
    }

    return true;
  }

  // ─── Submit Handler ─────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validate()) return;

    setSubmitState("submitting");

    try {
      // Insert the ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          form_id: formId,
          ticket_number: "",
          subject: subject.trim(),
          description: ticketDescription.trim(),
          submitted_by_email: email.trim(),
          submitted_by_name: name.trim(),
          category: category || null,
          priority,
        })
        .select("id, ticket_number")
        .single();

      if (ticketError) throw ticketError;

      // Insert the initial message
      const { error: messageError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketData.id,
          sender_type: "customer",
          sender_name: name.trim(),
          sender_email: email.trim(),
          message: ticketDescription.trim(),
        });

      if (messageError) throw messageError;

      setSubmittedTicket({
        ticketNumber: ticketData.ticket_number,
        email: email.trim(),
      });
      setSubmitState("success");
      toast.success("Your support ticket has been submitted!");
    } catch (err: unknown) {
      setSubmitState("idle");
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      toast.error(message);
    }
  }

  // ─── Copy Ticket Number ─────────────────────────────────────────────────────

  async function handleCopyTicketNumber() {
    if (!submittedTicket) return;

    try {
      await navigator.clipboard.writeText(submittedTicket.ticketNumber);
      setCopied(true);
      toast.success("Ticket number copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy. Please copy it manually.");
    }
  }

  // ─── Build Tracking URL ─────────────────────────────────────────────────────

  function getTrackingUrl(): string {
    if (!submittedTicket) return "#";
    const params = new URLSearchParams({
      ticket: submittedTicket.ticketNumber,
      email: submittedTicket.email,
    });
    return `/track/${formId}?${params.toString()}`;
  }

  // ─── Success Screen ────────────────────────────────────────────────────────

  if (submitState === "success" && submittedTicket) {
    return (
      <div
        className={cn(
          "min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:py-16",
          "bg-gradient-to-br from-background via-background to-muted/40",
          "dark:from-background dark:via-background dark:to-muted/20",
          "transition-colors duration-300"
        )}
      >
        <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Success Icon */}
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full",
              "bg-green-100 dark:bg-green-900/30"
            )}
          >
            <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>

          {/* Success Message */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ticket Submitted!
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              We have received your support request and will get back to you as
              soon as possible.
            </p>
          </div>

          {/* Ticket Number Card */}
          <Card className="w-full border-border/50 shadow-lg backdrop-blur-sm bg-card/95 dark:bg-card/90">
            <CardContent className="p-6 space-y-5">
              {/* Ticket Number */}
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Your Ticket Number
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-foreground tracking-wide">
                    {submittedTicket.ticketNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyTicketNumber}
                    className="h-9 w-9 shrink-0"
                    aria-label="Copy ticket number"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Confirmation Email Notice */}
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                A confirmation has been sent to{" "}
                <span className="font-medium text-foreground">
                  {submittedTicket.email}
                </span>
                . Keep your ticket number for reference.
              </p>

              {/* Track Ticket Link */}
              <a
                href={getTrackingUrl()}
                className={cn(
                  "flex items-center justify-center gap-2 w-full",
                  "h-11 rounded-md px-4 text-sm font-semibold",
                  "transition-all duration-200",
                  primaryColor
                    ? "text-white hover:opacity-90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                style={primaryColor ? ctaBtnStyle : {}}
              >
                Track Your Ticket
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>

          {/* Footer branding */}
          <p className="text-xs text-muted-foreground/60">
            Powered by FormForge
          </p>
        </div>
      </div>
    );
  }

  // ─── Submission Form ────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center px-4 py-8 sm:py-12",
        "bg-gradient-to-br from-background via-background to-muted/40",
        "dark:from-background dark:via-background dark:to-muted/20",
        "transition-colors duration-300"
      )}
    >
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Top Accent Bar */}
        <div
          className={cn(
            "h-2 w-full rounded-full",
            !primaryColor && "bg-primary"
          )}
          style={accentStyle}
        />

        {/* Header */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {logo && (
            <div className="flex justify-center">
              <img
                src={logo}
                alt={`${title} logo`}
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Headphones className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            </div>
            {description && (
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Form Card */}
        <Card
          className={cn(
            "w-full border-border/50 shadow-lg",
            "animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200",
            "backdrop-blur-sm bg-card/95 dark:bg-card/90"
          )}
        >
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ── Name & Email Row ─────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="field-name" className="text-sm font-medium text-foreground">
                    Name
                    <span className="text-destructive ml-1" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="field-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="h-11 text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field-email" className="text-sm font-medium text-foreground">
                    Email
                    <span className="text-destructive ml-1" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="field-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 text-base"
                    required
                  />
                </div>
              </div>

              {/* ── Subject ──────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="field-subject" className="text-sm font-medium text-foreground">
                  Subject
                  <span className="text-destructive ml-1" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="field-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className="h-11 text-base"
                  required
                />
              </div>

              {/* ── Category & Priority Row ──────────────────────────── */}
              <div
                className={cn(
                  "grid gap-4",
                  hasCategories ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                )}
              >
                {hasCategories && (
                  <div className="space-y-2">
                    <Label htmlFor="field-category" className="text-sm font-medium text-foreground">
                      Category
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="field-category" className="h-11 text-base">
                        <SelectValue placeholder="Select a category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-base py-3">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="field-priority" className="text-sm font-medium text-foreground">
                    Priority
                  </Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as PriorityValue)}>
                    <SelectTrigger id="field-priority" className="h-11 text-base">
                      <SelectValue placeholder="Select priority..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value} className="text-base py-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={cn("text-xs px-2 py-0", p.color)}
                            >
                              {p.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Description ──────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="field-description" className="text-sm font-medium text-foreground">
                  Description
                  <span className="text-destructive ml-1" aria-hidden="true">*</span>
                </Label>
                <Textarea
                  id="field-description"
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Please describe your issue in detail. Include any steps to reproduce, error messages, or relevant context..."
                  className="min-h-[160px] text-base resize-none"
                  required
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Minimum 20 characters
                  </p>
                  <p
                    className={cn(
                      "text-xs tabular-nums",
                      ticketDescription.trim().length < 20
                        ? "text-muted-foreground"
                        : "text-green-600 dark:text-green-400"
                    )}
                  >
                    {ticketDescription.trim().length} / 20
                  </p>
                </div>
              </div>

              {/* ── Submit Button ────────────────────────────────────── */}
              <Button
                type="submit"
                size="lg"
                disabled={submitState === "submitting"}
                className={cn(
                  "w-full h-12 text-base font-semibold",
                  "transition-all duration-200",
                  primaryColor && "hover:opacity-90"
                )}
                style={ctaBtnStyle}
              >
                {submitState === "submitting" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Submit Ticket
                    <Send className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer branding */}
        <p className="text-center text-xs text-muted-foreground/60 animate-in fade-in duration-700 delay-500">
          Powered by FormForge
        </p>
      </div>
    </div>
  );
}
