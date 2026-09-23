import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('[Tabernacle VR] Starting application...');

// Global error handling - catch all errors and log them
window.addEventListener('error', (event) => {
  console.error('[GLOBAL ERROR]', event.message, event.error?.stack);
  const errorScreen = document.getElementById('error-screen');
  const errorOutput = document.getElementById('error-output');
  if (errorScreen && errorOutput) {
    errorOutput.textContent = `${event.message}\n\n${event.error?.stack || ''}`;
    errorScreen.style.display = 'flex';
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UNHANDLED REJECTION]', event.reason);
});

// Hide static HTML loading screen immediately
const htmlLoadingScreen = document.getElementById('loading-screen');
if (htmlLoadingScreen) {
  htmlLoadingScreen.style.display = 'none';
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[Tabernacle VR] Root element not found!');
  document.body.innerHTML = '<div style="color:white;padding:2rem;">Error: Root element not found</div>';
} else {
  console.log('[Tabernacle VR] Root element found, mounting React...');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('[Tabernacle VR] React mounted successfully');
}