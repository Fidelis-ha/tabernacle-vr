import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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
  const errorDiv = document.createElement('div');
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '2rem';
  errorDiv.textContent = 'Error: Root element not found';
  document.body.appendChild(errorDiv);
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
