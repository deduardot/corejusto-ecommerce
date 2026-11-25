import { AppError } from '../utils/AppError.js';

export function requirePermission(permisoRequerido) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    if (!req.user.permisos.includes(permisoRequerido)) {
      return next(new AppError(`Permiso insuficiente: se requiere ${permisoRequerido}`, 403));
    }

    next();
  };
}