import { pool } from '../config/db.js';
import { inventarioRepository } from '../repositories/inventario.repository.js';
import { productosRepository } from '../repositories/productos.repository.js';
import { proveedoresRepository } from '../repositories/proveedores.repository.js';
import { AppError } from '../utils/AppError.js';

const ESTADOS_LOTE = new Set(['ACTIVO', 'AGOTADO', 'ANULADO']);
const TIPOS_MOVIMIENTO = new Set(['ENTRADA', 'SALIDA_VENTA', 'DEVOLUCION', 'AJUSTE_MERMA']);

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function formatSqlDate(input) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Formato de fecha de ingreso inválido', 400);
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function generateLotCode(sku) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `LOTE-${sku}-${stamp}-${suffix}`;
}

export const inventarioService = {
  async listarLotes({ producto_id, estado }) {
    if (estado && !ESTADOS_LOTE.has(estado.toUpperCase())) {
      throw new AppError('Estado de lote inválido (ACTIVO, AGOTADO o ANULADO)', 400);
    }
    return inventarioRepository.findLotes({ productoId: producto_id, estado });
  },

  async ingresarLote(payload, usuarioId) {
    const productoId = Number(payload.producto_id);
    const proveedorId = Number(payload.proveedor_id);
    const cantidad = Number(payload.cantidad);
    const costoUnitario = Number(payload.costo_unitario);

    if (!Number.isInteger(productoId) || !Number.isInteger(proveedorId)) {
      throw new AppError('Producto y proveedor son obligatorios', 400);
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new AppError('La cantidad inicial del lote debe ser un entero mayor a 0', 400);
    }
    if (Number.isNaN(costoUnitario) || costoUnitario <= 0) {
      throw new AppError('El costo unitario de adquisición debe ser mayor a 0', 400);
    }

    const [producto, proveedor] = await Promise.all([
      productosRepository.findById(productoId),
      proveedoresRepository.findById(proveedorId)
    ]);
    if (!producto) throw new AppError('Producto no encontrado', 404);
    if (!proveedor) throw new AppError('Proveedor no encontrado', 404);

    const codigoLote = payload.codigo_lote
      ? payload.codigo_lote.toUpperCase()
      : generateLotCode(producto.sku);

    const duplicate = await inventarioRepository.findLoteByCode(codigoLote);
    if (duplicate) throw new AppError('Ya existe un lote registrado con ese código', 409);

    const fechaIngreso = formatSqlDate(payload.fecha_ingreso);
    const motivo = payload.observaciones || `Ingreso de mercadería - ${codigoLote}`;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const loteId = await inventarioRepository.createLote(conn, {
        producto_id: productoId,
        proveedor_id: proveedorId,
        codigo_lote: codigoLote,
        cantidad,
        costo_unitario: roundMoney(costoUnitario),
        fecha_ingreso: fechaIngreso,
        observaciones: payload.observaciones || null
      });

      await inventarioRepository.createMovimiento(conn, {
        producto_id: productoId,
        lote_id: loteId,
        usuario_id: usuarioId,
        tipo: 'ENTRADA',
        cantidad,
        costo_unitario: roundMoney(costoUnitario),
        referencia_tipo: 'INGRESO_LOTE',
        referencia_id: loteId,
        motivo
      });

      await conn.commit();
      return inventarioRepository.findLoteById(loteId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async registrarAjusteMerma({ lote_id, cantidad, motivo }, usuarioId) {
    const loteId = Number(lote_id);
    const qty = Number(cantidad);

    if (!Number.isInteger(loteId) || !Number.isInteger(qty) || qty <= 0) {
      throw new AppError('ID de lote y cantidad (entero mayor a 0) son obligatorios', 400);
    }
    if (!motivo || motivo.length < 5) {
      throw new AppError('Debes especificar un motivo detallado para registrar la merma (mínimo 5 caracteres)', 400);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const lote = await inventarioRepository.findLoteById(loteId, { conn, forUpdate: true });
      if (!lote) throw new AppError('Lote no encontrado', 404);
      if (lote.estado !== 'ACTIVO') {
        throw new AppError('Solo se pueden ajustar lotes en estado ACTIVO', 409);
      }
      if (lote.cantidad_disponible < qty) {
        throw new AppError(`Stock insuficiente en el lote (disponible: ${lote.cantidad_disponible})`, 409);
      }

      const nuevoDisponible = lote.cantidad_disponible - qty;
      const nuevoEstado = nuevoDisponible === 0 ? 'AGOTADO' : 'ACTIVO';

      await inventarioRepository.updateLoteStock(conn, {
        loteId: lote.id,
        cantidadDisponible: nuevoDisponible,
        estado: nuevoEstado
      });

      await inventarioRepository.createMovimiento(conn, {
        producto_id: lote.producto_id,
        lote_id: lote.id,
        usuario_id: usuarioId,
        tipo: 'AJUSTE_MERMA',
        cantidad: qty,
        costo_unitario: lote.costo_unitario,
        referencia_tipo: 'AJUSTE_MANUAL',
        referencia_id: lote.id,
        motivo
      });

      await conn.commit();
      return inventarioRepository.findLoteById(lote.id);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async anularLote(loteId, { motivo }, usuarioId) {
    if (!motivo || motivo.length < 5) {
      throw new AppError('Debes especificar el motivo de anulación del lote (mínimo 5 caracteres)', 400);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const lote = await inventarioRepository.findLoteById(loteId, { conn, forUpdate: true });
      if (!lote) throw new AppError('Lote no encontrado', 404);
      if (lote.estado !== 'ACTIVO') {
        throw new AppError('Solo se pueden anular lotes en estado ACTIVO', 409);
      }
      // Preserva la integridad contable: impide anular lotes que ya tuvieron ventas o mermas parciales
      if (lote.cantidad_disponible !== lote.cantidad_inicial) {
        throw new AppError(
          'No se puede anular un lote que ya tiene salidas registradas; utiliza un ajuste de merma',
          409
        );
      }

      await inventarioRepository.updateLoteStock(conn, {
        loteId: lote.id,
        cantidadDisponible: 0,
        estado: 'ANULADO'
      });

      await inventarioRepository.createMovimiento(conn, {
        producto_id: lote.producto_id,
        lote_id: lote.id,
        usuario_id: usuarioId,
        tipo: 'AJUSTE_MERMA',
        cantidad: lote.cantidad_inicial,
        costo_unitario: lote.costo_unitario,
        referencia_tipo: 'ANULACION_LOTE',
        referencia_id: lote.id,
        motivo: `Anulación de lote: ${motivo}`
      });

      await conn.commit();
      return inventarioRepository.findLoteById(lote.id);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async listarKardex(query) {
    if (query.tipo && !TIPOS_MOVIMIENTO.has(query.tipo.toUpperCase())) {
      throw new AppError('Tipo de movimiento inválido', 400);
    }
    return inventarioRepository.findKardexPaginated({
      productoId: query.producto_id,
      loteId: query.lote_id,
      tipo: query.tipo,
      desde: query.desde,
      hasta: query.hasta,
      page: query.page,
      limit: query.limit
    });
  },

  async listarAlertasStockBajo() {
    return inventarioRepository.findAlertasStockBajo();
  },

  async obtenerValorizacion() {
    const productos = await inventarioRepository.getValorizacionPorProducto();
    const resumen = productos.reduce(
      (acc, p) => {
        acc.total_unidades += Number(p.stock_actual);
        acc.valor_total_fifo = roundMoney(acc.valor_total_fifo + Number(p.valor_inventario_fifo));
        acc.total_lotes_activos += Number(p.lotes_activos);
        if (Number(p.stock_actual) <= Number(p.stock_minimo)) acc.productos_en_alerta += 1;
        return acc;
      },
      { total_unidades: 0, valor_total_fifo: 0, total_lotes_activos: 0, productos_en_alerta: 0 }
    );

    return { resumen, productos };
  },

  async simularConsumoFifo({ producto_id, cantidad }) {
    const productoId = Number(producto_id);
    const qty = Number(cantidad);
    if (!Number.isInteger(productoId) || !Number.isInteger(qty) || qty <= 0) {
      throw new AppError('Producto y cantidad (entero mayor a 0) son obligatorios', 400);
    }

    const producto = await productosRepository.findById(productoId);
    if (!producto) throw new AppError('Producto no encontrado', 404);

    const lotes = await inventarioRepository.findActiveLotesReadOnly(productoId);
    const stockTotal = lotes.reduce((sum, l) => sum + l.cantidad_disponible, 0);
    if (stockTotal < qty) {
      throw new AppError(
        `Stock insuficiente para ${producto.nombre} (solicitado: ${qty}, disponible: ${stockTotal})`,
        409
      );
    }

    let restante = qty;
    let costoTotalCogs = 0;
    const desglose = [];

    for (const lote of lotes) {
      if (restante === 0) break;
      const tomar = Math.min(lote.cantidad_disponible, restante);
      const subtotalCosto = roundMoney(tomar * lote.costo_unitario);

      desglose.push({
        lote_id: lote.id,
        codigo_lote: lote.codigo_lote,
        fecha_ingreso: lote.fecha_ingreso,
        cantidad_a_consumir: tomar,
        stock_restante_proyectado: lote.cantidad_disponible - tomar,
        estado_proyectado: lote.cantidad_disponible - tomar === 0 ? 'AGOTADO' : 'ACTIVO',
        costo_unitario: lote.costo_unitario,
        subtotal_cogs: subtotalCosto
      });

      costoTotalCogs = roundMoney(costoTotalCogs + subtotalCosto);
      restante -= tomar;
    }

    const ingresoProyectado = roundMoney(qty * producto.precio_venta);
    return {
      producto: { id: producto.id, sku: producto.sku, nombre: producto.nombre, precio_venta: producto.precio_venta },
      cantidad_solicitada: qty,
      ingreso_venta_proyectado: ingresoProyectado,
      costo_total_cogs: costoTotalCogs,
      utilidad_bruta_proyectada: roundMoney(ingresoProyectado - costoTotalCogs),
      desglose_lotes: desglose
    };
  },

  async consumirStockFifo(conn, { productoId, cantidad, usuarioId, referenciaTipo, referenciaId, motivo }) {
    const lotes = await inventarioRepository.findActiveLotesForUpdate(conn, productoId);
    const stockTotal = lotes.reduce((sum, l) => sum + l.cantidad_disponible, 0);

    if (stockTotal < cantidad) {
      throw new AppError(
        `Stock insuficiente para el producto ID ${productoId} (solicitado: ${cantidad}, disponible: ${stockTotal})`,
        409
      );
    }

    let restante = cantidad;
    let costoTotalCogs = 0;
    const desgloseLotes = [];

    for (const lote of lotes) {
      if (restante === 0) break;

      const tomar = Math.min(lote.cantidad_disponible, restante);
      const nuevoDisponible = lote.cantidad_disponible - tomar;
      const nuevoEstado = nuevoDisponible === 0 ? 'AGOTADO' : 'ACTIVO';

      await inventarioRepository.updateLoteStock(conn, {
        loteId: lote.id,
        cantidadDisponible: nuevoDisponible,
        estado: nuevoEstado
      });

      await inventarioRepository.createMovimiento(conn, {
        producto_id: productoId,
        lote_id: lote.id,
        usuario_id: usuarioId,
        tipo: 'SALIDA_VENTA',
        cantidad: tomar,
        costo_unitario: lote.costo_unitario,
        referencia_tipo: referenciaTipo,
        referencia_id: referenciaId,
        motivo
      });

      desgloseLotes.push({
        lote_id: lote.id,
        cantidad: tomar,
        costo_unitario_lote: lote.costo_unitario
      });

      costoTotalCogs = roundMoney(costoTotalCogs + tomar * lote.costo_unitario);
      restante -= tomar;
    }

    return { costoTotalCogs, desgloseLotes };
  },

  async revertirConsumoFifo(conn, { productoId, desgloseLotes, usuarioId, referenciaTipo, referenciaId, motivo }) {
    for (const item of desgloseLotes) {
      const lote = await inventarioRepository.findLoteById(item.lote_id, { conn, forUpdate: true });
      if (!lote) continue;

      const nuevoDisponible = lote.cantidad_disponible + item.cantidad;
      await inventarioRepository.updateLoteStock(conn, {
        loteId: lote.id,
        cantidadDisponible: nuevoDisponible,
        estado: 'ACTIVO'
      });

      await inventarioRepository.createMovimiento(conn, {
        producto_id: productoId,
        lote_id: lote.id,
        usuario_id: usuarioId,
        tipo: 'DEVOLUCION',
        cantidad: item.cantidad,
        costo_unitario: item.costo_unitario_lote,
        referencia_tipo: referenciaTipo,
        referencia_id: referenciaId,
        motivo
      });
    }
  }
};