import { pool } from '../config/db.js';

export const inventarioRepository = {
  async findLotes({ productoId, estado } = {}) {
    const conditions = [];
    const params = [];

    if (productoId) {
      conditions.push('l.producto_id = ?');
      params.push(Number(productoId));
    }
    if (estado) {
      conditions.push('l.estado = ?');
      params.push(estado.toUpperCase());
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT l.id, l.producto_id, p.sku, p.nombre AS producto_nombre,
              l.proveedor_id, pr.nombre AS proveedor_nombre,
              l.codigo_lote, l.cantidad_inicial, l.cantidad_disponible,
              l.costo_unitario, l.fecha_ingreso, l.estado, l.observaciones
       FROM lotes_inventario l
       INNER JOIN productos p ON p.id = l.producto_id
       INNER JOIN proveedores pr ON pr.id = l.proveedor_id
       ${whereSql}
       ORDER BY l.fecha_ingreso ASC, l.id ASC`,
      params
    );
    return rows;
  },

  async findLoteById(id, { conn = pool, forUpdate = false } = {}) {
    const lock = forUpdate ? 'FOR UPDATE' : '';
    const [rows] = await conn.execute(
      `SELECT id, producto_id, proveedor_id, codigo_lote, cantidad_inicial,
              cantidad_disponible, costo_unitario, fecha_ingreso, estado, observaciones
       FROM lotes_inventario
       WHERE id = ?
       LIMIT 1 ${lock}`,
      [id]
    );
    return rows[0] || null;
  },

  async findLoteByCode(codigoLote) {
    const [rows] = await pool.execute(
      'SELECT id FROM lotes_inventario WHERE codigo_lote = ? LIMIT 1',
      [codigoLote]
    );
    return rows[0] || null;
  },

  async findActiveLotesForUpdate(conn, productoId) {
    // FOR UPDATE bloquea los lotes del producto hasta el COMMIT para evitar sobreventas concurrentes
    const [rows] = await conn.execute(
      `SELECT id, codigo_lote, cantidad_disponible, costo_unitario, fecha_ingreso
       FROM lotes_inventario
       WHERE producto_id = ? AND estado = 'ACTIVO' AND cantidad_disponible > 0
       ORDER BY fecha_ingreso ASC, id ASC
       FOR UPDATE`,
      [productoId]
    );
    return rows;
  },

  async findActiveLotesReadOnly(productoId) {
    const [rows] = await pool.execute(
      `SELECT id, codigo_lote, cantidad_disponible, costo_unitario, fecha_ingreso
       FROM lotes_inventario
       WHERE producto_id = ? AND estado = 'ACTIVO' AND cantidad_disponible > 0
       ORDER BY fecha_ingreso ASC, id ASC`,
      [productoId]
    );
    return rows;
  },

  async createLote(conn, data) {
    const [res] = await conn.execute(
      `INSERT INTO lotes_inventario
       (producto_id, proveedor_id, codigo_lote, cantidad_inicial, cantidad_disponible,
        costo_unitario, fecha_ingreso, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?)`,
      [
        data.producto_id,
        data.proveedor_id,
        data.codigo_lote,
        data.cantidad,
        data.cantidad,
        data.costo_unitario,
        data.fecha_ingreso,
        data.observaciones || null
      ]
    );
    return res.insertId;
  },

  async updateLoteStock(conn, { loteId, cantidadDisponible, estado }) {
    await conn.execute(
      'UPDATE lotes_inventario SET cantidad_disponible = ?, estado = ? WHERE id = ?',
      [cantidadDisponible, estado, loteId]
    );
  },

  async createMovimiento(conn, data) {
    const [res] = await conn.execute(
      `INSERT INTO movimientos_inventario
       (producto_id, lote_id, usuario_id, tipo, cantidad, costo_unitario,
        referencia_tipo, referencia_id, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.producto_id,
        data.lote_id,
        data.usuario_id,
        data.tipo,
        data.cantidad,
        data.costo_unitario,
        data.referencia_tipo || null,
        data.referencia_id || null,
        data.motivo
      ]
    );
    return res.insertId;
  },

  async findKardexPaginated({ productoId, loteId, tipo, desde, hasta, page = 1, limit = 20 }) {
    const conditions = [];
    const params = [];

    if (productoId) {
      conditions.push('m.producto_id = ?');
      params.push(Number(productoId));
    }
    if (loteId) {
      conditions.push('m.lote_id = ?');
      params.push(Number(loteId));
    }
    if (tipo) {
      conditions.push('m.tipo = ?');
      params.push(tipo.toUpperCase());
    }
    if (desde) {
      conditions.push('m.creado_en >= ?');
      params.push(desde);
    }
    if (hasta) {
      conditions.push('m.creado_en <= ?');
      params.push(hasta);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const [[countRow]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM movimientos_inventario m ${whereSql}`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT m.id, m.producto_id, p.sku, p.nombre AS producto_nombre,
              m.lote_id, l.codigo_lote, m.usuario_id, u.nombre_completo AS usuario_nombre,
              m.tipo, m.cantidad, m.costo_unitario,
              ROUND(m.cantidad * m.costo_unitario, 2) AS costo_total,
              m.referencia_tipo, m.referencia_id, m.motivo, m.creado_en
       FROM movimientos_inventario m
       INNER JOIN productos p ON p.id = m.producto_id
       INNER JOIN lotes_inventario l ON l.id = m.lote_id
       INNER JOIN usuarios u ON u.id = m.usuario_id
       ${whereSql}
       ORDER BY m.creado_en DESC, m.id DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    );

    return {
      items: rows,
      paginacion: {
        total: countRow.total,
        pagina: safePage,
        limite: safeLimit,
        total_paginas: Math.ceil(countRow.total / safeLimit)
      }
    };
  },

  async findAlertasStockBajo() {
    const [rows] = await pool.execute(
      `SELECT v.producto_id, v.sku, v.nombre, c.nombre AS categoria_nombre,
              pr.nombre AS proveedor_nombre, v.stock_actual, v.stock_minimo,
              (v.stock_minimo - v.stock_actual) AS deficit_minimo
       FROM vista_stock_productos v
       INNER JOIN productos p ON p.id = v.producto_id
       INNER JOIN categorias c ON c.id = p.categoria_id
       INNER JOIN proveedores pr ON pr.id = p.proveedor_id
       WHERE p.activo = 1 AND v.alerta_stock_bajo = 1
       ORDER BY v.stock_actual ASC, v.nombre ASC`
    );
    return rows;
  },

  async getValorizacionPorProducto() {
    const [rows] = await pool.execute(
      `SELECT p.id AS producto_id, p.sku, p.nombre, p.precio_venta, p.stock_minimo,
              COUNT(CASE WHEN l.estado = 'ACTIVO' AND l.cantidad_disponible > 0 THEN 1 END) AS lotes_activos,
              COALESCE(SUM(CASE WHEN l.estado = 'ACTIVO' THEN l.cantidad_disponible ELSE 0 END), 0) AS stock_actual,
              ROUND(COALESCE(SUM(CASE WHEN l.estado = 'ACTIVO' THEN l.cantidad_disponible * l.costo_unitario ELSE 0 END), 0), 2) AS valor_inventario_fifo
       FROM productos p
       LEFT JOIN lotes_inventario l ON l.producto_id = p.id
       WHERE p.activo = 1
       GROUP BY p.id, p.sku, p.nombre, p.precio_venta, p.stock_minimo
       ORDER BY p.nombre ASC`
    );
    return rows;
  }
};