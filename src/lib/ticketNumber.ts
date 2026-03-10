export function formatTicketNumber(num: number): string {
  return `TICK-${String(num).padStart(3, "0")}`;
}
