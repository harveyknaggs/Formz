require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { init } = require('./db');
const { authLimiter, publicFormLimiter, genericApiLimiter } = require('./middleware/rateLimit');
const { UPLOADS_DIR } = require('./config/paths');

async function start() {
  if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) {
    console.error('WARNING: APP_URL is not set — emailed download links will point to localhost and be dead. Set it in your env config.');
  }

  // Initialize DB first
  await init();

  const app = express();
  const PORT = process.env.PORT || 3001;

  // Trust Railway/reverse-proxy so req.ip reflects the real client IP via X-Forwarded-For
  app.set('trust proxy', 1);

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.use('/api', genericApiLimiter);

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/signup', authLimiter);
  app.use('/api/submissions/public/:token', publicFormLimiter);
  app.use('/api/forms/public/:token', publicFormLimiter);
  app.use('/api/forms/html/:token', publicFormLimiter);

  // API routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/clients', require('./routes/clients'));
  app.use('/api/forms', require('./routes/forms'));
  app.use('/api/submissions', require('./routes/submissions'));
  app.use('/api/gmail', require('./routes/gmail'));
  app.use('/api/listings', require('./routes/listings'));

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'FormFlow RE' }));

  // Serve static files from server/public
  app.use('/public', express.static(path.join(__dirname, 'public')));

  // Serve public property images (gallery photos, hero images)
  app.use('/uploads/property-images', express.static(path.join(UPLOADS_DIR, 'property-images'), {
    maxAge: '7d',
    fallthrough: false,
  }));

  // Serve static frontend in production
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });

  fs.mkdirSync(path.join(UPLOADS_DIR, 'properties'), { recursive: true });
  fs.mkdirSync(path.join(UPLOADS_DIR, 'property-images'), { recursive: true });

  app.listen(PORT, () => {
    console.log(`\n🏠 FormFlow RE server running on http://localhost:${PORT}`);
    console.log(`📂 Uploads dir: ${UPLOADS_DIR}`);
    console.log(`📊 API: http://localhost:${PORT}/api/health\n`);
  });
}

start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
