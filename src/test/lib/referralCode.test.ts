import { describe, it, expect } from "vitest";
import { generateReferralCode } from "@/lib/referralCode";

describe("generateReferralCode", () => {
  it("generates a code of default length 8", () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(8);
  });

  it("generates a code of custom length", () => {
    expect(generateReferralCode(12)).toHaveLength(12);
    expect(generateReferralCode(4)).toHaveLength(4);
  });

  it("only contains valid alphanumeric characters (no ambiguous chars)", () => {
    const validChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    for (let i = 0; i < 50; i++) {
      const code = generateReferralCode();
      for (const char of code) {
        expect(validChars).toContain(char);
      }
    }
  });

  it("generates unique codes (100 codes)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateReferralCode());
    }
    expect(codes.size).toBe(100);
  });

  it("returns a string", () => {
    expect(typeof generateReferralCode()).toBe("string");
  });
});
