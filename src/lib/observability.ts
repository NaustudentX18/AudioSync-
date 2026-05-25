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

export async function startWebVitalsMonitoring(): Promise<void> {
  const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals');
  const report = (metric: { name: string; value: number; id: string }) => {
    logEvent({
      level: 'info',
      message: `web-vital:${metric.name}`,
      metadata: {
        id: metric.id,
        value: Number(metric.value.toFixed(3)),
      },
    });
  };

  onCLS(report);
  onINP(report);
  onLCP(report);
  onFCP(report);
  onTTFB(report);
}

export function setupGlobalErrorMonitoring(): void {
  window.addEventListener('error', (event) => {
    logEvent({
      level: 'error',
      message: 'window-error',
      metadata: { message: event.message, source: event.filename, line: event.lineno, column: event.colno },
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
