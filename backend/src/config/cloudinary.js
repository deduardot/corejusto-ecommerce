import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../utils/AppError.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export function uploadImageBuffer(buffer, folder = 'corejusto/productos') {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new AppError('Credenciales de Cloudinary no configuradas en .env', 500);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Fuerza WebP y compresión adaptativa para reducir consumo de datos en redes 3G
        transformation: [
          { width: 1000, crop: 'limit' },
          { quality: 'auto:eco', fetch_format: 'webp' }
        ]
      },
      (error, result) => {
        if (error) return reject(new AppError('Error al subir la imagen a Cloudinary', 502));
        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}