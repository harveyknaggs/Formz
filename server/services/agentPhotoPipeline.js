const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { UPLOADS_DIR } = require('../config/paths');

const PHOTOS_ROOT = path.join(UPLOADS_DIR, 'agent-photos');
const PUBLIC_PREFIX = '/uploads/agent-photos';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function processAgentPhoto(buffer, { agentId }) {
  if (!Number.isInteger(agentId) || agentId <= 0) {
    throw new Error('Invalid agentId');
  }
  ensureDir(PHOTOS_ROOT);

  const fileName = `agent-${agentId}-${Date.now()}.jpg`;
  const fullPath = path.join(PHOTOS_ROOT, fileName);

  await sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize(600, 600, { fit: 'cover' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(fullPath);

  return {
    url: `${PUBLIC_PREFIX}/${fileName}`,
    _fullPath: fullPath,
  };
}

function removeAgentPhoto(url) {
  if (!url || typeof url !== 'string') return;
  if (!url.startsWith(`${PUBLIC_PREFIX}/`)) return;
  const rel = url.slice(PUBLIC_PREFIX.length + 1);
  // Don't delete the seeded ram.jpg if multiple agents end up pointing at it
  if (rel === 'ram.jpg') return;
  const abs = path.join(PHOTOS_ROOT, rel);
  if (!abs.startsWith(PHOTOS_ROOT)) return;
  try {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (err) {
    console.error('Failed to remove agent photo', abs, '-', err.message);
  }
}

module.exports = { processAgentPhoto, removeAgentPhoto, PHOTOS_ROOT, PUBLIC_PREFIX };
