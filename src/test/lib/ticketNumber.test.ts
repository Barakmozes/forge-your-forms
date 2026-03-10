import { describe, it, expect } from "vitest";
import { formatTicketNumber } from "@/lib/ticketNumber";

describe("formatTicketNumber", () => {
  it("formats single digit with TICK-00X padding", () => {
    expect(formatTicketNumber(1)).toBe("TICK-001");
    expect(formatTicketNumber(9)).toBe("TICK-009");
  });

  it("formats double digit with TICK-0XX padding", () => {
    expect(formatTicketNumber(10)).toBe("TICK-010");
    expect(formatTicketNumber(42)).toBe("TICK-042");
    expect(formatTicketNumber(99)).toBe("TICK-099");
  });

  it("formats triple digit without extra padding", () => {
    expect(formatTicketNumber(100)).toBe("TICK-100");
    expect(formatTicketNumber(999)).toBe("TICK-999");
  });

  it("handles numbers larger than 999", () => {
    expect(formatTicketNumber(1000)).toBe("TICK-1000");
    expect(formatTicketNumber(12345)).toBe("TICK-12345");
  });

  it("handles zero", () => {
    expect(formatTicketNumber(0)).toBe("TICK-000");
  });
});
