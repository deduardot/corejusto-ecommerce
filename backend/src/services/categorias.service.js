import { categoriasRepository } from '../repositories/categorias.repository.js';
import { slugify } from '../utils/slugify.js';
import { AppError } from '../utils/AppError.js';

export const categoriasService = {
  async listPublic() {
    return categoriasRepository.findAll({ onlyActive: true });
  },

  async listAdmin() {
    return categoriasRepository.findAll({ onlyActive: false });
  },

  async create({ nombre, slug, descripcion }) {
    if (!nombre) throw new AppError('El nombre de la categoría es obligatorio', 400);

    const finalSlug = slugify(slug || nombre);
    if (!finalSlug) throw new AppError('No se pudo generar un slug válido para la categoría', 400);

    const duplicate = await categoriasRepository.findByNameOrSlug(nombre, finalSlug);
    if (duplicate) throw new AppError('Ya existe una categoría con ese nombre o slug', 409);

    const id = await categoriasRepository.create({ nombre, slug: finalSlug, descripcion });
    return categoriasRepository.findById(id);
  },

  async update(id, payload) {
    const current = await categoriasRepository.findById(id);
    if (!current) throw new AppError('Categoría no encontrada', 404);

    const nextName = payload.nombre || current.nombre;
    const nextSlug = payload.slug ? slugify(payload.slug) : (payload.nombre ? slugify(payload.nombre) : current.slug);

    const duplicate = await categoriasRepository.findByNameOrSlug(nextName, nextSlug, id);
    if (duplicate) throw new AppError('Ya existe otra categoría con ese nombre o slug', 409);

    const nextActive = payload.activo !== undefined ? Boolean(payload.activo) : current.activo;
    await categoriasRepository.update(id, {
      nombre: nextName,
      slug: nextSlug,
      descripcion: payload.descripcion !== undefined ? payload.descripcion : current.descripcion,
      activo: nextActive
    });

    return categoriasRepository.findById(id);
  },

  async remove(id) {
    const current = await categoriasRepository.findById(id);
    if (!current) throw new AppError('Categoría no encontrada', 404);

    const linked = await categoriasRepository.countLinkedProducts(id);
    if (linked > 0) {
      throw new AppError('No se puede eliminar la categoría porque tiene productos asociados', 409);
    }

    await categoriasRepository.deleteById(id);
  }
};