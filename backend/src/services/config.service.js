import { configRepository } from '../repositories/config.repository.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { AppError } from '../utils/AppError.js';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const configService = {
  async getPublicConfig() {
    const tienda = await configRepository.getStoreConfig();
    if (!tienda) throw new AppError('Configuración de tienda no inicializada', 500);
    const zonas_envio = await configRepository.findZones({ onlyActive: true });
    return { ...tienda, zonas_envio };
  },

  async updateStoreConfig(payload, file) {
    const current = await configRepository.getStoreConfig();
    if (!current) throw new AppError('Configuración de tienda no inicializada', 500);

    const colorPrimario = payload.color_primario || current.color_primario;
    const colorSecundario = payload.color_secundario || current.color_secundario;

    if (!HEX_COLOR_REGEX.test(colorPrimario) || !HEX_COLOR_REGEX.test(colorSecundario)) {
      throw new AppError('Los colores deben tener formato hexadecimal válido (#RRGGBB)', 400);
    }

    let logoUrl = payload.logo_url !== undefined ? (payload.logo_url || null) : current.logo_url;
    if (file) {
      logoUrl = await uploadImageBuffer(file.buffer, 'corejusto/branding');
    }

    await configRepository.updateStoreConfig({
      nombre_tienda: payload.nombre_tienda || current.nombre_tienda,
      eslogan: payload.eslogan !== undefined ? payload.eslogan : current.eslogan,
      logo_url: logoUrl,
      color_primario: colorPrimario,
      color_secundario: colorSecundario,
      moneda_simbolo: payload.moneda_simbolo || current.moneda_simbolo,
      moneda_codigo: (payload.moneda_codigo || current.moneda_codigo).toUpperCase(),
      email_contacto: payload.email_contacto || current.email_contacto,
      telefono_contacto: payload.telefono_contacto || current.telefono_contacto,
      direccion_tienda: payload.direccion_tienda || current.direccion_tienda,
      politica_comercio_justo: payload.politica_comercio_justo || current.politica_comercio_justo
    });

    return configRepository.getStoreConfig();
  },

  async listAllZones() {
    return configRepository.findZones({ onlyActive: false });
  },

  async createZone({ nombre, costo_envio, tiempo_estimado }) {
    const costo = Number(costo_envio);
    if (!nombre || !tiempo_estimado || Number.isNaN(costo) || costo < 0) {
      throw new AppError('Nombre, tiempo estimado y costo de envío (>= 0) son obligatorios', 400);
    }

    const existing = await configRepository.findZoneByName(nombre);
    if (existing) throw new AppError('Ya existe una zona de envío con ese nombre', 409);

    const id = await configRepository.createZone({ nombre, costo_envio: costo, tiempo_estimado });
    return configRepository.findZoneById(id);
  },

  async updateZone(id, payload) {
    const current = await configRepository.findZoneById(id);
    if (!current) throw new AppError('Zona de envío no encontrada', 404);

    const nextName = payload.nombre || current.nombre;
    if (nextName !== current.nombre) {
      const duplicate = await configRepository.findZoneByName(nextName);
      if (duplicate) throw new AppError('Ya existe otra zona con ese nombre', 409);
    }

    const nextCost = payload.costo_envio !== undefined ? Number(payload.costo_envio) : current.costo_envio;
    if (Number.isNaN(nextCost) || nextCost < 0) {
      throw new AppError('El costo de envío debe ser un número mayor o igual a 0', 400);
    }

    const nextActive = payload.activo !== undefined ? Boolean(payload.activo) : current.activo;
    await configRepository.updateZone(id, {
      nombre: nextName,
      costo_envio: nextCost,
      tiempo_estimado: payload.tiempo_estimado || current.tiempo_estimado,
      activo: nextActive
    });

    return configRepository.findZoneById(id);
  },

  async deleteZone(id) {
    const current = await configRepository.findZoneById(id);
    if (!current) throw new AppError('Zona de envío no encontrada', 404);

    const used = await configRepository.countAddressesByZone(id);
    if (used > 0) {
      throw new AppError('No se puede eliminar la zona porque está asociada a direcciones de clientes; desactívala en su lugar', 409);
    }

    await configRepository.deleteZone(id);
  }
};