const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { UPLOADS_DIR } = require('../config/paths');

const IMAGES_ROOT = path.join(UPLOADS_DIR, 'property-images');
const PUBLIC_PREFIX = '/uploads/property-images';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function processPropertyImage(buffer, { shortCode }) {
  if (!shortCode || typeof shortCode !== 'string' || !/^[a-z0-9]{3,12}$/.test(shortCode)) {
    throw new Error('Invalid shortCode');
  }

  const dir = path.join(IMAGES_ROOT, shortCode);
  ensureDir(dir);

  const id = crypto.randomBytes(12).toString('hex');
  const fullName = `${id}.jpg`;
  const thumbName = `${id}-thumb.jpg`;
  const fullPath = path.join(dir, fullName);
  const thumbPath = path.join(dir, thumbName);

  const pipeline = sharp(buffer, { failOn: 'error' }).rotate();
  const metadata = await pipeline.metadata();

  await pipeline
    .clone()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(fullPath);

  const thumbInfo = await pipeline
    .clone()
    .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toFile(thumbPath);

  return {
    url: `${PUBLIC_PREFIX}/${shortCode}/${fullName}`,
    thumb_url: `${PUBLIC_PREFIX}/${shortCode}/${thumbName}`,
    width: metadata.width || null,
    height: metadata.height || null,
    _fullPath: fullPath,
    _thumbPath: thumbPath,
  };
}

function removeImageFiles(image) {
  if (!image) return;
  for (const url of [image.url, image.thumb_url]) {
    if (!url || typeof url !== 'string') continue;
    if (!url.startsWith(PUBLIC_PREFIX)) continue;
    const rel = url.slice(PUBLIC_PREFIX.length + 1);
    const abs = path.join(IMAGES_ROOT, rel);
    if (!abs.startsWith(IMAGES_ROOT)) continue;
    try {
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch (err) {
      console.error('Failed to remove image file', abs, '-', err.message);
    }
  }
}

module.exports = {
  processPropertyImage,
  removeImageFiles,
  IMAGES_ROOT,
  PUBLIC_PREFIX,
};
