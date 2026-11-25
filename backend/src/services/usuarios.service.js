import bcrypt from 'bcryptjs';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { rolesRepository } from '../repositories/roles.repository.js';
import { AppError } from '../utils/AppError.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const usuariosService = {
  async listUsers() {
    return usuariosRepository.findAll();
  },

  async getUserById(id) {
    const user = await usuariosRepository.findById(id);
    if (!user) throw new AppError('Usuario no encontrado', 404);
    return user;
  },

  async createUser({ rol_id, nombre_completo, email, password, telefono, nit_ci }) {
    if (!rol_id || !nombre_completo || !email || !password) {
      throw new AppError('Rol, nombre completo, correo y contraseña son obligatorios', 400);
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new AppError('Formato de correo electrónico inválido', 400);
    }
    if (password.length < 8) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
    }

    const role = await rolesRepository.findById(Number(rol_id));
    if (!role) throw new AppError('El rol seleccionado no existe', 400);

    const normalizedEmail = email.toLowerCase();
    const existing = await usuariosRepository.findByEmail(normalizedEmail);
    if (existing) throw new AppError('El correo electrónico ya está registrado', 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const id = await usuariosRepository.create({
      rolId: role.id,
      nombreCompleto: nombre_completo,
      email: normalizedEmail,
      passwordHash,
      telefono,
      nitCi: nit_ci
    });

    return usuariosRepository.findById(id);
  },

  async updateUser(targetId, payload, requesterId) {
    const current = await usuariosRepository.findById(targetId);
    if (!current) throw new AppError('Usuario no encontrado', 404);

    const nextRolId = payload.rol_id !== undefined ? Number(payload.rol_id) : current.rol_id;
    if (targetId === requesterId && nextRolId !== current.rol_id) {
      throw new AppError('No puedes cambiar tu propio rol administrativo', 403);
    }

    const role = await rolesRepository.findById(nextRolId);
    if (!role) throw new AppError('El rol seleccionado no existe', 400);

    const nextEmail = payload.email ? payload.email.toLowerCase() : current.email;
    if (!EMAIL_REGEX.test(nextEmail)) {
      throw new AppError('Formato de correo electrónico inválido', 400);
    }
    if (nextEmail !== current.email) {
      const duplicate = await usuariosRepository.findByEmail(nextEmail);
      if (duplicate) throw new AppError('El correo electrónico ya está en uso', 409);
    }

    let passwordHash = null;
    if (payload.password) {
      if (payload.password.length < 8) {
        throw new AppError('La nueva contraseña debe tener al menos 8 caracteres', 400);
      }
      passwordHash = await bcrypt.hash(payload.password, 10);
    }

    await usuariosRepository.update(targetId, {
      rolId: nextRolId,
      nombreCompleto: payload.nombre_completo || current.nombre_completo,
      email: nextEmail,
      telefono: payload.telefono !== undefined ? payload.telefono : current.telefono,
      nitCi: payload.nit_ci !== undefined ? payload.nit_ci : current.nit_ci,
      passwordHash
    });

    return usuariosRepository.findById(targetId);
  },

  async toggleUserStatus(targetId, activo, requesterId) {
    if (typeof activo !== 'boolean') {
      throw new AppError('El campo activo debe ser booleano (true o false)', 400);
    }
    if (targetId === requesterId && !activo) {
      throw new AppError('No puedes desactivar tu propia cuenta', 403);
    }

    const current = await usuariosRepository.findById(targetId);
    if (!current) throw new AppError('Usuario no encontrado', 404);

    await usuariosRepository.updateStatus(targetId, activo);
    return usuariosRepository.findById(targetId);
  }
};