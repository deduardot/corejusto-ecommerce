import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { authRepository } from '../repositories/auth.repository.js';

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next(new AppError('Token de autenticación requerido', 401));
    }

    const token = header.slice(7);
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return next(new AppError('Token inválido o expirado', 401));
    }

    // Se validan estado y permisos en vivo contra BD para que desactivaciones o cambios de rol surtan efecto inmediato
    const user = await authRepository.findSessionById(decoded.sub);
    if (!user || !user.activo) {
      return next(new AppError('Cuenta inactiva o inexistente', 401));
    }

    const permisos = await authRepository.findPermissionsByRoleId(user.rol_id);
    req.user = { ...user, permisos };
    next();
  } catch (error) {
    next(error);
  }
}