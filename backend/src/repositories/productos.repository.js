import { pool } from '../config/db.js';

// MariaDB en XAMPP devuelve columnas JSON como texto; este normalizador unifica la respuesta con MySQL 8
function formatProductRow(row) {
  let specs = row.especificaciones;
  if (typeof specs === 'string') {
    try {
      specs = JSON.parse(specs);
    } catch {
      specs = null;
    }
  }
  return {
    ...row,
    especificaciones: specs,
    activo: Boolean(row.activo),
    alerta_stock_bajo: Boolean(row.alerta_stock_bajo)
  };
}

const BASE_SELECT = `
  SELECT p.id, p.categoria_id, c.nombre AS categoria_nombre, c.slug AS categoria_slug,
         p.proveedor_id, pr.nombre AS proveedor_nombre, pr.pais_origen AS proveedor_pais,
         pr.certificacion_comercio_justo, pr.politica_garantia,
         p.sku, p.nombre, p.slug, p.descripcion, p.precio_venta,
         p.margen_transparente_pct, p.meses_garantia, p.stock_minimo,
         p.imagen_url, p.especificaciones, p.activo, p.creado_en,
         COALESCE(v.stock_actual, 0) AS stock_actual,
         COALESCE(v.alerta_stock_bajo, 1) AS alerta_stock_bajo
  FROM productos p
  INNER JOIN categorias c ON c.id = p.categoria_id
  INNER JOIN proveedores pr ON pr.id = p.proveedor_id
  LEFT JOIN vista_stock_productos v ON v.producto_id = p.id
`;

export const productosRepository = {
  async findPublicPaginated({ categoria, proveedor, q, page = 1, limit = 12 }) {
    const conditions = ['p.activo = 1', 'c.activo = 1'];
    const params = [];

    if (categoria) {
      conditions.push('(c.slug = ? OR c.id = ?)');
      params.push(categoria, Number(categoria) || 0);
    }
    if (proveedor) {
      conditions.push('p.proveedor_id = ?');
      params.push(Number(proveedor));
    }
    if (q) {
      conditions.push('(p.nombre LIKE ? OR p.sku LIKE ? OR p.descripcion LIKE ?)');
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    const whereSql = `WHERE ${conditions.join(' AND ')}`;
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const [[countRow]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM productos p
       INNER JOIN categorias c ON c.id = p.categoria_id
       ${whereSql}`,
      params
    );

    const [rows] = await pool.execute(
      `${BASE_SELECT} ${whereSql} ORDER BY p.creado_en DESC LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    );

    return {
      items: rows.map(formatProductRow),
      paginacion: {
        total: countRow.total,
        pagina: safePage,
        limite: safeLimit,
        total_paginas: Math.ceil(countRow.total / safeLimit)
      }
    };
  },

  async findAllAdmin() {
    const [rows] = await pool.execute(`${BASE_SELECT} ORDER BY p.id DESC`);
    return rows.map(formatProductRow);
  },

  async findById(id) {
    const [rows] = await pool.execute(`${BASE_SELECT} WHERE p.id = ? LIMIT 1`, [id]);
    return rows[0] ? formatProductRow(rows[0]) : null;
  },

  async findPublicBySlug(slug) {
    const [rows] = await pool.execute(
      `${BASE_SELECT} WHERE p.slug = ? AND p.activo = 1 LIMIT 1`,
      [slug]
    );
    return rows[0] ? formatProductRow(rows[0]) : null;
  },

  async findBySkuOrSlug(sku, slug, excludeId = null) {
    const sql = excludeId
      ? 'SELECT id FROM productos WHERE (sku = ? OR slug = ?) AND id != ? LIMIT 1'
      : 'SELECT id FROM productos WHERE sku = ? OR slug = ? LIMIT 1';
    const params = excludeId ? [sku, slug, excludeId] : [sku, slug];
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },

  async create(data) {
    const [res] = await pool.execute(
      `INSERT INTO productos
       (categoria_id, proveedor_id, sku, nombre, slug, descripcion, precio_venta,
        margen_transparente_pct, meses_garantia, stock_minimo, imagen_url, especificaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.categoria_id,
        data.proveedor_id,
        data.sku,
        data.nombre,
        data.slug,
        data.descripcion,
        data.precio_venta,
        data.margen_transparente_pct,
        data.meses_garantia,
        data.stock_minimo,
        data.imagen_url,
        data.especificaciones ? JSON.stringify(data.especificaciones) : null
      ]
    );
    return res.insertId;
  },

  async update(id, data) {
    await pool.execute(
      `UPDATE productos
       SET categoria_id = ?, proveedor_id = ?, sku = ?, nombre = ?, slug = ?,
           descripcion = ?, precio_venta = ?, margen_transparente_pct = ?,
           meses_garantia = ?, stock_minimo = ?, imagen_url = ?, especificaciones = ?
       WHERE id = ?`,
      [
        data.categoria_id,
        data.proveedor_id,
        data.sku,
        data.nombre,
        data.slug,
        data.descripcion,
        data.precio_venta,
        data.margen_transparente_pct,
        data.meses_garantia,
        data.stock_minimo,
        data.imagen_url,
        data.especificaciones ? JSON.stringify(data.especificaciones) : null,
        id
      ]
    );
  },

  async updateStatus(id, activo) {
    await pool.execute('UPDATE productos SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  }
};