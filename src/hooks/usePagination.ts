import { useState, useMemo, useCallback } from "react";

interface UsePaginationResult {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  range: { from: number; to: number };
}

export function usePagination(totalCount: number, pageSize = 25): UsePaginationResult {
  const [page, setPageRaw] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize]
  );

  // Clamp page within valid bounds
  const clampedPage = useMemo(
    () => Math.min(Math.max(1, page), totalPages),
    [page, totalPages]
  );

  const setPage = useCallback(
    (p: number) => setPageRaw(Math.min(Math.max(1, p), totalPages)),
    [totalPages]
  );

  const hasNext = clampedPage < totalPages;
  const hasPrev = clampedPage > 1;

  const nextPage = useCallback(() => {
    if (hasNext) setPageRaw((p) => p + 1);
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) setPageRaw((p) => p - 1);
  }, [hasPrev]);

  const range = useMemo(() => {
    const from = (clampedPage - 1) * pageSize;
    const to = from + pageSize - 1;
    return { from, to };
  }, [clampedPage, pageSize]);

  return {
    page: clampedPage,
    setPage,
    totalPages,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    range,
  };
}
