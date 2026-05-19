import React, { useEffect, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { syncOfflineQueue, getOfflineQueue } from '../utils/offlineQueue';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    setQueueCount(getOfflineQueue().length);
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && queueCount > 0) {
      handleSync();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSync() {
    setSyncing(true);
    const result = await syncOfflineQueue();
    setSyncing(false);
    setQueueCount(getOfflineQueue().length);
    if (result.synced > 0) {
      setSyncResult(result);
      setTimeout(() => setSyncResult(null), 4000);
    }
  }

  if (isOnline && !syncResult) return null;

  if (!isOnline) {
    return (
      <div className="offline-banner offline">
        <span className="offline-icon">📵</span>
        <span>You're offline — reading sessions will be saved and synced when you reconnect.</span>
        {queueCount > 0 && <span className="queue-badge">{queueCount} pending</span>}
      </div>
    );
  }

  if (syncResult) {
    return (
      <div className="offline-banner synced">
        <span className="offline-icon">✅</span>
        <span>Back online! Synced {syncResult.synced} session{syncResult.synced !== 1 ? 's' : ''}.</span>
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="offline-banner syncing">
        <span className="offline-icon">🔄</span>
        <span>Syncing offline sessions...</span>
      </div>
    );
  }

  return null;
}
