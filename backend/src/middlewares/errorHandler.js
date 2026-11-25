export function errorHandler(err, _req, res, _next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      ok: false,
      mensaje: 'La imagen supera el tamaño máximo permitido de 3 MB'
    });
  }

  const status = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(status).json({
    ok: false,
    mensaje: status === 500 && isProd ? 'Error interno del servidor' : err.message
  });
}