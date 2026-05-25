import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logEvent, setupGlobalErrorMonitoring, startWebVitalsMonitoring } from './lib/observability';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const splash = document.getElementById('boot-splash');
if (splash) {
  requestAnimationFrame(() => {
    splash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: 'ease-out', fill: 'forwards' });
    setTimeout(() => splash.remove(), 300);
  });
}

void startWebVitalsMonitoring().catch((error) => {
  logEvent({
    level: 'warn',
    message: 'web-vitals-init-failed',
    metadata: { error: String(error) },
  });
});

setupGlobalErrorMonitoring();
