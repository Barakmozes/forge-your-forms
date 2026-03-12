import { renderHook, act, waitFor } from "@testing-library/react";
import { createMockNotification } from "@/test/utils";

const { mockOrder, mockUpdate, mockDelete, mockChannel, mockIn } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockIn: vi.fn(),
  mockChannel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: mockIn,
      order: vi.fn().mockReturnThis(),
      limit: mockOrder,
      update: mockUpdate,
      delete: mockDelete,
    })),
    channel: mockChannel,
    removeChannel: vi.fn(),
  },
}));

import { useNotifications } from "@/hooks/useNotifications";

describe("useNotifications", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
      in: vi.fn().mockResolvedValue({ error: null }),
    });
    mockDelete.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockIn.mockResolvedValue({ error: null });
  });

  it("fetches notifications for current user", async () => {
    const notifs = [
      createMockNotification(userId, { id: "n1", title: "Notif 1", read: false }),
      createMockNotification(userId, { id: "n2", title: "Notif 2", read: true }),
    ];
    mockOrder.mockResolvedValue({ data: notifs, error: null });

    const { result } = renderHook(() => useNotifications(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(2);
  });

  it("computes unread count correctly", async () => {
    const notifs = [
      createMockNotification(userId, { id: "n1", read: false }),
      createMockNotification(userId, { id: "n2", read: false }),
      createMockNotification(userId, { id: "n3", read: true }),
    ];
    mockOrder.mockResolvedValue({ data: notifs, error: null });

    const { result } = renderHook(() => useNotifications(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.unreadCount).toBe(2);
  });

  it("marks single notification as read", async () => {
    const notifs = [
      createMockNotification(userId, { id: "n1", read: false }),
    ];
    mockOrder.mockResolvedValue({ data: notifs, error: null });

    const { result } = renderHook(() => useNotifications(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead("n1");
    });

    expect(mockUpdate).toHaveBeenCalled();
  });

  it("marks all notifications as read", async () => {
    const notifs = [
      createMockNotification(userId, { id: "n1", read: false }),
      createMockNotification(userId, { id: "n2", read: false }),
    ];
    mockOrder.mockResolvedValue({ data: notifs, error: null });
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
      in: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useNotifications(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockUpdate).toHaveBeenCalled();
  });

  it("deletes notification", async () => {
    const notifs = [
      createMockNotification(userId, { id: "n1" }),
    ];
    mockOrder.mockResolvedValue({ data: notifs, error: null });

    const { result } = renderHook(() => useNotifications(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteNotification("n1");
    });

    expect(mockDelete).toHaveBeenCalled();
  });

  it("sets up realtime subscription for INSERT, UPDATE, DELETE", () => {
    renderHook(() => useNotifications(userId));

    expect(mockChannel).toHaveBeenCalledWith(`notifications-${userId}`);
  });

  it("provides refetch function", async () => {
    const { result } = renderHook(() => useNotifications(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe("function");
  });
});
