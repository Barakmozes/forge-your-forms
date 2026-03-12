import { logError, logWarning } from "@/lib/errorLogger";

describe("errorLogger", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe("logError", () => {
    it("logs Error instances with message and stack", () => {
      const error = new Error("test error");
      logError(error);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleSpy.mock.calls[0][0] as string;
      expect(loggedMessage).toContain("ERROR: test error");
    });

    it("logs string errors", () => {
      logError("string error");

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleSpy.mock.calls[0][0] as string;
      expect(loggedMessage).toContain("ERROR: string error");
    });

    it("includes context when provided", () => {
      const error = new Error("context error");
      logError(error, {
        component: "TestComponent",
        action: "testAction",
        userId: "user-1",
      });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedContext = consoleSpy.mock.calls[0][1];
      expect(loggedContext).toHaveProperty("context");
      expect(loggedContext.context).toEqual({
        component: "TestComponent",
        action: "testAction",
        userId: "user-1",
      });
    });

    it("includes timestamp in ISO format", () => {
      logError(new Error("timed error"));

      const loggedMessage = consoleSpy.mock.calls[0][0] as string;
      // ISO format: starts with [, contains T
      expect(loggedMessage).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    });

    it("includes metadata in context", () => {
      logError(new Error("meta error"), {
        metadata: { requestId: "req-123", retryCount: 3 },
      });

      const loggedContext = consoleSpy.mock.calls[0][1];
      expect(loggedContext.context.metadata).toEqual({
        requestId: "req-123",
        retryCount: 3,
      });
    });
  });

  describe("logWarning", () => {
    it("logs warning message", () => {
      logWarning("test warning");

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = warnSpy.mock.calls[0][0] as string;
      expect(loggedMessage).toContain("WARN: test warning");
    });

    it("includes context when provided", () => {
      logWarning("context warning", { component: "TestComp" });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const args = warnSpy.mock.calls[0];
      expect(args.length).toBeGreaterThan(1);
    });

    it("works without context", () => {
      logWarning("no context");

      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
