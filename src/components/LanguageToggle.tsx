import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggle = () => {
    setLanguage(language === "en" ? "he" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="gap-1.5 text-xs font-medium"
      title={language === "en" ? "עברית" : "English"}
    >
      <Languages className="h-4 w-4" />
      {language === "en" ? "עב" : "EN"}
    </Button>
  );
}
