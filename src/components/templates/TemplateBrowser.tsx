// === AGENT 11: Template Browser Component ===
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTemplates } from "@/hooks/useTemplates";
import TemplateCard from "@/components/templates/TemplateCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const CATEGORY_KEYS = [
  { value: "All", key: "templates.categoryAll" },
  { value: "SaaS", key: "templates.categorySaaS" },
  { value: "Marketing", key: "templates.categoryMarketing" },
  { value: "Feedback", key: "templates.categoryFeedback" },
  { value: "Support", key: "templates.categorySupport" },
  { value: "HR", key: "templates.categoryHR" },
  { value: "Events", key: "templates.categoryEvents" },
  { value: "Healthcare", key: "templates.categoryHealthcare" },
  { value: "Education", key: "templates.categoryEducation" },
];

const MODE_KEYS = [
  { value: "all", key: "templates.allModes" },
  { value: "standard", key: "templates.modeStandard" },
  { value: "waitlist", key: "templates.modeWaitlist" },
  { value: "feedback", key: "templates.modeFeedback" },
  { value: "support", key: "templates.modeSupport" },
];

export default function TemplateBrowser() {
  const { t } = useTranslation();
  const [category, setCategory] = useState("All");
  const [mode, setMode] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { templates, loading } = useTemplates({ category, mode, search });

  const handleSearch = () => {
    setSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("templates.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="ps-9"
          />
        </div>
        <Button variant="secondary" onClick={handleSearch}>
          {t("templates.search")}
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_KEYS.map((cat) => (
          <Button
            key={cat.value}
            variant={category === cat.value ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory(cat.value)}
            className="text-xs"
          >
            {t(cat.key)}
          </Button>
        ))}
      </div>

      {/* Mode filter */}
      <div className="flex flex-wrap gap-2">
        {MODE_KEYS.map((m) => (
          <Button
            key={m.value}
            variant={mode === m.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode(m.value)}
            className="text-xs"
          >
            {t(m.key)}
          </Button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">{t("templates.noTemplatesFound")}</p>
          <Button
            variant="link"
            onClick={() => { setCategory("All"); setMode("all"); setSearch(""); setSearchInput(""); }}
          >
            {t("templates.clearFilters")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
