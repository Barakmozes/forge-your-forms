// === AGENT 11: Template hooks ===
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export interface Template {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  mode: "standard" | "waitlist" | "feedback" | "support";
  category: string;
  industry: string | null;
  fields: unknown[];
  settings: Record<string, unknown>;
  branding: Record<string, unknown>;
  thumbnail_url: string | null;
  use_count: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

interface UseTemplatesFilters {
  category?: string;
  mode?: string;
  search?: string;
  featured?: boolean;
}

export function useTemplates(filters: UseTemplatesFilters = {}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("templates")
      .select("*")
      .eq("is_active", true)
      .order("use_count", { ascending: false });

    if (filters.category && filters.category !== "All") {
      query = query.eq("category", filters.category);
    }
    if (filters.mode && filters.mode !== "all") {
      query = query.eq("mode", filters.mode);
    }
    if (filters.featured) {
      query = query.eq("is_featured", true);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (!error && data) {
      setTemplates(data as Template[]);
    }
    setLoading(false);
  }, [filters.category, filters.mode, filters.search, filters.featured]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, refetch: fetchTemplates };
}

export function useTemplate(slug: string) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedTemplates, setRelatedTemplates] = useState<Template[]>([]);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (!error && data) {
        const t = data as Template;
        setTemplate(t);

        // Fetch related templates (same category, excluding current)
        const { data: related } = await supabase
          .from("templates")
          .select("*")
          .eq("is_active", true)
          .eq("category", t.category)
          .neq("slug", slug)
          .order("use_count", { ascending: false })
          .limit(4);

        if (related) {
          setRelatedTemplates(related as Template[]);
        }
      }
      setLoading(false);
    }
    if (slug) fetch();
  }, [slug]);

  return { template, loading, relatedTemplates };
}

export function useCloneTemplate() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cloning, setCloning] = useState(false);

  const cloneTemplate = async (template: Template) => {
    if (!user || !currentWorkspace) {
      return;
    }

    setCloning(true);
    try {
      // Validate template fields before cloning
      const fields = template.fields;
      if (!Array.isArray(fields)) {
        toast({ title: t("common.error"), description: t("templates.cloneFailed"), variant: "destructive" });
        setCloning(false);
        return;
      }

      // For standard mode templates with fields, verify each field has required properties
      if (template.mode === "standard" && fields.length > 0) {
        const invalidField = fields.find((f) => {
          if (!f || typeof f !== "object") return true;
          const field = f as Record<string, unknown>;
          return !field.id || !field.type || !field.label;
        });
        if (invalidField) {
          toast({ title: t("common.error"), description: t("templates.cloneFailed"), variant: "destructive" });
          setCloning(false);
          return;
        }
      }

      // Create new form from template
      const { data: newForm, error: insertError } = await supabase
        .from("forms")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          title: `${template.title} Copy`,
          description: template.description,
          fields: fields as unknown as Record<string, unknown>,
          settings: template.settings,
          mode: template.mode,
          branding: template.branding,
          status: "draft" as const,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Increment use_count via direct update
      supabase
        .from("templates")
        .update({ use_count: (template.use_count || 0) + 1 })
        .eq("id", template.id)
        .then(() => {});

      toast({ title: t("templates.cloned"), description: t("templates.clonedDesc", { title: template.title }) });

      if (newForm) {
        navigate(`/forms/${newForm.id}/edit`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("templates.cloneFailed");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    }
    setCloning(false);
  };

  return { cloneTemplate, cloning };
}
