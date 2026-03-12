import { resolvePlanTier, isPlanAtLeast, getPriceId, getPlanPrice, PLAN_FEATURES } from "@/lib/stripe";

describe("stripe utilities", () => {
  describe("resolvePlanTier", () => {
    it("returns free when subscription is null", () => {
      expect(resolvePlanTier(null)).toBe("free");
    });

    it("returns free when status is not active or trialing", () => {
      expect(resolvePlanTier({ plan: "pro", status: "canceled" })).toBe("free");
      expect(resolvePlanTier({ plan: "growth", status: "past_due" })).toBe("free");
      expect(resolvePlanTier({ plan: "business", status: "unpaid" })).toBe("free");
    });

    it("returns correct plan for active subscription", () => {
      expect(resolvePlanTier({ plan: "pro", status: "active" })).toBe("pro");
      expect(resolvePlanTier({ plan: "growth", status: "active" })).toBe("growth");
      expect(resolvePlanTier({ plan: "business", status: "active" })).toBe("business");
    });

    it("returns correct plan for trialing subscription", () => {
      expect(resolvePlanTier({ plan: "pro", status: "trialing" })).toBe("pro");
    });

    it("returns free for unknown plan names", () => {
      expect(resolvePlanTier({ plan: "unknown", status: "active" })).toBe("free");
    });
  });

  describe("isPlanAtLeast", () => {
    it("free is at least free", () => {
      expect(isPlanAtLeast("free", "free")).toBe(true);
    });

    it("pro is at least free", () => {
      expect(isPlanAtLeast("pro", "free")).toBe(true);
    });

    it("free is not at least pro", () => {
      expect(isPlanAtLeast("free", "pro")).toBe(false);
    });

    it("business is at least growth", () => {
      expect(isPlanAtLeast("business", "growth")).toBe(true);
    });

    it("growth is not at least business", () => {
      expect(isPlanAtLeast("growth", "business")).toBe(false);
    });

    it("same plan is always at least itself", () => {
      expect(isPlanAtLeast("pro", "pro")).toBe(true);
      expect(isPlanAtLeast("growth", "growth")).toBe(true);
      expect(isPlanAtLeast("business", "business")).toBe(true);
    });
  });

  describe("getPriceId", () => {
    it("returns monthly price ID for pro", () => {
      const id = getPriceId("pro", "monthly");
      expect(id).toBe("price_pro_monthly_placeholder");
    });

    it("returns annual price ID for growth", () => {
      const id = getPriceId("growth", "annual");
      expect(id).toBe("price_growth_annual_placeholder");
    });
  });

  describe("getPlanPrice", () => {
    it("returns monthly price for pro", () => {
      expect(getPlanPrice("pro", "monthly")).toBe(29);
    });

    it("returns annual (discounted) price for pro", () => {
      expect(getPlanPrice("pro", "annual")).toBe(23);
    });

    it("returns monthly price for growth", () => {
      expect(getPlanPrice("growth", "monthly")).toBe(59);
    });

    it("returns annual price for business", () => {
      expect(getPlanPrice("business", "annual")).toBe(79);
    });
  });

  describe("PLAN_FEATURES", () => {
    it("free plan has standard_mode", () => {
      expect(PLAN_FEATURES.free).toContain("standard_mode");
    });

    it("free plan does not have waitlist_mode", () => {
      expect(PLAN_FEATURES.free).not.toContain("waitlist_mode");
    });

    it("pro plan has waitlist_mode and feedback_mode", () => {
      expect(PLAN_FEATURES.pro).toContain("waitlist_mode");
      expect(PLAN_FEATURES.pro).toContain("feedback_mode");
    });

    it("growth plan has api_access", () => {
      expect(PLAN_FEATURES.growth).toContain("api_access");
    });

    it("business plan has sso and white_label", () => {
      expect(PLAN_FEATURES.business).toContain("sso");
      expect(PLAN_FEATURES.business).toContain("white_label");
    });
  });
});
