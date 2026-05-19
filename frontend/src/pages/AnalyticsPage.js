import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './AnalyticsPage.css';

const API = 'http://localhost:5000';

const TOPIC_COLORS = [
  '#0d7377', '#14a085', '#d4a017', '#8b5e3c', '#1e6b4e', '#2d7a3e',
  '#5c3d8f', '#7b3f8f', '#c0392b', '#e74c3c', '#d35400', '#e67e22',
  '#f39c12', '#2980b9', '#1a6ea8', '#1a3a5c', '#6c3483', '#7f8c8d'
];

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/analytics/overview`),
      axios.get(`${API}/api/analytics/daily`),
      axios.get(`${API}/api/analytics/progress`)
    ])
      .then(([ov, da, pr]) => {
        setOverview(ov.data);
        // Format dates for chart
        setDaily(da.data.daily.map(d => ({
          ...d,
          label: d.date.slice(5) // MM-DD
        })));
        setProgress(pr.data.progress);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading analytics...</div>;

  const pieData = (overview?.booksByTopic || []).map(t => ({
    name: t.topic,
    value: t.count
  }));

  return (
    <div className="container analytics-page">
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Track your learning progress across Islamic sciences</p>
      </div>

      {overview && (
        <div className="stats-grid analytics-stats">
          <StatCard label="Total Books" value={overview.totalBooks} color="var(--teal)" />
          <StatCard label="Completed" value={overview.completedBooks} color="#10b981" />
          <StatCard label="In Progress" value={overview.inProgressBooks} color="var(--gold)" />
          <StatCard label="Total Pages Read" value={(overview.totalPages || 0).toLocaleString()} color="var(--teal)" />
          <StatCard
            label="Reading Streak"
            value={`${overview.streak} day${overview.streak !== 1 ? 's' : ''}`}
            color="#ef4444"
          />
        </div>
      )}

      <div className="chart-row">
        <div className="chart-card card">
          <h2>Pages Read — Last 30 Days</h2>
          {daily.every(d => d.pages === 0) ? (
            <div className="empty-state"><p>No reading sessions recorded yet.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={daily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--text-light)' }}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-light)' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                  formatter={(v) => [`${v} pages`, 'Pages Read']}
                  labelFormatter={l => `Date: ${l}`}
                />
                <Bar dataKey="pages" fill="var(--teal)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {pieData.length > 0 && (
          <div className="chart-card card">
            <h2>Books by Topic</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '0.85rem' }}
                  formatter={(v, n) => [`${v} book${v !== 1 ? 's' : ''}`, n]}
                />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {progress.length > 0 && (
        <div className="card progress-section">
          <h2>Book Progress</h2>
          <div className="progress-list">
            {progress.map(book => (
              <div key={book.id} className="progress-item">
                <div className="progress-item-header">
                  <span className="progress-item-title">{book.title}</span>
                  <span className="progress-item-stats">
                    {book.pages_read.toLocaleString()}
                    {book.total_pages ? ` / ${book.total_pages.toLocaleString()} pages` : ' pages read'}
                  </span>
                </div>
                {book.progress_percent !== null && (
                  <div className="progress-bar-row">
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${book.progress_percent}%` }}
                      />
                    </div>
                    <span className="progress-pct">{book.progress_percent}%</span>
                  </div>
                )}
                {book.topic && (
                  <span className="badge progress-topic" style={{ background: 'var(--cream-dark)', color: 'var(--text-light)', fontSize: '0.75rem' }}>
                    {book.topic}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(overview?.booksByLanguage?.length ?? 0) > 0 && (
        <div className="card language-section">
          <h2>Books by Language</h2>
          <div className="lang-grid">
            {overview.booksByLanguage.map(l => (
              <div key={l.language} className="lang-item">
                <span className="lang-name">{l.language || 'Unknown'}</span>
                <span className="lang-count">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsPage;
