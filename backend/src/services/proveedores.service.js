import { proveedoresRepository } from '../repositories/proveedores.repository.js';
import { AppError } from '../utils/AppError.js';

export const proveedoresService = {
  async listPublic() {
    return proveedoresRepository.findAll({ onlyActive: true });
  },

  async listAdmin() {
    return proveedoresRepository.findAll({ onlyActive: false });
  },

  async create(payload) {
    const { nombre, pais_origen, certificacion_comercio_justo, politica_garantia } = payload;
    if (!nombre || !pais_origen || !certificacion_comercio_justo || !politica_garantia) {
      throw new AppError(
        'Nombre, país de origen, certificación de comercio justo y política de garantía son obligatorios',
        400
      );
    }

    const existing = await proveedoresRepository.findByName(nombre);
    if (existing) throw new AppError('Ya existe un proveedor con ese nombre', 409);

    const id = await proveedoresRepository.create(payload);
    return proveedoresRepository.findById(id);
  },

  async update(id, payload) {
    const current = await proveedoresRepository.findById(id);
    if (!current) throw new AppError('Proveedor no encontrado', 404);

    const nextName = payload.nombre || current.nombre;
    if (nextName !== current.nombre) {
      const duplicate = await proveedoresRepository.findByName(nextName, id);
      if (duplicate) throw new AppError('Ya existe otro proveedor con ese nombre', 409);
    }

    await proveedoresRepository.update(id, {
      nombre: nextName,
      pais_origen: payload.pais_origen || current.pais_origen,
      contacto_email: payload.contacto_email !== undefined ? payload.contacto_email : current.contacto_email,
      telefono: payload.telefono !== undefined ? payload.telefono : current.telefono,
      certificacion_comercio_justo: payload.certificacion_comercio_justo || current.certificacion_comercio_justo,
      politica_garantia: payload.politica_garantia || current.politica_garantia,
      activo: payload.activo !== undefined ? Boolean(payload.activo) : current.activo
    });

    return proveedoresRepository.findById(id);
  },

  async remove(id) {
    const current = await proveedoresRepository.findById(id);
    if (!current) throw new AppError('Proveedor no encontrado', 404);

    const deps = await proveedoresRepository.countDependencies(id);
    if (deps > 0) {
      throw new AppError('No se puede eliminar el proveedor porque tiene productos o lotes vinculados', 409);
    }

    await proveedoresRepository.deleteById(id);
  }
};