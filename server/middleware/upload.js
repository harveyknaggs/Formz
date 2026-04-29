const multer = require('multer');

const uploadPropertyDoc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const uploadPropertyImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_MIMES.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP or HEIC images are allowed'));
    }
    cb(null, true);
  }
});

const uploadAgentPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_MIMES.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP or HEIC images are allowed'));
    }
    cb(null, true);
  }
});

module.exports = { uploadPropertyDoc, uploadPropertyImage, uploadAgentPhoto };
