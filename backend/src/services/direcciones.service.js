import { direccionesRepository } from '../repositories/direcciones.repository.js';
import { configRepository } from '../repositories/config.repository.js';
import { AppError } from '../utils/AppError.js';

export const direccionesService = {
  async listMine(usuarioId) {
    return direccionesRepository.findByUserId(usuarioId);
  },

  async create(usuarioId, payload) {
    const zonaId = Number(payload.zona_envio_id);
    if (!Number.isInteger(zonaId) || !payload.alias || !payload.direccion_exacta) {
      throw new AppError('Zona de envío, alias y dirección exacta son obligatorios', 400);
    }

    const zona = await configRepository.findZoneById(zonaId);
    if (!zona || !zona.activo) {
      throw new AppError('La zona de envío seleccionada no existe o no está disponible', 400);
    }

    const id = await direccionesRepository.create(usuarioId, {
      zona_envio_id: zonaId,
      alias: payload.alias,
      direccion_exacta: payload.direccion_exacta,
      referencia: payload.referencia,
      es_principal: Boolean(payload.es_principal)
    });

    return direccionesRepository.findByIdAndUser(id, usuarioId);
  },

  async update(id, usuarioId, payload) {
    const current = await direccionesRepository.findByIdAndUser(id, usuarioId);
    if (!current) throw new AppError('Dirección no encontrada', 404);

    const nextZonaId = payload.zona_envio_id !== undefined ? Number(payload.zona_envio_id) : current.zona_envio_id;
    if (nextZonaId !== current.zona_envio_id) {
      const zona = await configRepository.findZoneById(nextZonaId);
      if (!zona || !zona.activo) {
        throw new AppError('La zona de envío seleccionada no existe o no está disponible', 400);
      }
    }

    await direccionesRepository.update(id, usuarioId, {
      zona_envio_id: nextZonaId,
      alias: payload.alias || current.alias,
      direccion_exacta: payload.direccion_exacta || current.direccion_exacta,
      referencia: payload.referencia !== undefined ? payload.referencia : current.referencia,
      es_principal: payload.es_principal !== undefined ? Boolean(payload.es_principal) : current.es_principal
    });

    return direccionesRepository.findByIdAndUser(id, usuarioId);
  },

  async remove(id, usuarioId) {
    const current = await direccionesRepository.findByIdAndUser(id, usuarioId);
    if (!current) throw new AppError('Dirección no encontrada', 404);
    await direccionesRepository.deleteByIdAndUser(id, usuarioId);
  }
};