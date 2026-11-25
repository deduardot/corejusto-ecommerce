import bcrypt from 'bcryptjs';
import { authRepository } from '../repositories/auth.repository.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authService = {
  async register({ nombre_completo, email, password, telefono, nit_ci }) {
    if (!nombre_completo || !email || !password) {
      throw new AppError('Nombre completo, correo y contraseña son obligatorios', 400);
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new AppError('Formato de correo electrónico inválido', 400);
    }
    if (password.length < 8) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await authRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new AppError('El correo electrónico ya está registrado', 409);
    }

    const rolClienteId = await authRepository.findClientRoleId();
    if (!rolClienteId) {
      throw new AppError('Rol Cliente no configurado en la base de datos', 500);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await authRepository.createClient({
      rolId: rolClienteId,
      nombreCompleto: nombre_completo,
      email: normalizedEmail,
      passwordHash,
      telefono,
      nitCi: nit_ci
    });

    const user = await authRepository.findSessionById(userId);
    const permisos = await authRepository.findPermissionsByRoleId(user.rol_id);
    const token = signToken({ sub: user.id, rol_id: user.rol_id });

    return { token, usuario: { ...user, permisos } };
  },

  async login({ email, password }) {
    if (!email || !password) {
      throw new AppError('Correo y contraseña son obligatorios', 400);
    }

    const user = await authRepository.findByEmail(email.toLowerCase());
    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }
    if (!user.activo) {
      throw new AppError('Tu cuenta se encuentra desactivada', 403);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const permisos = await authRepository.findPermissionsByRoleId(user.rol_id);
    const token = signToken({ sub: user.id, rol_id: user.rol_id });

    const { password_hash: _omitted, ...safeUser } = user;
    return { token, usuario: { ...safeUser, permisos } };
  }
};