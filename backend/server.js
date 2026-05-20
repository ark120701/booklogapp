require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const analyticsRoutes = require('./routes/analytics');
const notificationsRoutes = require('./routes/notifications');

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean);
    if (!origin || allowed.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Maktaba API is running' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Local development: start the server directly
if (require.main === module) {
  const path = require('path');
  const { initDb } = require('./db');
  const PORT = process.env.PORT || 5000;

  // Serve React build locally if built
  try {
    const buildPath = path.join(__dirname, '../frontend/build');
    if (require('fs').existsSync(buildPath)) {
      app.use(express.static(buildPath));
      app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
    }
  } catch {}

  initDb().then(() => {
    app.listen(PORT, () => {
      console.log(`Maktaba backend running on port ${PORT}`);
      require('./scheduler');
    });
  }).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
}

module.exports = app;
