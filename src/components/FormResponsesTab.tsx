import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, TrendingUp, TrendingDown, Hash, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface FormField {
  id: string;
  type: string;
  label: string;
  options?: string[];
}

interface Submission {
  data: Record<string, unknown>;
  submitted_at: string;
}

interface Props {
  formId: string;
  fields: FormField[];
}

const CHOICE_TYPES = ["select", "radio", "multi_select", "checkbox"];
const TEXT_TYPES = ["text", "textarea", "email", "phone"];
const NUMBER_TYPES = ["number"];

const ANALYTICS_LIMIT = 500;

export default function FormResponsesTab({ formId, fields }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!formId) return;
    supabase
      .from("submissions")
      .select("data, submitted_at", { count: "exact" })
      .eq("form_id", formId)
      .order("submitted_at", { ascending: false })
      .limit(ANALYTICS_LIMIT)
      .then(({ data, count }) => {
        const rows = (data ?? []).map((s) => ({ ...s, data: (s.data as Record<string, unknown>) ?? {} }));
        setSubmissions(rows);
        setTruncated((count ?? 0) > ANALYTICS_LIMIT);
        setLoading(false);
      });

    // Realtime updates
    const channel = supabase
      .channel(`responses-${formId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "submissions", filter: `form_id=eq.${formId}` }, (payload) => {
        const newSub = payload.new as Record<string, unknown>;
        setSubmissions((prev) => [{ data: newSub.data ?? {}, submitted_at: newSub.submitted_at }, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [formId]);

  const analysisFields = useMemo(
    () => fields.filter((f) => !["section_header", "paragraph_text"].includes(f.type)),
    [fields]
  );

  const total = submissions.length;

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Truncation warning */}
      {truncated && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
          Charts show the most recent {ANALYTICS_LIMIT} submissions. Older responses are not included in these totals.
        </div>
      )}
      {/* Summary card */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {total > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Latest</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(submissions[0].submitted_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {total === 0 ? (
        <Card className="py-12 text-center">
          <CardContent className="flex flex-col items-center gap-2">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-semibold text-muted-foreground">No responses yet</p>
            <p className="text-xs text-muted-foreground">Set your form to Active and share the link to start collecting responses.</p>
          </CardContent>
        </Card>
      ) : (
        analysisFields.map((field) => {
          if (CHOICE_TYPES.includes(field.type)) {
            return <ChoiceFieldChart key={field.id} field={field} submissions={submissions} />;
          }
          if (NUMBER_TYPES.includes(field.type)) {
            return <NumberFieldStats key={field.id} field={field} submissions={submissions} />;
          }
          if (TEXT_TYPES.includes(field.type)) {
            return <TextFieldLatest key={field.id} field={field} submissions={submissions} />;
          }
          return null;
        })
      )}
    </div>
  );
}

// ─── Choice field bar chart ─────────────────────────────────────────────────
function ChoiceFieldChart({ field, submissions }: { field: FormField; submissions: Submission[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sub of submissions) {
      const val = sub.data[field.id];
      if (!val) continue;
      const vals = Array.isArray(val) ? val : [val];
      for (const v of vals) {
        const key = String(v);
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / submissions.length) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [field.id, submissions]);

  if (data.length === 0) return null;

  const max = data[0]?.count ?? 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{field.label}</CardTitle>
        <p className="text-xs text-muted-foreground">{data.length} option{data.length !== 1 ? "s" : ""} · {submissions.filter(s => s.data[field.id]).length} answered</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(80, data.length * 36)}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, max]} hide />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v: number, _: string, props: { payload: { pct: number } }) => [`${v} (${props.payload.pct}%)`, "Responses"]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="count" radius={4} maxBarSize={24}>
              {data.map((_, i) => (
                <Cell key={i} fill={`hsl(var(--primary) / ${1 - i * 0.12})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Number field stats ──────────────────────────────────────────────────────
function NumberFieldStats({ field, submissions }: { field: FormField; submissions: Submission[] }) {
  const stats = useMemo(() => {
    const nums = submissions
      .map((s) => s.data[field.id])
      .filter((v) => v !== null && v !== undefined && v !== "" && !isNaN(Number(v)))
      .map(Number);

    if (nums.length === 0) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      avg: (sum / nums.length).toFixed(2),
      min: Math.min(...nums),
      max: Math.max(...nums),
      count: nums.length,
    };
  }, [field.id, submissions]);

  if (!stats) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{field.label}</CardTitle>
        <p className="text-xs text-muted-foreground">{stats.count} answer{stats.count !== 1 ? "s" : ""}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Average", value: stats.avg, icon: Hash },
            { label: "Min", value: stats.min, icon: TrendingDown },
            { label: "Max", value: stats.max, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg bg-muted/60 px-3 py-2.5 flex flex-col items-center gap-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-lg font-bold font-display">{value}</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Text field: latest 5 ────────────────────────────────────────────────────
function TextFieldLatest({ field, submissions }: { field: FormField; submissions: Submission[] }) {
  const latest = useMemo(
    () =>
      submissions
        .filter((s) => s.data[field.id] !== null && s.data[field.id] !== undefined && s.data[field.id] !== "")
        .slice(0, 5)
        .map((s) => ({ value: String(s.data[field.id]), date: s.submitted_at })),
    [field.id, submissions]
  );

  if (latest.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{field.label}</CardTitle>
        <p className="text-xs text-muted-foreground">Latest {latest.length} response{latest.length !== 1 ? "s" : ""}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {latest.map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-md bg-muted/40 px-3 py-2">
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed break-words">{item.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {format(parseISO(item.date), "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
