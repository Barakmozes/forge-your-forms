import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubmissions } from "@/hooks/useSubmissions";
import { usePagination } from "@/hooks/usePagination";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Inbox, Search, Download, Eye, ArrowLeft, ArrowRight, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";

interface FormField {
  id: string;
  type: string;
  label: string;
}

interface FormOption {
  id: string;
  title: string;
  fields: FormField[];
}

function formatValue(value: unknown, type?: string, t?: (key: string) => string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (type === "file_upload") return typeof value === "string" ? (t ? t("submissions.fileUploaded") : "File uploaded") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const PAGE_SIZE = 25;

export default function Submissions() {
  useDocumentTitle("Submissions");
  const { t } = useTranslation();
  const { id: preFilterFormId } = useParams<{ id?: string }>();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [forms, setForms] = useState<FormOption[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState<string>(preFilterFormId ?? "all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { isRTL } = useLanguage();
  const [selectedSub, setSelectedSub] = useState<ReturnType<typeof useSubmissions>["submissions"][number] | null>(null);

  // Load forms with their fields (for column headers + form selector)
  useEffect(() => {
    if (!currentWorkspace) return;
    setFormsLoading(true);
    supabase
      .from("forms")
      .select("id, title, fields")
      .eq("workspace_id", currentWorkspace.id)
      .order("title")
      .then(({ data }) => {
        const mapped = (data ?? []).map((f) => ({
          id: f.id,
          title: f.title,
          fields: (Array.isArray(f.fields) ? f.fields : []) as unknown as FormField[],
        }));
        setForms(mapped);
        setFormsLoading(false);
      });
  }, [currentWorkspace]);

  const formIds = useMemo(() => forms.map((f) => f.id), [forms]);

  const effectiveFormId = selectedFormId === "all" ? null : selectedFormId;

  const { submissions, totalCount, isLoading: subsLoading, refetch } = useSubmissions(
    effectiveFormId,
    formIds,
    1,
    200 // Fetch up to 200; search/date filters apply to loaded data only
  );

  // Client-side filtering (search + date range)
  const filtered = useMemo(() => {
    return submissions.filter((sub) => {
      if (search) {
        const hay = [
          sub.submitted_by_email ?? "",
          ...Object.values(sub.data).map((v) => String(v ?? "")),
        ].join(" ").toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      if (dateFrom || dateTo) {
        const dt = parseISO(sub.submitted_at);
        if (dateFrom && dt < startOfDay(parseISO(dateFrom))) return false;
        if (dateTo && dt > endOfDay(parseISO(dateTo))) return false;
      }
      return true;
    });
  }, [submissions, search, dateFrom, dateTo]);

  // Paginate the filtered results
  const pagination = usePagination(filtered.length, PAGE_SIZE);
  const paginatedSubmissions = useMemo(
    () => filtered.slice(pagination.range.from, pagination.range.to + 1),
    [filtered, pagination.range]
  );

  // Reset page when filters change
  useEffect(() => {
    pagination.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateFrom, dateTo, selectedFormId]);

  // Realtime: refetch when new submissions arrive
  useEffect(() => {
    if (!currentWorkspace) return;
    const channel = supabase
      .channel(`submissions-realtime-${currentWorkspace.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        () => { refetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentWorkspace, refetch]);

  const currentForm = useMemo(
    () => forms.find((f) => f.id === selectedFormId),
    [forms, selectedFormId]
  );

  const displayFields = useMemo((): FormField[] => {
    if (currentForm) return currentForm.fields.filter((f) => !["section_header", "paragraph_text"].includes(f.type));
    const seen = new Set<string>();
    const out: FormField[] = [];
    for (const f of forms) {
      for (const field of f.fields) {
        if (!seen.has(field.id) && !["section_header", "paragraph_text"].includes(field.type)) {
          seen.add(field.id);
          out.push(field);
        }
      }
    }
    return out.slice(0, 8);
  }, [currentForm, forms]);

  const exportCSV = () => {
    const headers = [
      ...displayFields.map((f) => `"${f.label.replace(/"/g, '""')}"`),
      selectedFormId === "all" ? '"Form"' : null,
      '"Submitted By"',
      '"Submitted At"',
    ].filter(Boolean);

    const rows = filtered.map((sub) => {
      const cols = displayFields.map((f) => {
        const v = formatValue(sub.data[f.id], f.type);
        return `"${v.replace(/"/g, '""')}"`;
      });
      if (selectedFormId === "all") {
        const ft = forms.find((f) => f.id === sub.form_id)?.title ?? "";
        cols.push(`"${ft.replace(/"/g, '""')}"`);
      }
      cols.push(`"${sub.submitted_by_email ?? ""}"`);
      cols.push(`"${format(parseISO(sub.submitted_at), "yyyy-MM-dd HH:mm")}"`);
      return cols.join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions-${selectedFormId === "all" ? "all" : (currentForm?.title ?? "form")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFormTitle = (id: string) => forms.find((f) => f.id === id)?.title ?? "Unknown";
  const getFormFields = (formId: string) =>
    forms.find((f) => f.id === formId)?.fields.filter((f) => !["section_header", "paragraph_text"].includes(f.type)) ?? [];

  const loading = formsLoading || subsLoading;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          {preFilterFormId && (
            <Button variant="ghost" size="icon" onClick={() => navigate(`/forms/${preFilterFormId}/edit`)}>
              {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-display font-bold">
              {preFilterFormId && currentForm ? `${currentForm.title} — ${t("submissions.title")}` : t("submissions.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {filtered.length} {filtered.length === 1 ? t("forms.response") : t("forms.responses")}
              {submissions.length !== filtered.length ? ` ${t("submissions.filteredFrom", { count: submissions.length })}` : ""}
              {totalCount > submissions.length ? ` · ${t("submissions.showingFirst", { count: submissions.length, total: totalCount, defaultValue: `Showing first ${submissions.length} of ${totalCount}` })}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!preFilterFormId && (
            <Select value={selectedFormId} onValueChange={setSelectedFormId}>
              <SelectTrigger className="w-full sm:w-[200px] h-9">
                <SelectValue placeholder={t("submissions.filterByForm")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("submissions.allForms")}</SelectItem>
                {forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> {t("submissions.exportCSV")}
          </Button>
        </div>
      </div>

      {/* Warning when results are capped */}
      {totalCount > submissions.length && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
          Showing the most recent {submissions.length.toLocaleString()} of {totalCount.toLocaleString()} total submissions. Use date filters to view older records.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("submissions.searchResponses")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ltr:pl-9 rtl:pr-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-full sm:w-36"
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-full sm:w-36"
            placeholder="To"
          />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => { setDateFrom(""); setDateTo(""); }}>
              {t("submissions.clearDates")}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Card className="animate-pulse"><CardContent className="py-16" /></Card>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Inbox className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg">{t("submissions.noSubmissionsFound")}</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {submissions.length > 0 ? t("submissions.adjustFilters") : t("submissions.submissionsWillAppear")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedFormId === "all" && <TableHead className="whitespace-nowrap">{t("submissions.form")}</TableHead>}
                    {displayFields.map((f) => (
                      <TableHead key={f.id} className="whitespace-nowrap min-w-[140px]">{f.label}</TableHead>
                    ))}
                    <TableHead className="whitespace-nowrap">{t("submissions.submittedBy")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("submissions.submittedAt")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubmissions.map((sub) => (
                    <TableRow
                      key={sub.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedSub(sub)}
                    >
                      {selectedFormId === "all" && (
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-xs">
                            {getFormTitle(sub.form_id)}
                          </Badge>
                        </TableCell>
                      )}
                      {displayFields.map((f) => (
                        <TableCell key={f.id} className="max-w-[200px]">
                          <span className="truncate block text-sm">
                            {formatValue(sub.data[f.id], f.type) === "—"
                              ? <span className="text-muted-foreground/50">—</span>
                              : formatValue(sub.data[f.id], f.type)}
                          </span>
                        </TableCell>
                      ))}
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {sub.submitted_by_email || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(parseISO(sub.submitted_at), "MMM d, yyyy · h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); setSelectedSub(sub); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t("submissions.showing")} {pagination.range.from + 1}–{Math.min(pagination.range.to + 1, filtered.length)} {t("common.of")} {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pagination.prevPage}
                  disabled={!pagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("submissions.page")} {pagination.page} {t("common.of")} {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pagination.nextPage}
                  disabled={!pagination.hasNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Slide-over */}
      <Sheet open={!!selectedSub} onOpenChange={(open) => !open && setSelectedSub(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedSub && (() => {
            const subFields = getFormFields(selectedSub.form_id);
            return (
              <>
                <SheetHeader className="mb-6">
                  <SheetTitle className="font-display">{t("submissions.submissionDetails")}</SheetTitle>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-1">
                    <span>{format(parseISO(selectedSub.submitted_at), "EEEE, MMMM d, yyyy · h:mm a")}</span>
                    {selectedSub.submitted_by_email && <span>{selectedSub.submitted_by_email}</span>}
                    {selectedFormId === "all" && (
                      <Badge variant="secondary" className="w-fit mt-1">{getFormTitle(selectedSub.form_id)}</Badge>
                    )}
                  </div>
                </SheetHeader>

                <div className="space-y-5">
                  {subFields.map((field) => {
                    const val = selectedSub.data[field.id];
                    const display = formatValue(val, field.type);
                    const isFile = field.type === "file_upload" && typeof val === "string";

                    return (
                      <div key={field.id} className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {field.label}
                        </p>
                        {isFile ? (
                          <a
                            href={val as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary underline underline-offset-4 break-all"
                          >
                            {t("submissions.viewUploadedFile")}
                          </a>
                        ) : display === "—" ? (
                          <p className="text-sm text-muted-foreground/50">{t("submissions.notAnswered")}</p>
                        ) : (
                          <p className="text-sm leading-relaxed break-words">{display}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
