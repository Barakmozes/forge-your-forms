import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "@/hooks/usePagination";

describe("usePagination", () => {
  it("starts on page 1", () => {
    const { result } = renderHook(() => usePagination(100, 25));
    expect(result.current.page).toBe(1);
  });

  it("calculates totalPages correctly", () => {
    expect(renderHook(() => usePagination(100, 25)).result.current.totalPages).toBe(4);
    expect(renderHook(() => usePagination(101, 25)).result.current.totalPages).toBe(5);
    expect(renderHook(() => usePagination(0, 25)).result.current.totalPages).toBe(1);
    expect(renderHook(() => usePagination(1, 25)).result.current.totalPages).toBe(1);
  });

  it("calculates range correctly for page 1", () => {
    const { result } = renderHook(() => usePagination(100, 25));
    expect(result.current.range).toEqual({ from: 0, to: 24 });
  });

  it("calculates range correctly after navigating", () => {
    const { result } = renderHook(() => usePagination(100, 25));
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(2);
    expect(result.current.range).toEqual({ from: 25, to: 49 });
  });

  it("hasNext and hasPrev on first page", () => {
    const { result } = renderHook(() => usePagination(100, 25));
    expect(result.current.hasPrev).toBe(false);
    expect(result.current.hasNext).toBe(true);
  });

  it("hasNext and hasPrev on last page", () => {
    const { result } = renderHook(() => usePagination(100, 25));
    act(() => result.current.setPage(4));
    expect(result.current.hasPrev).toBe(true);
    expect(result.current.hasNext).toBe(false);
  });

  it("nextPage advances by 1", () => {
    const { result } = renderHook(() => usePagination(100, 25));
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(2);
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(3);
  });

  it("prevPage goes back by 1", () => {
    const { result } = renderHook(() => usePagination(100, 25));
    act(() => result.current.setPage(3));
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(2);
  });

  it("nextPage does not go past last page", () => {
    const { result } = renderHook(() => usePagination(50, 25));
    expect(result.current.totalPages).toBe(2);
    act(() => result.current.setPage(2));
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(2);
  });

  it("prevPage does not go below page 1", () => {
    const { result } = renderHook(() => usePagination(100, 25));
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(1);
  });

  it("setPage clamps to valid bounds", () => {
    const { result } = renderHook(() => usePagination(100, 25));
    act(() => result.current.setPage(999));
    expect(result.current.page).toBe(4);
    act(() => result.current.setPage(-5));
    expect(result.current.page).toBe(1);
  });

  it("uses default pageSize of 25", () => {
    const { result } = renderHook(() => usePagination(50));
    expect(result.current.totalPages).toBe(2);
    expect(result.current.range).toEqual({ from: 0, to: 24 });
  });

  it("handles single item", () => {
    const { result } = renderHook(() => usePagination(1, 25));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrev).toBe(false);
  });
});
