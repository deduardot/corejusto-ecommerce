import { productosRepository } from '../repositories/productos.repository.js';
import { categoriasRepository } from '../repositories/categorias.repository.js';
import { proveedoresRepository } from '../repositories/proveedores.repository.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { slugify } from '../utils/slugify.js';
import { AppError } from '../utils/AppError.js';

function parseEspecificaciones(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        throw new Error();
      }
      return parsed;
    } catch {
      throw new AppError('El campo especificaciones debe ser un objeto JSON válido', 400);
    }
  }
  throw new AppError('Formato de especificaciones inválido', 400);
}

export const productosService = {
  async listPublic(query) {
    return productosRepository.findPublicPaginated(query);
  },

  async listAdmin() {
    return productosRepository.findAllAdmin();
  },

  async getById(id) {
    const product = await productosRepository.findById(id);
    if (!product) throw new AppError('Producto no encontrado', 404);
    return product;
  },

  async getPublicBySlug(slug) {
    const product = await productosRepository.findPublicBySlug(slug);
    if (!product) throw new AppError('Producto no encontrado', 404);
    return product;
  },

  async create(payload, file) {
    const { categoria_id, proveedor_id, sku, nombre, descripcion, precio_venta } = payload;
    const precio = Number(precio_venta);

    if (!categoria_id || !proveedor_id || !sku || !nombre || !descripcion || Number.isNaN(precio) || precio <= 0) {
      throw new AppError('Categoría, proveedor, SKU, nombre, descripción y precio de venta (> 0) son obligatorios', 400);
    }

    const [cat, prov] = await Promise.all([
      categoriasRepository.findById(Number(categoria_id)),
      proveedoresRepository.findById(Number(proveedor_id))
    ]);
    if (!cat) throw new AppError('La categoría seleccionada no existe', 400);
    if (!prov) throw new AppError('El proveedor seleccionado no existe', 400);

    const cleanSku = sku.toUpperCase();
    const finalSlug = slugify(payload.slug || nombre);
    const duplicate = await productosRepository.findBySkuOrSlug(cleanSku, finalSlug);
    if (duplicate) throw new AppError('Ya existe un producto con ese SKU o slug', 409);

    const margen = payload.margen_transparente_pct !== undefined ? Number(payload.margen_transparente_pct) : 15;
    const garantia = payload.meses_garantia !== undefined ? Number(payload.meses_garantia) : 12;
    const stockMinimo = payload.stock_minimo !== undefined ? Number(payload.stock_minimo) : 5;

    if (Number.isNaN(margen) || margen < 0 || margen > 100) {
      throw new AppError('El margen transparente debe estar entre 0 y 100', 400);
    }

    const especificaciones = parseEspecificaciones(payload.especificaciones);

    let imagenUrl = payload.imagen_url || null;
    if (file) {
      imagenUrl = await uploadImageBuffer(file.buffer, 'corejusto/productos');
    }

    const id = await productosRepository.create({
      categoria_id: cat.id,
      proveedor_id: prov.id,
      sku: cleanSku,
      nombre,
      slug: finalSlug,
      descripcion,
      precio_venta: precio,
      margen_transparente_pct: margen,
      meses_garantia: garantia,
      stock_minimo: stockMinimo,
      imagen_url: imagenUrl,
      especificaciones
    });

    return productosRepository.findById(id);
  },

  async update(id, payload, file) {
    const current = await productosRepository.findById(id);
    if (!current) throw new AppError('Producto no encontrado', 404);

    const nextCatId = payload.categoria_id !== undefined ? Number(payload.categoria_id) : current.categoria_id;
    const nextProvId = payload.proveedor_id !== undefined ? Number(payload.proveedor_id) : current.proveedor_id;

    if (nextCatId !== current.categoria_id) {
      const cat = await categoriasRepository.findById(nextCatId);
      if (!cat) throw new AppError('La categoría seleccionada no existe', 400);
    }
    if (nextProvId !== current.proveedor_id) {
      const prov = await proveedoresRepository.findById(nextProvId);
      if (!prov) throw new AppError('El proveedor seleccionado no existe', 400);
    }

    const nextSku = payload.sku ? payload.sku.toUpperCase() : current.sku;
    const nextName = payload.nombre || current.nombre;
    const nextSlug = payload.slug ? slugify(payload.slug) : (payload.nombre ? slugify(payload.nombre) : current.slug);

    const duplicate = await productosRepository.findBySkuOrSlug(nextSku, nextSlug, id);
    if (duplicate) throw new AppError('Ya existe otro producto con ese SKU o slug', 409);

    const nextPrecio = payload.precio_venta !== undefined ? Number(payload.precio_venta) : current.precio_venta;
    if (Number.isNaN(nextPrecio) || nextPrecio <= 0) {
      throw new AppError('El precio de venta debe ser mayor a 0', 400);
    }

    let imagenUrl = payload.imagen_url !== undefined ? (payload.imagen_url || null) : current.imagen_url;
    if (file) {
      imagenUrl = await uploadImageBuffer(file.buffer, 'corejusto/productos');
    }

    const nextSpecs = payload.especificaciones !== undefined
      ? parseEspecificaciones(payload.especificaciones)
      : current.especificaciones;

    await productosRepository.update(id, {
      categoria_id: nextCatId,
      proveedor_id: nextProvId,
      sku: nextSku,
      nombre: nextName,
      slug: nextSlug,
      descripcion: payload.descripcion || current.descripcion,
      precio_venta: nextPrecio,
      margen_transparente_pct: payload.margen_transparente_pct !== undefined ? Number(payload.margen_transparente_pct) : current.margen_transparente_pct,
      meses_garantia: payload.meses_garantia !== undefined ? Number(payload.meses_garantia) : current.meses_garantia,
      stock_minimo: payload.stock_minimo !== undefined ? Number(payload.stock_minimo) : current.stock_minimo,
      imagen_url: imagenUrl,
      especificaciones: nextSpecs
    });

    return productosRepository.findById(id);
  },

  async toggleStatus(id, activo) {
    if (typeof activo !== 'boolean') {
      throw new AppError('El campo activo debe ser booleano (true o false)', 400);
    }
    const current = await productosRepository.findById(id);
    if (!current) throw new AppError('Producto no encontrado', 404);

    await productosRepository.updateStatus(id, activo);
    return productosRepository.findById(id);
  }
};