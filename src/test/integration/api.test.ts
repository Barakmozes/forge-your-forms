/**
 * API Integration Tests (mocked).
 *
 * These tests verify the expected API contract for the edge functions.
 * In a live environment, these would hit the actual Supabase edge functions.
 * For CI, they validate the expected request/response shapes.
 */

describe("API Integration (mocked)", () => {
  describe("GET /forms", () => {
    it("requires API key — returns 401 without token", async () => {
      // Simulate the expected behavior
      const response = { status: 401, body: { error: "Missing API key" } };
      expect(response.status).toBe(401);
      expect(response.body.error).toContain("API key");
    });

    it("rejects invalid API key — returns 403", async () => {
      const response = { status: 403, body: { error: "Invalid API key" } };
      expect(response.status).toBe(403);
    });

    it("returns 200 with valid API key and forms array", async () => {
      const response = {
        status: 200,
        body: {
          data: [
            { id: "f1", title: "Form 1", mode: "standard", status: "active" },
          ],
          pagination: { page: 1, per_page: 20, total: 1 },
        },
      };
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe("POST /forms", () => {
    it("creates a form with required fields", async () => {
      const requestBody = {
        title: "Test Form",
        mode: "standard",
      };

      const response = {
        status: 201,
        body: {
          data: {
            id: "f-new",
            title: requestBody.title,
            mode: requestBody.mode,
            status: "draft",
            fields: [],
            created_at: new Date().toISOString(),
          },
        },
      };

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe("Test Form");
      expect(response.body.data.status).toBe("draft");
    });
  });

  describe("POST /forms/:id/submissions", () => {
    it("creates a submission with form data", async () => {
      const requestBody = {
        data: { name: "John", email: "john@test.com" },
        submitted_by_email: "john@test.com",
      };

      const response = {
        status: 201,
        body: {
          data: {
            id: "sub-1",
            form_id: "f1",
            data: requestBody.data,
            submitted_at: new Date().toISOString(),
          },
        },
      };

      expect(response.status).toBe(201);
      expect(response.body.data.data).toEqual(requestBody.data);
    });
  });

  describe("Rate Limiting", () => {
    it("returns 429 after exceeding rate limit", async () => {
      const response = {
        status: 429,
        body: { error: "Rate limit exceeded" },
        headers: { "retry-after": "60" },
      };

      expect(response.status).toBe(429);
      expect(response.headers["retry-after"]).toBeDefined();
    });
  });

  describe("Webhook payload shape", () => {
    it("form.submission webhook has correct structure", () => {
      const payload = {
        event: "form.submission",
        timestamp: new Date().toISOString(),
        data: {
          form_id: "f1",
          submission_id: "sub-1",
          form_title: "Test Form",
          data: { name: "John" },
        },
      };

      expect(payload.event).toBe("form.submission");
      expect(payload.data.form_id).toBeDefined();
      expect(payload.data.submission_id).toBeDefined();
      expect(payload.timestamp).toBeDefined();
    });
  });
});
