import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import NotificationSetup from '../components/NotificationSetup';
import './DashboardPage.css';

const API = '';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card card">
      <div className="stat-icon" style={{ background: color }}>
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

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

function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [recentBooks, setRecentBooks] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, booksRes] = await Promise.all([
          axios.get(`${API}/api/analytics/overview`),
          axios.get(`${API}/api/books`)
        ]);
        setOverview(overviewRes.data);
        const books = booksRes.data.books || [];
        setRecentBooks(books.slice(0, 4));

        // Gather recent sessions from all books
        const sessions = [];
        for (const book of books.slice(0, 5)) {
          const res = await axios.get(`${API}/api/books/${book.id}/sessions`);
          const bookSessions = (res.data.sessions || []).slice(0, 2).map(s => ({
            ...s,
            book_title: book.title
          }));
          sessions.push(...bookSessions);
        }
        sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecentSessions(sessions.slice(0, 5));
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading your library...</div>;

  return (
    <div className="container dashboard-page">
      <div className="page-header dashboard-welcome">
        <div>
          <h1>Assalamu Alaikum, {user?.username}</h1>
          <p>Here's an overview of your reading journey</p>
        </div>
        <Link to="/books/add" className="btn btn-gold">
          + Add Book
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}
      <NotificationSetup />
      {overview && (
        <div className="stats-grid">
          <StatCard
            label="Total Books"
            value={overview.totalBooks}
            icon="📚"
            color="rgba(13, 115, 119, 0.12)"
          />
          <StatCard
            label="Completed"
            value={overview.completedBooks}
            icon="✅"
            color="rgba(16, 185, 129, 0.12)"
          />
          <StatCard
            label="Pages Read"
            value={overview.totalPages.toLocaleString()}
            icon="📖"
            color="rgba(212, 160, 23, 0.12)"
          />
          <StatCard
            label="Day Streak"
            value={`${overview.streak} 🔥`}
            icon="⚡"
            color="rgba(239, 68, 68, 0.12)"
          />
        </div>
      )}

      <div className="dashboard-grid">
        <section className="dashboard-section card">
          <div className="section-header">
            <h2>Recent Books</h2>
            <Link to="/books" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {recentBooks.length === 0 ? (
            <div className="empty-state">
              <p>No books yet. <Link to="/books/add">Add your first book</Link></p>
            </div>
          ) : (
            <div className="book-list">
              {recentBooks.map(book => {
                const percent = book.total_pages
                  ? Math.min(100, Math.round((book.pages_read_total / book.total_pages) * 100))
                  : null;
                return (
                  <Link key={book.id} to={`/books/${book.id}`} className="book-item">
                    <div className="book-item-info">
                      <div className="book-item-title">{book.title}</div>
                      {book.author_name && (
                        <div className="book-item-author">{book.author_name}</div>
                      )}
                    </div>
                    <div className="book-item-right">
                      {book.topic && (
                        <span className="badge topic-badge">{book.topic}</span>
                      )}
                      <span className={`badge status-badge status-${book.status}`}>
                        {book.status.replace('_', ' ')}
                      </span>
                    </div>
                    {percent !== null && (
                      <div className="book-item-progress">
                        <ProgressBar percent={percent} />
                        <span className="progress-label">{percent}%</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-section card">
          <div className="section-header">
            <h2>Recent Sessions</h2>
            <Link to="/analytics" className="btn btn-secondary btn-sm">Analytics</Link>
          </div>
          {recentSessions.length === 0 ? (
            <div className="empty-state">
              <p>No reading sessions yet. Start reading!</p>
            </div>
          ) : (
            <div className="sessions-list">
              {recentSessions.map(session => (
                <div key={session.id} className="session-item">
                  <div className="session-date">{session.date}</div>
                  <div className="session-info">
                    <div className="session-book">{session.book_title}</div>
                    <div className="session-pages">
                      Pages {session.from_page}–{session.to_page}
                      <span className="pages-count"> ({session.pages_read} pages)</span>
                    </div>
                    {session.notes && (
                      <div className="session-notes">{session.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
