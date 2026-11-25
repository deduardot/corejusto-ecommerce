import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// memoryStorage evita escribir en el disco efímero de servidores gratuitos como Render
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new AppError('Formato de imagen no permitido. Usa JPG, PNG o WebP', 400));
    }
    cb(null, true);
  }
});

export const uploadSingleImage = (fieldName = 'imagen') => upload.single(fieldName);