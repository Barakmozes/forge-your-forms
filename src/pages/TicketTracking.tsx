import { useParams, useSearchParams } from "react-router-dom";
import TicketTrackingPage from "@/components/support/TicketTrackingPage";

export default function TicketTracking() {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();

  if (!formId) return null;

  return (
    <TicketTrackingPage
      formId={formId}
      initialTicket={searchParams.get("ticket") ?? undefined}
      initialEmail={searchParams.get("email") ?? undefined}
    />
  );
}
