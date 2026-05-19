const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET /api/analytics/overview
router.get('/overview', (req, res) => {
  try {
    const userId = req.user.id;

    const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books WHERE user_id = ?').get(userId);
    const completedBooks = db.prepare("SELECT COUNT(*) as count FROM books WHERE user_id = ? AND status = 'completed'").get(userId);
    const inProgressBooks = db.prepare("SELECT COUNT(*) as count FROM books WHERE user_id = ? AND status = 'in_progress'").get(userId);

    const totalPagesRow = db.prepare('SELECT COALESCE(SUM(pages_read), 0) as total FROM reading_sessions WHERE user_id = ?').get(userId);

    const booksByTopic = db.prepare(`
      SELECT topic, COUNT(*) as count
      FROM books
      WHERE user_id = ? AND topic IS NOT NULL
      GROUP BY topic
      ORDER BY count DESC
    `).all(userId);

    const booksByLanguage = db.prepare(`
      SELECT language, COUNT(*) as count
      FROM books
      WHERE user_id = ? AND language IS NOT NULL
      GROUP BY language
      ORDER BY count DESC
    `).all(userId);

    // Calculate reading streak
    const sessionDates = db.prepare(`
      SELECT DISTINCT date
      FROM reading_sessions
      WHERE user_id = ?
      ORDER BY date DESC
    `).all(userId).map(r => r.date);

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
          if (sessionDates[i] === expected) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    res.json({
      totalBooks: totalBooks.count,
      completedBooks: completedBooks.count,
      inProgressBooks: inProgressBooks.count,
      totalPages: totalPagesRow.total,
      streak,
      booksByTopic,
      booksByLanguage
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/daily — pages read per day (last 30 days)
router.get('/daily', (req, res) => {
  try {
    const userId = req.user.id;

    const rows = db.prepare(`
      SELECT date, SUM(pages_read) as pages
      FROM reading_sessions
      WHERE user_id = ?
        AND date >= date('now', '-29 days')
      GROUP BY date
      ORDER BY date ASC
    `).all(userId);

    // Fill in missing days with 0
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const found = rows.find(r => r.date === d);
      result.push({ date: d, pages: found ? found.pages : 0 });
    }

    res.json({ daily: result });
  } catch (err) {
    console.error('Analytics daily error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/topics — breakdown by topic
router.get('/topics', (req, res) => {
  try {
    const userId = req.user.id;

    const topicStats = db.prepare(`
      SELECT
        b.topic,
        COUNT(DISTINCT b.id) as book_count,
        COALESCE(SUM(rs.pages_read), 0) as total_pages
      FROM books b
      LEFT JOIN reading_sessions rs ON rs.book_id = b.id
      WHERE b.user_id = ?
      GROUP BY b.topic
      ORDER BY book_count DESC
    `).all(userId);

    res.json({ topics: topicStats });
  } catch (err) {
    console.error('Analytics topics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/progress — per-book progress percentages
router.get('/progress', (req, res) => {
  try {
    const userId = req.user.id;

    const books = db.prepare(`
      SELECT
        b.id,
        b.title,
        b.total_pages,
        b.status,
        b.topic,
        COALESCE(SUM(rs.pages_read), 0) as pages_read
      FROM books b
      LEFT JOIN reading_sessions rs ON rs.book_id = b.id
      WHERE b.user_id = ?
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `).all(userId);

    const progress = books.map(book => ({
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
