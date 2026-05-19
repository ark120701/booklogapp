const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { webpush, publicKey } = require('../vapid');

const router = express.Router();
router.use(authenticateToken);

// GET /api/notifications/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey });
});

// GET /api/notifications/settings
router.get('/settings', (req, res) => {
  let settings = db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(req.user.id);
  if (!settings) {
    db.prepare('INSERT INTO notification_settings (user_id, enabled, reminder_hour) VALUES (?, 1, 8)').run(req.user.id);
    settings = db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(req.user.id);
  }
  res.json({ settings });
});

// PUT /api/notifications/settings
router.put('/settings', (req, res) => {
  const { enabled, reminder_hour } = req.body;
  db.prepare(`
    INSERT INTO notification_settings (user_id, enabled, reminder_hour)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET enabled = excluded.enabled, reminder_hour = excluded.reminder_hour
  `).run(req.user.id, enabled ? 1 : 0, reminder_hour ?? 8);
  const settings = db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(req.user.id);
  res.json({ settings });
});

// POST /api/notifications/subscribe
router.post('/subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'Subscription required' });
  try {
    db.prepare(`
      INSERT INTO push_subscriptions (user_id, subscription)
      VALUES (?, ?)
      ON CONFLICT(subscription) DO UPDATE SET user_id = excluded.user_id
    `).run(req.user.id, JSON.stringify(subscription));
    res.json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// DELETE /api/notifications/unsubscribe
router.delete('/unsubscribe', (req, res) => {
  const { subscription } = req.body;
  if (subscription) {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?')
      .run(req.user.id, JSON.stringify(subscription));
  } else {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.user.id);
  }
  res.json({ message: 'Unsubscribed' });
});

// POST /api/notifications/test — send a test notification
router.post('/test', async (req, res) => {
  const subs = db.prepare('SELECT subscription FROM push_subscriptions WHERE user_id = ?').all(req.user.id);
  if (subs.length === 0) return res.status(404).json({ error: 'No subscriptions found' });

  const payload = JSON.stringify({
    title: '📖 Maktaba — Test Notification',
    body: 'Your daily reading reminders are working!'
  });

  const results = await Promise.allSettled(
    subs.map(s => webpush.sendNotification(JSON.parse(s.subscription), payload))
  );

  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.user.id);
  }

  res.json({ sent: results.length - failed.length, failed: failed.length });
});

module.exports = router;
