const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { webpush, publicKey } = require('../vapid');

const router = express.Router();
router.use(authenticateToken);

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey });
});

router.get('/settings', async (req, res) => {
  try {
    let result = await pool.query('SELECT * FROM notification_settings WHERE user_id = $1', [req.user.id]);
    if (!result.rows[0]) {
      result = await pool.query(
        'INSERT INTO notification_settings (user_id, enabled, reminder_hour) VALUES ($1, 1, 8) RETURNING *',
        [req.user.id]
      );
    }
    res.json({ settings: result.rows[0] });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', async (req, res) => {
  const { enabled, reminder_hour } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO notification_settings (user_id, enabled, reminder_hour)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled, reminder_hour = EXCLUDED.reminder_hour
      RETURNING *
    `, [req.user.id, enabled ? 1 : 0, reminder_hour ?? 8]);
    res.json({ settings: result.rows[0] });
  } catch (err) {
    console.error('Put settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/subscribe', async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'Subscription required' });
  try {
    await pool.query(`
      INSERT INTO push_subscriptions (user_id, subscription)
      VALUES ($1, $2)
      ON CONFLICT (subscription) DO UPDATE SET user_id = EXCLUDED.user_id
    `, [req.user.id, JSON.stringify(subscription)]);
    res.json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

router.delete('/unsubscribe', async (req, res) => {
  const { subscription } = req.body;
  try {
    if (subscription) {
      await pool.query(
        'DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription = $2',
        [req.user.id, JSON.stringify(subscription)]
      );
    } else {
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.user.id]);
    }
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/test', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT subscription FROM push_subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'No subscriptions found' });

    const payload = JSON.stringify({
      title: '📖 Maktaba — Test Notification',
      body: 'Your daily reading reminders are working!'
    });

    const results = await Promise.allSettled(
      result.rows.map(s => webpush.sendNotification(JSON.parse(s.subscription), payload))
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.user.id]);
    }

    res.json({ sent: results.length - failed.length, failed: failed.length });
  } catch (err) {
    console.error('Test notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
