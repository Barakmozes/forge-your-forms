/**
 * Re-export of the primary toast hook. Prefer importing directly from "@/hooks/use-toast".
 *
 * RULE: Protected pages use useToast() from "@/hooks/use-toast".
 *       Public pages use toast from "sonner".
 */
import { useToast, toast } from "@/hooks/use-toast";

export { useToast, toast };
