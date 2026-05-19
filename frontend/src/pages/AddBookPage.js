import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AddBookPage.css';

const API = '';

const TOPICS = [
  'Nahu', 'Sarf', 'Balaagah', 'Mantiq',
  'Tafseer', 'Uloomul Quran', 'Tajweed', 'Qiraat',
  'Fiqh', 'Fatwa', 'Usool Fiqh', 'Qawaid',
  'Comparative Fiqh', 'Hadith', 'Usool Hadith',
  'Aqeedah', 'Meeraath', 'Other'
];

const LANGUAGES = ['Arabic', 'English', 'Urdu', 'Persian', 'Turkish', 'French', 'Other'];

function AddBookPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', author_name: '', author_death_date: '', publisher: '',
    language: '', topic: '', total_pages: '', volumes: '1', status: 'in_progress'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setError('');
    setLoading(true);
    const volumes = Math.max(1, parseInt(form.volumes, 10) || 1);
    try {
      const base = {
        author_name: form.author_name,
        author_death_date: form.author_death_date,
        publisher: form.publisher,
        language: form.language,
        topic: form.topic,
        total_pages: form.total_pages ? parseInt(form.total_pages, 10) : null,
        status: form.status
      };
      if (volumes === 1) {
        const res = await axios.post(`${API}/api/books`, { ...base, title: form.title });
        navigate(`/books/${res.data.book.id}`);
      } else {
        // Create the series folder first, then individual volumes inside it
        const seriesRes = await axios.post(`${API}/api/books`, {
          ...base,
          title: form.title,
          total_pages: null
        });
        const seriesId = seriesRes.data.book.id;
        const volRequests = Array.from({ length: volumes }, (_, i) =>
          axios.post(`${API}/api/books`, {
            ...base,
            title: `${form.title} — Vol. ${i + 1}`,
            parent_id: seriesId
          })
        );
        await Promise.all(volRequests);
        navigate(`/books/${seriesId}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add book.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container add-book-page">
      <div className="page-header">
        <h1>Add New Book</h1>
        <p>Record a book in your library</p>
      </div>

      <div className="add-book-card card">
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Book Title *</label>
            <input
              type="text" name="title" value={form.title}
              onChange={handleChange} placeholder="e.g. Alfiyyah Ibn Maalik" required autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Author Name</label>
              <input
                type="text" name="author_name" value={form.author_name}
                onChange={handleChange} placeholder="e.g. Ibn Maalik"
              />
            </div>
            <div className="form-group">
              <label>Author Death Date</label>
              <input
                type="text" name="author_death_date" value={form.author_death_date}
                onChange={handleChange} placeholder="e.g. 672 AH or 1274 CE"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Publisher</label>
            <input
              type="text" name="publisher" value={form.publisher}
              onChange={handleChange} placeholder="e.g. Dar al-Kutub al-Ilmiyyah"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Language</label>
              <select name="language" value={form.language} onChange={handleChange}>
                <option value="">Select language</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Topic / Subject</label>
              <select name="topic" value={form.topic} onChange={handleChange}>
                <option value="">Select topic</option>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Total Pages <span className="label-hint">(per volume)</span></label>
              <input
                type="number" name="total_pages" value={form.total_pages}
                onChange={handleChange} placeholder="e.g. 320" min="1"
              />
            </div>
            <div className="form-group">
              <label>Number of Volumes</label>
              <input
                type="number" name="volumes" value={form.volumes}
                onChange={handleChange} placeholder="e.g. 3" min="1" max="50"
              />
            </div>
          </div>

          {parseInt(form.volumes, 10) > 1 && (
            <div className="volumes-preview">
              Will create {form.volumes} separate books: <strong>{form.title || 'Book'} — Vol. 1</strong> through <strong>Vol. {form.volumes}</strong>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <Link to="/books" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBookPage;
