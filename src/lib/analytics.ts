/**
 * Web Vitals and performance analytics tracking.
 * Uses the Performance API (no external dependencies required).
 * Metrics are logged to console in dev; can be extended to Supabase in production.
 */

interface WebVitalMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  pageUrl: string;
}

// Thresholds from https://web.dev/vitals/
const THRESHOLDS: Record<string, [number, number]> = {
  FCP: [1800, 3000],
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
};

function getRating(name: string, value: number): WebVitalMetric["rating"] {
  const thresholds = THRESHOLDS[name];
  if (!thresholds) return "good";
  if (value <= thresholds[0]) return "good";
  if (value <= thresholds[1]) return "needs-improvement";
  return "poor";
}

function reportMetric(metric: WebVitalMetric): void {
  const isProduction = import.meta.env?.PROD;

  if (!isProduction) {
    const color = metric.rating === "good" ? "green" : metric.rating === "needs-improvement" ? "orange" : "red";
    console.log(
      `%c[WebVital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    );
  }

  // Production: metrics can be sent to Supabase performance_metrics table
  // or any analytics service. Uncomment and implement when ready:
  //
  // if (isProduction) {
  //   supabase.from("performance_metrics").insert({
  //     metric_name: metric.name,
  //     value: metric.value,
  //     rating: metric.rating,
  //     page_url: metric.pageUrl,
  //     user_agent: navigator.userAgent,
  //   }).then(() => {}).catch(() => {});
  // }
}

/**
 * Track First Contentful Paint (FCP) using PerformanceObserver.
 */
function trackFCP(): void {
  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          reportMetric({
            name: "FCP",
            value: entry.startTime,
            rating: getRating("FCP", entry.startTime),
            pageUrl: window.location.pathname,
          });
          observer.disconnect();
        }
      }
    });
    observer.observe({ type: "paint", buffered: true });
  } catch {
    // PerformanceObserver not supported
  }
}

/**
 * Track Largest Contentful Paint (LCP).
 */
function trackLCP(): void {
  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        reportMetric({
          name: "LCP",
          value: lastEntry.startTime,
          rating: getRating("LCP", lastEntry.startTime),
          pageUrl: window.location.pathname,
        });
      }
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });

    // Report final LCP when page is hidden
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        observer.disconnect();
      }
    }, { once: true });
  } catch {
    // Not supported
  }
}

/**
 * Track Cumulative Layout Shift (CLS).
 */
function trackCLS(): void {
  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShiftEntry.hadRecentInput && layoutShiftEntry.value) {
          clsValue += layoutShiftEntry.value;
        }
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });

    // Report final CLS when page is hidden
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        reportMetric({
          name: "CLS",
          value: clsValue,
          rating: getRating("CLS", clsValue),
          pageUrl: window.location.pathname,
        });
        observer.disconnect();
      }
    }, { once: true });
  } catch {
    // Not supported
  }
}

/**
 * Track Time to First Byte (TTFB).
 */
function trackTTFB(): void {
  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const navEntry = entry as PerformanceNavigationTiming;
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        if (ttfb >= 0) {
          reportMetric({
            name: "TTFB",
            value: ttfb,
            rating: getRating("TTFB", ttfb),
            pageUrl: window.location.pathname,
          });
        }
      }
      observer.disconnect();
    });
    observer.observe({ type: "navigation", buffered: true });
  } catch {
    // Not supported
  }
}

/**
 * Initialize all Web Vitals tracking.
 * Call once in main.tsx.
 */
export function initWebVitals(): void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
    return;
  }

  trackFCP();
  trackLCP();
  trackCLS();
  trackTTFB();
}

/**
 * Track a custom analytics event.
 */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (!import.meta.env?.PROD) {
    console.log(`[Analytics] ${name}`, properties || "");
  }
}
