require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const objectivesRoutes = require('./routes/objectives');
const logsRoutes = require('./routes/logs');
const statsRoutes = require('./routes/stats');
const friendsRoutes = require('./routes/friends');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 3000;

// Sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { message: 'Trop de requêtes, réessaie plus tard.' },
});
app.use(limiter);

// Rate limiting strict pour l'auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Trop de tentatives, réessaie dans 15 minutes.' },
});

// Body parsing
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/objectives', objectivesRoutes);
app.use('/logs', logsRoutes);
app.use('/stats', statsRoutes);
app.use('/friends', friendsRoutes);
app.use('/profile', profileRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404
app.use((req, res) => res.status(404).json({ message: 'Route introuvable.' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Erreur serveur.',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur Begin Now démarré sur le port ${PORT}`);
});
