const { sendDailyReminders } = require('../../backend/scheduler');

module.exports = async (req, res) => {
  // Vercel cron sends GET requests; protect against public access
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  await sendDailyReminders();
  res.json({ ok: true });
};
