const QUEUE_KEY = 'maktaba_offline_queue';

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToOfflineQueue(item) {
  const queue = getOfflineQueue();
  queue.push({ ...item, queuedAt: new Date().toISOString(), tempId: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromOfflineQueue(tempId) {
  const queue = getOfflineQueue().filter(item => item.tempId !== tempId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export async function syncOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const token = localStorage.getItem('maktaba_token');
      const res = await fetch(item.url, {
        method: item.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(item.body)
      });
      if (res.ok) {
        removeFromOfflineQueue(item.tempId);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
