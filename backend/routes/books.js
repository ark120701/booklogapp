const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/books — list user's books
router.get('/', (req, res) => {
  try {
    const books = db.prepare(`
      SELECT b.*,
        COALESCE(SUM(rs.pages_read), 0) as pages_read_total,
        COUNT(rs.id) as session_count
      FROM books b
      LEFT JOIN reading_sessions rs ON rs.book_id = b.id
      WHERE b.user_id = ?
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `).all(req.user.id);

    res.json({ books });
  } catch (err) {
    console.error('Get books error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/books — create book
router.post('/', (req, res) => {
  const { title, author_name, author_death_date, language, topic, total_pages, status, publisher } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO books (user_id, title, author_name, author_death_date, language, topic, total_pages, status, publisher)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      title,
      author_name || null,
      author_death_date || null,
      language || null,
      topic || null,
      total_pages || null,
      status || 'in_progress',
      publisher || null
    );

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ book });
  } catch (err) {
    console.error('Create book error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/books/:id — get book with reading sessions
router.get('/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const sessions = db.prepare(
      'SELECT * FROM reading_sessions WHERE book_id = ? ORDER BY date DESC, created_at DESC'
    ).all(req.params.id);

    const totalPagesRead = sessions.reduce((sum, s) => sum + s.pages_read, 0);

    res.json({ book: { ...book, pages_read_total: totalPagesRead }, sessions });
  } catch (err) {
    console.error('Get book error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/books/:id — update book
router.put('/:id', (req, res) => {
  const { title, author_name, author_death_date, language, topic, total_pages, status, publisher } = req.body;

  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    db.prepare(`
      UPDATE books SET
        title = ?,
        author_name = ?,
        author_death_date = ?,
        language = ?,
        topic = ?,
        total_pages = ?,
        status = ?,
        publisher = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title || book.title,
      author_name !== undefined ? author_name : book.author_name,
      author_death_date !== undefined ? author_death_date : book.author_death_date,
      language !== undefined ? language : book.language,
      topic !== undefined ? topic : book.topic,
      total_pages !== undefined ? total_pages : book.total_pages,
      status || book.status,
      publisher !== undefined ? publisher : book.publisher,
      req.params.id,
      req.user.id
    );

    const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    res.json({ book: updated });
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/books/:id — delete book
router.delete('/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    db.prepare('DELETE FROM books WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/books/:id/sessions — add reading session
router.post('/:id/sessions', (req, res) => {
  const { date, from_page, to_page, notes } = req.body;

  if (!date || from_page === undefined || to_page === undefined) {
    return res.status(400).json({ error: 'Date, from_page, and to_page are required' });
  }

  if (from_page < 1 || to_page < from_page) {
    return res.status(400).json({ error: 'Invalid page range' });
  }

  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const pages_read = to_page - from_page + 1;

    const result = db.prepare(`
      INSERT INTO reading_sessions (book_id, user_id, date, from_page, to_page, pages_read, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, req.user.id, date, from_page, to_page, pages_read, notes || null);

    const session = db.prepare('SELECT * FROM reading_sessions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ session });
  } catch (err) {
    console.error('Add session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/books/:id/sessions — get all sessions for a book
router.get('/:id/sessions', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const sessions = db.prepare(
      'SELECT * FROM reading_sessions WHERE book_id = ? ORDER BY date DESC, created_at DESC'
    ).all(req.params.id);

    res.json({ sessions });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/books/:id/sessions/:sessionId — delete a session
router.delete('/:id/sessions/:sessionId', (req, res) => {
  try {
    const session = db.prepare(
      'SELECT * FROM reading_sessions WHERE id = ? AND book_id = ? AND user_id = ?'
    ).get(req.params.sessionId, req.params.id, req.user.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    db.prepare('DELETE FROM reading_sessions WHERE id = ?').run(req.params.sessionId);
    res.json({ message: 'Session deleted successfully' });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
