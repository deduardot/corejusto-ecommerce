import { pool } from '../config/db.js';

function parseJsonColumn(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const pedidosRepository = {
  async findProductForCheckout(conn, productoId) {
    const [rows] = await conn.execute(
      'SELECT id, sku, nombre, precio_venta, activo FROM productos WHERE id = ? LIMIT 1',
      [productoId]
    );
    return rows[0] || null;
  },

  async createPedido(conn, data) {
    const [res] = await conn.execute(
      `INSERT INTO pedidos
       (codigo_pedido, usuario_id, tipo_entrega, direccion_envio_id, direccion_snapshot,
        codigo_retiro, subtotal, costo_envio, total, costo_ventas_cogs, estado, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.codigo_pedido,
        data.usuario_id,
        data.tipo_entrega,
        data.direccion_envio_id || null,
        data.direccion_snapshot || null,
        data.codigo_retiro || null,
        data.subtotal,
        data.costo_envio,
        data.total,
        data.costo_ventas_cogs,
        data.estado,
        data.notas || null
      ]
    );
    return res.insertId;
  },

  async updatePedidoAfterFifo(conn, pedidoId, { costoVentasCogs, estado }) {
    await conn.execute(
      'UPDATE pedidos SET costo_ventas_cogs = ?, estado = ? WHERE id = ?',
      [costoVentasCogs, estado, pedidoId]
    );
  },

  async createDetallePedido(conn, data) {
    const [res] = await conn.execute(
      `INSERT INTO detalle_pedido
       (pedido_id, producto_id, nombre_producto_snapshot, cantidad, precio_unitario_snapshot, subtotal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.pedido_id,
        data.producto_id,
        data.nombre_producto_snapshot,
        data.cantidad,
        data.precio_unitario_snapshot,
        data.subtotal
      ]
    );
    return res.insertId;
  },

  async createDetallePedidoLote(conn, data) {
    await conn.execute(
      `INSERT INTO detalle_pedido_lotes (detalle_pedido_id, lote_id, cantidad, costo_unitario_lote)
       VALUES (?, ?, ?, ?)`,
      [data.detalle_pedido_id, data.lote_id, data.cantidad, data.costo_unitario_lote]
    );
  },

  async createTransaccionPago(conn, data) {
    const [res] = await conn.execute(
      `INSERT INTO transacciones_pago
       (pedido_id, metodo, referencia_externa, monto, estado, comprobante_url, datos_respuesta, validado_por_usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.pedido_id,
        data.metodo,
        data.referencia_externa,
        data.monto,
        data.estado,
        data.comprobante_url || null,
        data.datos_respuesta ? JSON.stringify(data.datos_respuesta) : null,
        data.validado_por_usuario_id || null
      ]
    );
    return res.insertId;
  },

  async findByIdForUpdate(conn, pedidoId) {
    const [rows] = await conn.execute(
      'SELECT * FROM pedidos WHERE id = ? LIMIT 1 FOR UPDATE',
      [pedidoId]
    );
    return rows[0] || null;
  },

  async findTransaccionByPedidoId(pedidoId, conn = pool) {
    const [rows] = await conn.execute(
      'SELECT * FROM transacciones_pago WHERE pedido_id = ? ORDER BY id DESC LIMIT 1',
      [pedidoId]
    );
    if (!rows[0]) return null;
    return { ...rows[0], datos_respuesta: parseJsonColumn(rows[0].datos_respuesta) };
  },

  async updateTransaccionPago(conn, transaccionId, { estado, datosRespuesta, validadoPorUsuarioId }) {
    await conn.execute(
      `UPDATE transacciones_pago
       SET estado = ?, datos_respuesta = ?, validado_por_usuario_id = ?
       WHERE id = ?`,
      [
        estado,
        datosRespuesta ? JSON.stringify(datosRespuesta) : null,
        validadoPorUsuarioId || null,
        transaccionId
      ]
    );
  },

  async updateComprobanteUrl(transaccionId, comprobanteUrl) {
    await pool.execute(
      'UPDATE transacciones_pago SET comprobante_url = ? WHERE id = ?',
      [comprobanteUrl, transaccionId]
    );
  },

  async updatePedidoEstado(conn, pedidoId, estado) {
    await conn.execute('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, pedidoId]);
  },

  async findDetallesConLotes(conn, pedidoId) {
    const [detalles] = await conn.execute(
      `SELECT id, producto_id, nombre_producto_snapshot, cantidad, precio_unitario_snapshot, subtotal
       FROM detalle_pedido
       WHERE pedido_id = ?`,
      [pedidoId]
    );

    const [lotes] = await conn.execute(
      `SELECT dpl.detalle_pedido_id, dpl.lote_id, l.codigo_lote, dpl.cantidad, dpl.costo_unitario_lote
       FROM detalle_pedido_lotes dpl
       INNER JOIN detalle_pedido dp ON dp.id = dpl.detalle_pedido_id
       INNER JOIN lotes_inventario l ON l.id = dpl.lote_id
       WHERE dp.pedido_id = ?`,
      [pedidoId]
    );

    const lotesMap = new Map();
    for (const row of lotes) {
      if (!lotesMap.has(row.detalle_pedido_id)) lotesMap.set(row.detalle_pedido_id, []);
      lotesMap.get(row.detalle_pedido_id).push({
        lote_id: row.lote_id,
        codigo_lote: row.codigo_lote,
        cantidad: row.cantidad,
        costo_unitario_lote: row.costo_unitario_lote
      });
    }

    return detalles.map((d) => ({
      ...d,
      lotes_consumidos: lotesMap.get(d.id) || []
    }));
  },

  async findFullById(pedidoId) {
    const [rows] = await pool.execute(
      `SELECT p.*, u.nombre_completo AS cliente_nombre, u.email AS cliente_email, u.telefono AS cliente_telefono
       FROM pedidos p
       INNER JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.id = ?
       LIMIT 1`,
      [pedidoId]
    );
    if (!rows[0]) return null;

    const [items, pago] = await Promise.all([
      this.findDetallesConLotes(pool, pedidoId),
      this.findTransaccionByPedidoId(pedidoId)
    ]);

    return { ...rows[0], items, pago };
  },

  async findAll({ usuarioId, estado } = {}) {
    const conditions = [];
    const params = [];

    if (usuarioId) {
      conditions.push('p.usuario_id = ?');
      params.push(usuarioId);
    }
    if (estado) {
      conditions.push('p.estado = ?');
      params.push(estado.toUpperCase());
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT p.id, p.codigo_pedido, p.usuario_id, u.nombre_completo AS cliente_nombre,
              p.tipo_entrega, p.codigo_retiro, p.subtotal, p.costo_envio, p.total,
              p.costo_ventas_cogs, p.estado, p.creado_en,
              tp.metodo AS pago_metodo, tp.estado AS pago_estado
       FROM pedidos p
       INNER JOIN usuarios u ON u.id = p.usuario_id
       LEFT JOIN transacciones_pago tp ON tp.pedido_id = p.id
       ${whereSql}
       ORDER BY p.creado_en DESC, p.id DESC`,
      params
    );
    return rows;
  },

  async getResumenFinanciero() {
    const [[totales]] = await pool.execute(
      `SELECT
         COUNT(*) AS pedidos_validos,
         ROUND(COALESCE(SUM(subtotal), 0), 2) AS ingresos_productos,
         ROUND(COALESCE(SUM(costo_envio), 0), 2) AS ingresos_envios,
         ROUND(COALESCE(SUM(total), 0), 2) AS facturacion_total,
         ROUND(COALESCE(SUM(costo_ventas_cogs), 0), 2) AS costo_ventas_cogs_total,
         ROUND(COALESCE(SUM(subtotal - costo_ventas_cogs), 0), 2) AS utilidad_bruta_real
       FROM pedidos
       WHERE estado NOT IN ('CANCELADO', 'PENDIENTE_PAGO')`
    );

    const [porEstado] = await pool.execute(
      'SELECT estado, COUNT(*) AS cantidad FROM pedidos GROUP BY estado'
    );

    return { totales, por_estado: porEstado };
  }
};