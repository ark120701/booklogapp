import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { syncOfflineQueue } from './utils/offlineQueue';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA (offline + push notifications)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('[SW] Registered:', registration.scope);

        // Listen for messages from the service worker
        navigator.serviceWorker.addEventListener('message', async event => {
          if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
            await syncOfflineQueue();
            window.dispatchEvent(new CustomEvent('offlineQueueSynced'));
          }
        });
      })
      .catch(err => console.error('[SW] Registration failed:', err));
  });
}
