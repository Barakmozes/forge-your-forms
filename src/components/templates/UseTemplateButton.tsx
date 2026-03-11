// === AGENT 11: Use Template Button ===
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCloneTemplate, type Template } from "@/hooks/useTemplates";
import { Button } from "@/components/ui/button";
import { Copy, LogIn } from "lucide-react";

interface UseTemplateButtonProps {
  template: Template;
  slug: string;
}

export default function UseTemplateButton({ template, slug }: UseTemplateButtonProps) {
  const { user } = useAuth();
  const { cloneTemplate, cloning } = useCloneTemplate();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!user) {
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
          Sign In to Use Template
        </>
      ) : cloning ? (
        "Cloning..."
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Use This Template
        </>
      )}
    </Button>
  );
}
