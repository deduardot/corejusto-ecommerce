import { rolesRepository } from '../repositories/roles.repository.js';
import { AppError } from '../utils/AppError.js';

function normalizePermissionIds(permisoIds) {
  if (!Array.isArray(permisoIds)) return [];
  const unique = [...new Set(permisoIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  return unique;
}

export const rolesService = {
  async listPermissions() {
    return rolesRepository.findAllPermissions();
  },

  async listRoles() {
    return rolesRepository.findAllRolesWithPermissions();
  },

  async createRole({ nombre, descripcion, permiso_ids = [] }) {
    if (!nombre || !descripcion) {
      throw new AppError('Nombre y descripción del rol son obligatorios', 400);
    }

    const existing = await rolesRepository.findByName(nombre);
    if (existing) {
      throw new AppError('Ya existe un rol con ese nombre', 409);
    }

    const permisoIds = normalizePermissionIds(permiso_ids);
    const validCount = await rolesRepository.countValidPermissions(permisoIds);
    if (validCount !== permisoIds.length) {
      throw new AppError('Uno o más IDs de permisos no existen', 400);
    }

    const id = await rolesRepository.createWithPermissions({ nombre, descripcion, permisoIds });
    const allRoles = await rolesRepository.findAllRolesWithPermissions();
    return allRoles.find((r) => r.id === id);
  },

  async updateRole(rolId, { nombre, descripcion, permiso_ids }) {
    const role = await rolesRepository.findById(rolId);
    if (!role) {
      throw new AppError('Rol no encontrado', 404);
    }

    // Protege el rol SuperAdmin para impedir bloqueos irreversibles del panel administrativo
    if (role.es_sistema && role.nombre === 'SuperAdmin') {
      throw new AppError('El rol SuperAdmin del sistema no puede ser modificado', 403);
    }

    const nextName = role.es_sistema ? role.nombre : (nombre || role.nombre);
    const nextDesc = descripcion || role.descripcion;

    if (nextName !== role.nombre) {
      const duplicate = await rolesRepository.findByName(nextName);
      if (duplicate) {
        throw new AppError('Ya existe otro rol con ese nombre', 409);
      }
    }

    let permisoIds;
    if (permiso_ids !== undefined) {
      permisoIds = normalizePermissionIds(permiso_ids);
      const validCount = await rolesRepository.countValidPermissions(permisoIds);
      if (validCount !== permisoIds.length) {
        throw new AppError('Uno o más IDs de permisos no existen', 400);
      }
    }

    await rolesRepository.updateWithPermissions(rolId, {
      nombre: nextName,
      descripcion: nextDesc,
      permisoIds
    });

    const allRoles = await rolesRepository.findAllRolesWithPermissions();
    return allRoles.find((r) => r.id === Number(rolId));
  },

  async deleteRole(rolId) {
    const role = await rolesRepository.findById(rolId);
    if (!role) {
      throw new AppError('Rol no encontrado', 404);
    }
    if (role.es_sistema) {
      throw new AppError('No se puede eliminar un rol base del sistema', 403);
    }

    const assignedUsers = await rolesRepository.countUsersByRole(rolId);
    if (assignedUsers > 0) {
      throw new AppError('No se puede eliminar el rol porque tiene usuarios asignados', 409);
    }

    await rolesRepository.deleteById(rolId);
  }
};