import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PrivacyNoticeProps {
  dataCollected: string[];  // e.g., ["email", "name", "feedback score"]
  purpose: string;          // e.g., "to manage your waitlist position"
  className?: string;
}

export function PrivacyNotice({ dataCollected, purpose, className }: PrivacyNoticeProps) {
  const collected = dataCollected.length === 1
    ? dataCollected[0]
    : dataCollected.slice(0, -1).join(", ") + " and " + dataCollected[dataCollected.length - 1];

  return (
    <div className={cn("text-xs text-muted-foreground mt-4 space-y-1 border-t border-border/50 pt-3", className)}>
      <p>
        By submitting this form, you consent to the collection of your{" "}
        <span className="font-medium">{collected}</span>{" "}
        {purpose}.
      </p>
      <p>
        Your data is processed in accordance with our{" "}
        <Link to="/privacy" className="underline hover:text-primary">
          Privacy Policy
        </Link>
        . You may request data export or deletion at any time.
      </p>
    </div>
  );
}
