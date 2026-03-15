import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ConsentCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function ConsentCheckbox({ checked, onCheckedChange, className }: ConsentCheckboxProps) {
  return (
    <div className={cn("flex items-start space-x-2", className)}>
      <Checkbox
        id="consent"
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val === true)}
        className="mt-0.5"
      />
      <Label htmlFor="consent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
        I agree to the{" "}
        <Link to="/privacy" className="underline hover:text-primary" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </Link>{" "}
        and consent to the processing of my personal data as described therein.
      </Label>
    </div>
  );
}
