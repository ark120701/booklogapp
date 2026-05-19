import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './BookDetailPage.css';

const API = 'http://localhost:5000';

const TOPICS = [
  'Nahu', 'Sarf', 'Balaagah', 'Mantiq',
  'Tafseer', 'Uloomul Quran', 'Tajweed', 'Qiraat',
  'Fiqh', 'Fatwa', 'Usool Fiqh', 'Qawaid',
  'Comparative Fiqh', 'Hadith', 'Usool Hadith',
  'Aqeedah', 'Meeraath', 'Other'
];

const LANGUAGES = ['Arabic', 'English', 'Urdu', 'Persian', 'Turkish', 'French', 'Other'];

const TOPIC_COLORS = {
  Nahu: '#0d7377', Sarf: '#14a085', Balaagah: '#d4a017', Mantiq: '#8b5e3c',
  Tafseer: '#1e6b4e', 'Uloomul Quran': '#2d7a3e', Tajweed: '#5c3d8f',
  Qiraat: '#7b3f8f', Fiqh: '#c0392b', Fatwa: '#e74c3c', 'Usool Fiqh': '#d35400',
  Qawaid: '#e67e22', 'Comparative Fiqh': '#f39c12', Hadith: '#2980b9',
  'Usool Hadith': '#1a6ea8', Aqeedah: '#1a3a5c', Meeraath: '#6c3483', Other: '#7f8c8d'
};

function ProgressBar({ percent }) {
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-fill" style={{ width: `${Math.min(100, percent || 0)}%` }} />
    </div>
  );
}

const today = () => new Date().toISOString().split('T')[0];

