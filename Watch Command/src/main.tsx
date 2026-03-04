import { createRoot } from "react-dom/client";

// Global error handler for debugging white screen
window.onerror = function (message, source, lineno, colno, error) {
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; padding: 20px; background: white; color: red; z-index: 9999; border-bottom: 2px solid red; font-family: monospace; height: 100vh; overflow: auto;';
    errorContainer.innerHTML = `
    <h1 style="font-size: 20px; margin-bottom: 10px;">Startup Error</h1>
    <pre style="white-space: pre-wrap;">${message}\n\nat ${source}:${lineno}:${colno}</pre>
    ${error && error.stack ? `<pre style="margin-top: 10px; color: #666;">${error.stack}</pre>` : ''}
  `;
    document.body.appendChild(errorContainer);
};

window.addEventListener('unhandledrejection', function (event) {
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = 'position: fixed; top: 50%; left: 0; width: 100%; padding: 20px; background: white; color: red; z-index: 9999; border: 2px solid red; font-family: monospace; max-height: 50vh; overflow: auto;';
    errorContainer.innerHTML = `
    <h1 style="font-size: 20px; margin-bottom: 10px;">Unhandled Promise Rejection</h1>
    <pre style="white-space: pre-wrap;">${event.reason}</pre>
  `;
    document.body.appendChild(errorContainer);
});

import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
