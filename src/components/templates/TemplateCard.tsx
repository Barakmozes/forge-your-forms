// === AGENT 11: Template Card Component ===
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, MessageSquare, Headphones } from "lucide-react";
import type { Template } from "@/hooks/useTemplates";

const MODE_ICONS: Record<string, React.ElementType> = {
  standard: FileText,
  waitlist: Users,
  feedback: MessageSquare,
  support: Headphones,
};

const MODE_COLORS: Record<string, string> = {
  standard: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  waitlist: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  feedback: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  support: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

interface TemplateCardProps {
  template: Template;
}

export default function TemplateCard({ template }: TemplateCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ModeIcon = MODE_ICONS[template.mode] || FileText;

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-border/50"
      onClick={() => navigate(`/templates/${template.slug}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ModeIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className={`text-[10px] font-medium ${MODE_COLORS[template.mode] || ""}`}>
              {template.mode}
            </Badge>
          </div>
        </div>

        <h3 className="font-display font-semibold text-sm line-clamp-1 mb-1">
          {template.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {template.description}
        </p>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            {template.category}
          </Badge>
          {template.use_count > 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {template.use_count} {template.use_count === 1 ? t("templates.use") : t("templates.uses")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
