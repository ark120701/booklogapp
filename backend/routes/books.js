const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/books — list user's top-level books (excludes volumes)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*,
        COALESCE(SUM(rs.pages_read), 0)::int as pages_read_total,
        COUNT(DISTINCT rs.id)::int as session_count,
        (SELECT COUNT(*)::int FROM books v WHERE v.parent_id = b.id) as volume_count
      FROM books b
      LEFT JOIN reading_sessions rs ON rs.book_id = b.id
      WHERE b.user_id = $1 AND b.parent_id IS NULL
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json({ books: result.rows });
  } catch (err) {
    console.error('Get books error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/books — create book
router.post('/', async (req, res) => {
  const { title, author_name, author_death_date, language, topic, total_pages, status, publisher, parent_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const result = await pool.query(`
      INSERT INTO books (user_id, title, author_name, author_death_date, language, topic, total_pages, status, publisher, parent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      req.user.id, title,
      author_name || null, author_death_date || null,
      language || null, topic || null,
      total_pages || null, status || 'in_progress',
      publisher || null, parent_id || null
    ]);
    res.status(201).json({ book: result.rows[0] });
  } catch (err) {
    console.error('Create book error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/books/:id
router.get('/:id', async (req, res) => {
  try {
    const bookRes = await pool.query(
      'SELECT * FROM books WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!bookRes.rows[0]) return res.status(404).json({ error: 'Book not found' });
    const book = bookRes.rows[0];

    const volumesRes = await pool.query(`
      SELECT b.*,
        COALESCE(SUM(rs.pages_read), 0)::int as pages_read_total,
        COUNT(rs.id)::int as session_count
      FROM books b
      LEFT JOIN reading_sessions rs ON rs.book_id = b.id
      WHERE b.parent_id = $1
      GROUP BY b.id
      ORDER BY b.title ASC
    `, [req.params.id]);

    const sessionsRes = await pool.query(
      'SELECT * FROM reading_sessions WHERE book_id = $1 ORDER BY date DESC, created_at DESC',
      [req.params.id]
    );

    const sessions = sessionsRes.rows;
    const volumes = volumesRes.rows;
    const totalPagesRead = sessions.reduce((sum, s) => sum + s.pages_read, 0);

    let parent = null;
    if (book.parent_id) {
      const parentRes = await pool.query('SELECT id, title FROM books WHERE id = $1', [book.parent_id]);
      parent = parentRes.rows[0] || null;
    }

    res.json({
      book: { ...book, pages_read_total: totalPagesRead, volume_count: volumes.length },
      sessions,
      volumes,
      parent
    });
  } catch (err) {
    console.error('Get book error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/books/:id
router.put('/:id', async (req, res) => {
  const { title, author_name, author_death_date, language, topic, total_pages, status, publisher } = req.body;
  try {
    const bookRes = await pool.query(
      'SELECT * FROM books WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!bookRes.rows[0]) return res.status(404).json({ error: 'Book not found' });
    const book = bookRes.rows[0];

    const result = await pool.query(`
      UPDATE books SET
        title = $1, author_name = $2, author_death_date = $3,
        language = $4, topic = $5, total_pages = $6,
        status = $7, publisher = $8
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `, [
      title || book.title,
      author_name !== undefined ? author_name : book.author_name,
      author_death_date !== undefined ? author_death_date : book.author_death_date,
      language !== undefined ? language : book.language,
      topic !== undefined ? topic : book.topic,
      total_pages !== undefined ? total_pages : book.total_pages,
      status || book.status,
      publisher !== undefined ? publisher : book.publisher,
      req.params.id, req.user.id
    ]);
    res.json({ book: result.rows[0] });
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/books/:id
router.delete('/:id', async (req, res) => {
  try {
    const bookRes = await pool.query(
      'SELECT id FROM books WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!bookRes.rows[0]) return res.status(404).json({ error: 'Book not found' });

    await pool.query('DELETE FROM books WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/books/:id/sessions
router.post('/:id/sessions', async (req, res) => {
  const { date, from_page, to_page, notes } = req.body;
  if (!date || from_page === undefined || to_page === undefined)
    return res.status(400).json({ error: 'Date, from_page, and to_page are required' });
  if (from_page < 1 || to_page < from_page)
    return res.status(400).json({ error: 'Invalid page range' });

  try {
    const bookRes = await pool.query(
      'SELECT id FROM books WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!bookRes.rows[0]) return res.status(404).json({ error: 'Book not found' });

    const pages_read = to_page - from_page + 1;
    const result = await pool.query(`
      INSERT INTO reading_sessions (book_id, user_id, date, from_page, to_page, pages_read, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.params.id, req.user.id, date, from_page, to_page, pages_read, notes || null]);
    res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    console.error('Add session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/books/:id/sessions
router.get('/:id/sessions', async (req, res) => {
  try {
    const bookRes = await pool.query(
      'SELECT id FROM books WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!bookRes.rows[0]) return res.status(404).json({ error: 'Book not found' });

    const result = await pool.query(
      'SELECT * FROM reading_sessions WHERE book_id = $1 ORDER BY date DESC, created_at DESC',
      [req.params.id]
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/books/:id/sessions/:sessionId
router.delete('/:id/sessions/:sessionId', async (req, res) => {
  try {
    const sessionRes = await pool.query(
      'SELECT id FROM reading_sessions WHERE id = $1 AND book_id = $2 AND user_id = $3',
      [req.params.sessionId, req.params.id, req.user.id]
    );
    if (!sessionRes.rows[0]) return res.status(404).json({ error: 'Session not found' });

    await pool.query('DELETE FROM reading_sessions WHERE id = $1', [req.params.sessionId]);
    res.json({ message: 'Session deleted successfully' });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
