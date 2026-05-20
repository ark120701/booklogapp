import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationSetup.css';

const API = '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function NotificationSetup() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [settings, setSettings] = useState({ enabled: true, reminder_hour: 8 });
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(isSupported);
    setPermission(Notification.permission);

    axios.get(`${API}/api/notifications/settings`)
      .then(res => setSettings(res.data.settings))
      .catch(() => {});

    // If permission already granted, re-sync subscription to backend
    if (isSupported && Notification.permission === 'granted') {
      syncSubscription();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const syncSubscription = async () => {
    try {
      const { data } = await axios.get(`${API}/api/notifications/vapid-public-key`);
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey)
        });
      }
      await axios.post(`${API}/api/notifications/subscribe`, { subscription: sub });
      setSubscribed(true);
    } catch (err) {
      console.error('Sync subscription error:', err);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    setStatus('');
    try {
      const { data } = await axios.get(`${API}/api/notifications/vapid-public-key`);
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey)
      });

      await axios.post(`${API}/api/notifications/subscribe`, { subscription: sub });
      await axios.put(`${API}/api/notifications/settings`, settings);
      setSubscribed(true);
      setPermission('granted');
      setStatus('Reminders enabled!');
    } catch (err) {
      setStatus('Failed to enable notifications. Make sure you allow notifications in your browser.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    setStatus('Sending...');
    try {
      // Make sure subscription is synced before testing
      await syncSubscription();
      await axios.post(`${API}/api/notifications/test`);
      setStatus('Test notification sent! Check your notifications.');
    } catch {
      setStatus('Failed to send test. Try disabling and re-enabling reminders.');
    }
  };

  const updateSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await axios.put(`${API}/api/notifications/settings`, updated);
    } catch {}
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await axios.delete(`${API}/api/notifications/unsubscribe`, { data: { subscription: sub } });
          await sub.unsubscribe();
        }
      }
      await updateSettings({ enabled: false });
      setSubscribed(false);
      setPermission('default');
      setStatus('Reminders disabled.');
    } catch {}
  };

  if (!supported) return null;

  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = i % 12 || 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    return { value: i, label: `${h}:00 ${ampm}` };
  });

  const isEnabled = permission === 'granted' && subscribed;

  return (
    <div className="notification-setup card">
      <div className="notification-header">
        <div>
          <h3>🔔 Daily Reading Reminders</h3>
          <p>Get notified to read every day and keep your streak going</p>
        </div>
      </div>

      {permission === 'denied' ? (
        <div className="error-message">
          Notifications are blocked. Enable them in Chrome → Settings → Privacy → Notifications.
        </div>
      ) : isEnabled ? (
        <div className="notification-controls">
          <div className="reminder-time">
            <label>Remind me at</label>
            <select
              value={settings.reminder_hour}
              onChange={e => updateSettings({ reminder_hour: parseInt(e.target.value, 10) })}
            >
              {hours.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>
          <div className="notification-actions">
            <button className="btn btn-secondary btn-sm" onClick={sendTest}>Send Test</button>
            <button className="btn btn-danger btn-sm" onClick={unsubscribe}>Disable</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={subscribe} disabled={loading}>
          {loading ? 'Setting up...' : 'Enable Daily Reminders'}
        </button>
      )}

      {status && <p className="notification-status">{status}</p>}
    </div>
  );
}

export default NotificationSetup;
