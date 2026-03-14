import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export interface FieldCondition {
  fieldId: string;
  operator: "is" | "is_not" | "contains";
  value: string;
}

interface ConditionalLogicProps {
  condition: FieldCondition | undefined;
  onChange: (condition: FieldCondition | undefined) => void;
  availableFields: { id: string; label: string }[];
}

export default function ConditionalLogic({
  condition,
  onChange,
  availableFields,
}: ConditionalLogicProps) {
  const { t } = useTranslation();

  if (availableFields.length === 0) return null;

  if (!condition) {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("builder.conditionalLogic")}
        </Label>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() =>
            onChange({
              fieldId: availableFields[0].id,
              operator: "is",
              value: "",
            })
          }
        >
          {t("builder.addShowIf")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("builder.showIf")}
        </Label>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 min-h-[44px] min-w-[44px] text-destructive/60 hover:text-destructive"
          onClick={() => onChange(undefined)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <Select
        value={condition.fieldId}
        onValueChange={(v) => onChange({ ...condition, fieldId: v })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={t("builder.selectField")} />
        </SelectTrigger>
        <SelectContent>
          {availableFields.map((f) => (
            <SelectItem key={f.id} value={f.id} className="text-xs">
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        onValueChange={(v) =>
          onChange({ ...condition, operator: v as FieldCondition["operator"] })
        }
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="is" className="text-xs">{t("builder.operatorIs")}</SelectItem>
          <SelectItem value="is_not" className="text-xs">{t("builder.operatorIsNot")}</SelectItem>
          <SelectItem value="contains" className="text-xs">{t("builder.operatorContains")}</SelectItem>
        </SelectContent>
      </Select>

      <Input
        value={condition.value}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
        placeholder={t("builder.conditionValue")}
        className="h-8 text-xs"
      />
    </div>
  );
}

/**
 * Evaluate whether a field should be visible based on its condition.
 */
export function evaluateCondition(
  condition: FieldCondition | undefined,
  values: Record<string, unknown>
): boolean {
  if (!condition) return true;

  const fieldValue = values[condition.fieldId];
  const strValue = fieldValue == null ? "" : String(fieldValue);
  const target = condition.value;

  switch (condition.operator) {
    case "is":
      return strValue === target;
    case "is_not":
      return strValue !== target;
    case "contains":
      return strValue.toLowerCase().includes(target.toLowerCase());
    default:
      return true;
  }
}
