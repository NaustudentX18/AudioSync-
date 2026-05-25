import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {
  logEvent,
  setupGlobalErrorMonitoring,
  startWebVitalsMonitoring,
} from './lib/observability';

// ── Boot splash ────────────────────────────────────────────────────────────
//
// The splash element is inline in index.html so it appears instantly,
// before any JS or CSS has loaded.  We fade it out here once React
// has mounted and the first paint is underway.
//
const splash = document.getElementById('boot-splash');
if (splash) {
  // Small delay so the user can actually see the brand mark on fast devices.
  const timer = setTimeout(() => {
    splash.style.opacity = '0';
    // Remove from DOM after the CSS transition completes.
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  }, 600);
  // Fallback: force-remove if transition never fires (e.g. CSS disabled).
  setTimeout(() => { if (splash.parentNode) splash.remove(); }, 2_000);
}

// ── React mount ────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ── Observability ──────────────────────────────────────────────────────────

void startWebVitalsMonitoring().catch((error) => {
  logEvent({
    level: 'warn',
    message: 'web-vitals-init-failed',
    metadata: { error: String(error) },
  });
});

setupGlobalErrorMonitoring();
