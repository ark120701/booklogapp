const cron = require('node-cron');
const { pool } = require('./db');
const { webpush } = require('./vapid');

async function sendDailyReminders() {
  const currentHour = new Date().getHours();
  const today = new Date().toISOString().split('T')[0];

  try {
    const usersRes = await pool.query(`
      SELECT DISTINCT ns.user_id
      FROM notification_settings ns
      WHERE ns.enabled = 1
        AND ns.reminder_hour = $1
        AND ns.user_id NOT IN (
          SELECT DISTINCT user_id FROM reading_sessions WHERE date = $2
        )
    `, [currentHour, today]);

    for (const { user_id } of usersRes.rows) {
      const subsRes = await pool.query(
        'SELECT subscription FROM push_subscriptions WHERE user_id = $1',
        [user_id]
      );

      const payload = JSON.stringify({
        title: '📖 Time to Read!',
        body: "Don't break your streak — open Maktaba and log today's reading session."
      });

      for (const { subscription } of subsRes.rows) {
        webpush.sendNotification(JSON.parse(subscription), payload).catch(async err => {
          if (err.statusCode === 410) {
            await pool.query('DELETE FROM push_subscriptions WHERE subscription = $1', [subscription]);
          }
        });
      }
    }
  } catch (err) {
    console.error('Scheduler error:', err);
  }
}

cron.schedule('0 * * * *', sendDailyReminders);
console.log('Daily reminder scheduler started');

module.exports = { sendDailyReminders };
