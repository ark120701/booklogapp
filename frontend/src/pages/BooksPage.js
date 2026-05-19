import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './BooksPage.css';

const API = 'http://localhost:5000';

const TOPICS = [
  'Nahu', 'Sarf', 'Balaagah', 'Mantiq',
  'Tafseer', 'Uloomul Quran', 'Tajweed', 'Qiraat',
  'Fiqh', 'Fatwa', 'Usool Fiqh', 'Qawaid',
  'Comparative Fiqh', 'Hadith', 'Usool Hadith',
  'Aqeedah', 'Meeraath', 'Other'
];

function ProgressBar({ percent }) {
  return (
    <div className="progress-bar-container">
      <div
        className="progress-bar-fill"
        style={{ width: `${Math.min(100, percent || 0)}%` }}
      />
    </div>
  );
}

function BookCard({ book }) {
  const percent = book.total_pages
    ? Math.min(100, Math.round((book.pages_read_total / book.total_pages) * 100))
    : null;

  return (
    <Link to={`/books/${book.id}`} className="book-card card">
      <div className="book-card-header">
        <div className="book-card-badges">
          {book.topic && <span className="badge topic-badge">{book.topic}</span>}
          {book.language && <span className="badge language-badge">{book.language}</span>}
        </div>
        <span className={`badge status-badge status-${book.status}`}>
          {book.status.replace('_', ' ')}
        </span>
      </div>

      <h3 className="book-card-title">{book.title}</h3>

      {book.author_name && (
        <p className="book-card-author">
          {book.author_name}
          {book.author_death_date && ` (d. ${book.author_death_date})`}
        </p>
      )}

      <div className="book-card-footer">
        {percent !== null ? (
          <div className="book-card-progress">
            <div className="progress-stats">
              <span>{book.pages_read_total} / {book.total_pages} pages</span>
              <span>{percent}%</span>
            </div>
            <ProgressBar percent={percent} />
          </div>
        ) : (
          <p className="no-pages">No page count set</p>
        )}
        <div className="session-count">
          {book.session_count} session{book.session_count !== 1 ? 's' : ''}
        </div>
      </div>
    </Link>
  );
}

function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    axios.get(`${API}/api/books`)
      .then(res => setBooks(res.data.books || []))
      .catch(() => setError('Failed to load books.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = books.filter(b => {
    const matchSearch = !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author_name && b.author_name.toLowerCase().includes(search.toLowerCase()));
    const matchTopic = !filterTopic || b.topic === filterTopic;
    const matchStatus = !filterStatus || b.status === filterStatus;
    return matchSearch && matchTopic && matchStatus;
  });

  if (loading) return <div className="loading">Loading books...</div>;

  return (
    <div className="container books-page">
      <div className="page-header books-header">
        <div>
          <h1>My Library</h1>
          <p>{books.length} book{books.length !== 1 ? 's' : ''} in your collection</p>
        </div>
        <Link to="/books/add" className="btn btn-gold">+ Add Book</Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="books-filters card">
        <input
          type="text"
          className="filter-search"
          placeholder="Search by title or author..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterTopic}
          onChange={e => setFilterTopic(e.target.value)}
        >
          <option value="">All Topics</option>
          {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
        </select>
        {(search || filterTopic || filterStatus) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setSearch(''); setFilterTopic(''); setFilterStatus(''); }}
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="books-empty card">
          <div className="empty-icon">📚</div>
          {books.length === 0 ? (
            <>
              <h3>Your library is empty</h3>
              <p>Start by adding your first Islamic book</p>
              <Link to="/books/add" className="btn btn-primary">Add First Book</Link>
            </>
          ) : (
            <>
              <h3>No books match your filters</h3>
              <p>Try adjusting your search or filters</p>
            </>
          )}
        </div>
      ) : (
        <div className="books-grid">
          {filtered.map(book => <BookCard key={book.id} book={book} />)}
        </div>
      )}
    </div>
  );
}

export default BooksPage;
