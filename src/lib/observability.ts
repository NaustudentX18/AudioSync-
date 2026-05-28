export interface LogEvent {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

const appVersion = '1.3.0';

export function logEvent(event: LogEvent): void {
  const payload = {
    ts: new Date().toISOString(),
    app: 'audiosync',
    version: appVersion,
    ...event,
  };

  const json = JSON.stringify(payload);
  if (event.level === 'error') console.error(json);
  else if (event.level === 'warn') console.warn(json);
  else console.log(json);
}

// ── Web Vitals (lightweight polyfill — no external dependency) ─────────────

type VitalCallback = (metric: { name: string; value: number; id: string }) => void;

function observeLCP(cb: VitalCallback): void {
  try {
    const po = new PerformanceObserver((list) => {
      const entry = list.getEntries().pop() as PerformancePaintTiming | undefined;
      if (entry) cb({ name: 'LCP', value: entry.startTime, id: 'lcp-1' });
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* not supported */ }
}

function observeFCP(cb: VitalCallback): void {
  try {
    const po = new PerformanceObserver((list) => {
      const entry = list.getEntries().find((e) => e.name === 'first-contentful-paint');
      if (entry) cb({ name: 'FCP', value: entry.startTime, id: 'fcp-1' });
    });
    po.observe({ type: 'paint', buffered: true });
  } catch { /* not supported */ }
}

function observeTTFB(cb: VitalCallback): void {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) cb({ name: 'TTFB', value: nav.responseStart - nav.requestStart, id: 'ttfb-1' });
  } catch { /* not supported */ }
}

function observeCLS(cb: VitalCallback): void {
  let value = 0;
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) value += (entry as any).value;
      }
      cb({ name: 'CLS', value, id: 'cls-1' });
    });
    po.observe({ type: 'layout-shift', buffered: true });
  } catch { /* not supported */ }
}

function observeINP(cb: VitalCallback): void {
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEventTiming[];
      const last = entries[entries.length - 1];
      cb({ name: 'INP', value: last?.duration ?? 0, id: 'inp-1' });
    });
    po.observe({ type: 'first-input', buffered: true });
  } catch { /* not supported */ }
}

export async function startWebVitalsMonitoring(): Promise<void> {
  // All polyfilled — no external dependency. Runs as soon as called.
  const report = (name: string, value: number) => {
    logEvent({
      level: 'info',
      message: `web-vital:${name}`,
      metadata: { id: `${name.toLowerCase()}-1`, value: Number(value.toFixed(3)) },
    });
  };

  observeLCP((m) => report(m.name, m.value));
  observeFCP((m) => report(m.name, m.value));
  observeTTFB((m) => report(m.name, m.value));
  observeCLS((m) => report(m.name, m.value));
  observeINP((m) => report(m.name, m.value));

  logEvent({ level: 'info', message: 'web-vitals:initialized' });
}

// ── Global error monitoring ─────────────────────────────────────────────────

export function setupGlobalErrorMonitoring(): void {
  window.addEventListener('error', (event) => {
    logEvent({
      level: 'error',
      message: 'window-error',
      metadata: {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logEvent({
      level: 'error',
      message: 'unhandled-rejection',
      metadata: { reason: String(event.reason) },
    });
  });
}
