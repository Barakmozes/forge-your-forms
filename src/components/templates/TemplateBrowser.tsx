// === AGENT 11: Template Browser Component ===
import { useState } from "react";
import { useTemplates } from "@/hooks/useTemplates";
import TemplateCard from "@/components/templates/TemplateCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const CATEGORIES = ["All", "SaaS", "Marketing", "Feedback", "Support", "HR", "Events", "Healthcare", "Education"];
const MODES = [
  { value: "all", label: "All Modes" },
  { value: "standard", label: "Standard" },
  { value: "waitlist", label: "Waitlist" },
  { value: "feedback", label: "Feedback" },
  { value: "support", label: "Support" },
];

export default function TemplateBrowser() {
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
            placeholder="Search templates..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="ps-9"
          />
        </div>
        <Button variant="secondary" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={category === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory(cat)}
            className="text-xs"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Mode filter */}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Button
            key={m.value}
            variant={mode === m.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode(m.value)}
            className="text-xs"
          >
            {m.label}
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
          <p className="text-muted-foreground">No templates found matching your criteria.</p>
          <Button
            variant="link"
            onClick={() => { setCategory("All"); setMode("all"); setSearch(""); setSearchInput(""); }}
          >
            Clear filters
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
