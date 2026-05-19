const cron = require('node-cron');
const db = require('./db');
const { webpush } = require('./vapid');

function sendDailyReminders() {
  const currentHour = new Date().getHours();
  const today = new Date().toISOString().split('T')[0];

  // Get users whose reminder_hour matches now, notifications enabled, and haven't read today
  const users = db.prepare(`
    SELECT DISTINCT ns.user_id
    FROM notification_settings ns
    WHERE ns.enabled = 1
      AND ns.reminder_hour = ?
      AND ns.user_id NOT IN (
        SELECT DISTINCT user_id FROM reading_sessions WHERE date = ?
      )
  `).all(currentHour, today);

  for (const { user_id } of users) {
    const subs = db.prepare('SELECT subscription FROM push_subscriptions WHERE user_id = ?').all(user_id);
    const payload = JSON.stringify({
      title: '📖 Time to Read!',
      body: "Don't break your streak — open Maktaba and log today's reading session."
    });

    for (const { subscription } of subs) {
      webpush.sendNotification(JSON.parse(subscription), payload).catch(err => {
        if (err.statusCode === 410) {
          // Subscription expired — remove it
          db.prepare('DELETE FROM push_subscriptions WHERE subscription = ?').run(subscription);
        }
      });
    }
  }
}

// Run every hour at the top of the hour
cron.schedule('0 * * * *', sendDailyReminders);

console.log('Daily reminder scheduler started');

module.exports = { sendDailyReminders };
