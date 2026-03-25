require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { init } = require('./db');

async function start() {
  // Initialize DB first
  await init();

  const app = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/clients', require('./routes/clients'));
  app.use('/api/forms', require('./routes/forms'));
  app.use('/api/submissions', require('./routes/submissions'));

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'FormFlow RE' }));

  // Serve static frontend in production
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });

  app.listen(PORT, () => {
    console.log(`\n🏠 FormFlow RE server running on http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api/health\n`);
  });
}

start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