function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [session, setSession] = useState({ date: today(), from_page: '', to_page: '', notes: '' });
  const [sessionError, setSessionError] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchBook = async () => {
    try {
      const res = await axios.get(`${API}/api/books/${id}`);
      setBook(res.data.book);
      setSessions(res.data.sessions || []);
    } catch {
      setError('Book not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBook(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSessionChange = e => setSession({ ...session, [e.target.name]: e.target.value });

  const handleAddSession = async e => {
    e.preventDefault();
    const from = parseInt(session.from_page, 10);
    const to = parseInt(session.to_page, 10);
    if (!session.date || isNaN(from) || isNaN(to)) {
      setSessionError('Date, from page, and to page are required.');
      return;
    }
    if (from < 1 || to < from) {
      setSessionError('To page must be greater than or equal to from page.');
      return;
    }
    setSessionError('');
    setSessionLoading(true);
    try {
      await axios.post(`${API}/api/books/${id}/sessions`, {
        date: session.date,
        from_page: from,
        to_page: to,
        notes: session.notes || null
      });
      setSession({ date: today(), from_page: '', to_page: '', notes: '' });
      setShowSessionForm(false);
      fetchBook();
    } catch (err) {
      setSessionError(err.response?.data?.error || 'Failed to add session.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Delete this reading session?')) return;
    try {
      await axios.delete(`${API}/api/books/${id}/sessions/${sessionId}`);
      fetchBook();
    } catch {
      alert('Failed to delete session.');
    }
  };

  const startEdit = () => {
    setEditForm({
      title: book.title,
      author_name: book.author_name || '',
      author_death_date: book.author_death_date || '',
      language: book.language || '',
      topic: book.topic || '',
      total_pages: book.total_pages || '',
      status: book.status
    });
    setEditing(true);
  };

  const handleEditSubmit = async e => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      const payload = {
        ...editForm,
        total_pages: editForm.total_pages ? parseInt(editForm.total_pages, 10) : null
      };
      const res = await axios.put(`${API}/api/books/${id}`, payload);
      setBook(res.data.book);
      setEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update book.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!window.confirm('Delete this book and all its sessions?')) return;
    try {
      await axios.delete(`${API}/api/books/${id}`);
      navigate('/books');
    } catch {
      alert('Failed to delete book.');
    }
  };

  if (loading) return <div className="loading">Loading book...</div>;
  if (error) return <div className="container"><div className="error-message">{error}</div></div>;

  const totalRead = sessions.reduce((s, r) => s + r.pages_read, 0);
  const percent = book.total_pages ? Math.min(100, Math.round((totalRead / book.total_pages) * 100)) : null;
  const topicColor = TOPIC_COLORS[book.topic] || '#7f8c8d';

  return (
    <div className="container book-detail-page">
      <div className="back-link">
        <Link to="/books">← Back to Books</Link>
      </div>

      {editing ? (
        <div className="edit-card card">
          <h2>Edit Book</h2>
          {editError && <div className="error-message">{editError}</div>}
          <form onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label>Title *</label>
              <input type="text" value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Author Name</label>
                <input type="text" value={editForm.author_name}
                  onChange={e => setEditForm({ ...editForm, author_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Author Death Date</label>
                <input type="text" value={editForm.author_death_date}
                  onChange={e => setEditForm({ ...editForm, author_death_date: e.target.value })}
                  placeholder="e.g. 672 AH" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Language</label>
                <select value={editForm.language}
                  onChange={e => setEditForm({ ...editForm, language: e.target.value })}>
                  <option value="">Select</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Topic</label>
                <select value={editForm.topic}
                  onChange={e => setEditForm({ ...editForm, topic: e.target.value })}>
                  <option value="">Select</option>
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Total Pages</label>
                <input type="number" value={editForm.total_pages}
                  onChange={e => setEditForm({ ...editForm, total_pages: e.target.value })} min="1" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="book-header card">
          <div className="book-header-top">
            <div className="book-badges">
              {book.topic && (
                <span className="badge" style={{ background: topicColor + '22', color: topicColor }}>
                  {book.topic}
                </span>
              )}
              {book.language && (
                <span className="badge" style={{ background: 'var(--cream-dark)', color: 'var(--text-light)' }}>
                  {book.language}
                </span>
              )}
              <span className={`badge status-badge status-${book.status}`}>
                {book.status.replace('_', ' ')}
              </span>
            </div>
            <div className="book-actions">
              <button className="btn btn-secondary btn-sm" onClick={startEdit}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteBook}>Delete</button>
            </div>
          </div>

          <h1 className="book-title">{book.title}</h1>

          {(book.author_name || book.author_death_date) && (
            <div className="book-author">
              {book.author_name && <span>{book.author_name}</span>}
              {book.author_death_date && <span className="death-date"> (d. {book.author_death_date})</span>}
            </div>
          )}

          {percent !== null && (
            <div className="book-progress-section">
              <ProgressBar percent={percent} />
              <div className="progress-stats">
                <span>{totalRead.toLocaleString()} / {book.total_pages.toLocaleString()} pages read</span>
                <span className="progress-pct">{percent}%</span>
              </div>
            </div>
          )}

          <div className="book-stats-row">
            <div className="book-stat">
              <span className="book-stat-val">{totalRead.toLocaleString()}</span>
              <span className="book-stat-lbl">Pages Read</span>
            </div>
            <div className="book-stat">
              <span className="book-stat-val">{sessions.length}</span>
              <span className="book-stat-lbl">Sessions</span>
            </div>
            {book.total_pages && (
              <div className="book-stat">
                <span className="book-stat-val">{book.total_pages.toLocaleString()}</span>
                <span className="book-stat-lbl">Total Pages</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sessions-section">
        <div className="section-header">
          <h2>Reading Sessions</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowSessionForm(!showSessionForm)}>
            {showSessionForm ? 'Cancel' : '+ Log Session'}
          </button>
        </div>

        {showSessionForm && (
          <div className="session-form card">
            <h3>Log Reading Session</h3>
            {sessionError && <div className="error-message">{sessionError}</div>}
            <form onSubmit={handleAddSession}>
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" name="date" value={session.date}
                    onChange={handleSessionChange} required />
                </div>
                <div className="form-group" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>From Page</label>
                  <input type="number" name="from_page" value={session.from_page}
                    onChange={handleSessionChange} placeholder="e.g. 1" min="1" required />
                </div>
                <div className="form-group">
                  <label>To Page</label>
                  <input type="number" name="to_page" value={session.to_page}
                    onChange={handleSessionChange} placeholder="e.g. 25" min="1" required />
                </div>
              </div>
              <div className="form-group">
                <label>Notes / Beneficial Points</label>
                <textarea name="notes" value={session.notes} onChange={handleSessionChange}
                  placeholder="Write any notes, benefits, or key points from today's reading..."
                  rows="4" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={sessionLoading}>
                  {sessionLoading ? 'Saving...' : 'Save Session'}
                </button>
              </div>
            </form>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="empty-state card">
            <p>No reading sessions yet. Log your first session to start tracking.</p>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map(s => (
              <div key={s.id} className="session-card card">
                <div className="session-card-header">
                  <div className="session-card-meta">
                    <span className="session-card-date">{s.date}</span>
                    <span className="session-card-range">pp. {s.from_page}–{s.to_page}</span>
                    <span className="session-card-pages badge">{s.pages_read} pages</span>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteSession(s.id)}
                  >
                    Delete
                  </button>
                </div>
                {s.notes && (
                  <div className="session-card-notes">
                    <strong>Notes:</strong>
                    <p>{s.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BookDetailPage;
