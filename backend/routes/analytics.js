const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/analytics/overview
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalRes, completedRes, inProgressRes, pagesRes, topicRes, langRes, streakRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as count FROM books WHERE user_id = $1', [userId]),
      pool.query("SELECT COUNT(*)::int as count FROM books WHERE user_id = $1 AND status = 'completed'", [userId]),
      pool.query("SELECT COUNT(*)::int as count FROM books WHERE user_id = $1 AND status = 'in_progress'", [userId]),
      pool.query('SELECT COALESCE(SUM(pages_read), 0)::int as total FROM reading_sessions WHERE user_id = $1', [userId]),
      pool.query(`SELECT topic, COUNT(*)::int as count FROM books WHERE user_id = $1 AND topic IS NOT NULL GROUP BY topic ORDER BY count DESC`, [userId]),
      pool.query(`SELECT language, COUNT(*)::int as count FROM books WHERE user_id = $1 AND language IS NOT NULL GROUP BY language ORDER BY count DESC`, [userId]),
      pool.query(`SELECT DISTINCT date::text FROM reading_sessions WHERE user_id = $1 ORDER BY date DESC`, [userId])
    ]);

    // Calculate streak
    const sessionDates = streakRes.rows.map(r => r.date);
    let streak = 0;
    if (sessionDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (sessionDates[0] === today || sessionDates[0] === yesterday) {
        streak = 1;
        let checkDate = new Date(sessionDates[0]);
        for (let i = 1; i < sessionDates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const expected = checkDate.toISOString().split('T')[0];
          if (sessionDates[i] === expected) streak++;
          else break;
        }
      }
    }

    res.json({
      totalBooks: totalRes.rows[0].count,
      completedBooks: completedRes.rows[0].count,
      inProgressBooks: inProgressRes.rows[0].count,
      totalPages: pagesRes.rows[0].total,
      streak,
      booksByTopic: topicRes.rows,
      booksByLanguage: langRes.rows
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/daily — pages per day, last 30 days
router.get('/daily', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT date::text, SUM(pages_read)::int as pages
      FROM reading_sessions
      WHERE user_id = $1
        AND date >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY date
      ORDER BY date ASC
    `, [req.user.id]);

    const rows = result.rows;
    const daily = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const found = rows.find(r => r.date === d);
      daily.push({ date: d, pages: found ? found.pages : 0 });
    }
    res.json({ daily });
  } catch (err) {
    console.error('Analytics daily error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/topics
router.get('/topics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.topic,
        COUNT(DISTINCT b.id)::int as book_count,
        COALESCE(SUM(rs.pages_read), 0)::int as total_pages
      FROM books b
      LEFT JOIN reading_sessions rs ON rs.book_id = b.id
      WHERE b.user_id = $1
      GROUP BY b.topic
      ORDER BY book_count DESC
    `, [req.user.id]);
    res.json({ topics: result.rows });
  } catch (err) {
    console.error('Analytics topics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/progress
router.get('/progress', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.title, b.total_pages, b.status, b.topic,
        COALESCE(SUM(rs.pages_read), 0)::int as pages_read
      FROM books b
      LEFT JOIN reading_sessions rs ON rs.book_id = b.id
      WHERE b.user_id = $1
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `, [req.user.id]);

    const progress = result.rows.map(book => ({
      ...book,
      progress_percent: book.total_pages
        ? Math.min(100, Math.round((book.pages_read / book.total_pages) * 100))
        : null
    }));
    res.json({ progress });
  } catch (err) {
    console.error('Analytics progress error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
