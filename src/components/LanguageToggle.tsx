import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export default function LanguageToggle() {
  const { t } = useTranslation();
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
      title={t("tooltips.nav.changeLanguage")}
    >
      <Languages className="h-4 w-4" />
      {language === "en" ? "עב" : "EN"}
    </Button>
  );
}
