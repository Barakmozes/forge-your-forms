// === AGENT 11: Use Template Button ===
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useCloneTemplate, type Template } from "@/hooks/useTemplates";
import { Button } from "@/components/ui/button";
import { Copy, LogIn } from "lucide-react";

export const TEMPLATE_REDIRECT_KEY = "formforge_template_redirect";

interface UseTemplateButtonProps {
  template: Template;
  slug: string;
}

export default function UseTemplateButton({ template, slug }: UseTemplateButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cloneTemplate, cloning } = useCloneTemplate();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!user) {
      sessionStorage.setItem(
        TEMPLATE_REDIRECT_KEY,
        JSON.stringify({
          templateSlug: slug,
          returnPath: `/templates/${slug}`,
          timestamp: Date.now(),
        })
      );
      navigate(`/auth?redirect=/templates/${slug}`);
      return;
    }
    cloneTemplate(template);
  };

  return (
    <Button
      size="lg"
      className="w-full gradient-primary text-primary-foreground shadow-colored gap-2"
      onClick={handleClick}
      disabled={cloning}
    >
      {!user ? (
        <>
          <LogIn className="h-4 w-4" />
          {t("templates.signInToUse")}
        </>
      ) : cloning ? (
        t("templates.cloning")
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {t("templates.useThisTemplate")}
        </>
      )}
    </Button>
  );
}
