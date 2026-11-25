import crypto from 'crypto';
import { pool } from '../config/db.js';
import { pedidosRepository } from '../repositories/pedidos.repository.js';
import { direccionesRepository } from '../repositories/direcciones.repository.js';
import { inventarioService } from './inventario.service.js';
import { getPaymentGateway } from '../gateways/paymentGatewayFactory.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { AppError } from '../utils/AppError.js';

const TIPOS_ENTREGA = new Set(['ENVIO', 'RECOJO_TIENDA']);
const TRANSICIONES_VALIDAS = {
  PENDIENTE_PAGO: ['PAGADO'],
  PAGADO: ['EN_PREPARACION'],
  EN_PREPARACION: ['ENVIADO', 'LISTO_RECOJO'],
  ENVIADO: ['ENTREGADO'],
  LISTO_RECOJO: ['ENTREGADO'],
  ENTREGADO: [],
  CANCELADO: []
};

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function generateOrderCode() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PED-${datePart}-${rand}`;
}

function generatePickupCode() {
  return `RET-${Math.floor(100000 + Math.random() * 900000)}`;
}

function normalizeCartItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new AppError('El pedido debe contener al menos un producto', 400);
  }

  const grouped = new Map();
  for (const item of rawItems) {
    const productoId = Number(item.producto_id);
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(productoId) || !Number.isInteger(cantidad) || cantidad <= 0) {
      throw new AppError('Cada ítem debe tener un producto_id y una cantidad entera mayor a 0', 400);
    }
    grouped.set(productoId, (grouped.get(productoId) || 0) + cantidad);
  }

  return [...grouped.entries()].map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
}

function stripSensitiveFinancialFields(pedido) {
  const { costo_ventas_cogs: _omitted, ...publicOrder } = pedido;
  return {
    ...publicOrder,
    items: (pedido.items || []).map(({ lotes_consumidos: _lotes, ...item }) => item)
  };
}

export const pedidosService = {
  async crearPedido(usuarioId, payload) {
    const tipoEntrega = String(payload.tipo_entrega || '').toUpperCase();
    if (!TIPOS_ENTREGA.has(tipoEntrega)) {
      throw new AppError('Tipo de entrega inválido (ENVIO o RECOJO_TIENDA)', 400);
    }

    const items = normalizeCartItems(payload.items);
    const gateway = getPaymentGateway(payload.metodo_pago);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let direccionEnvioId = null;
      let direccionSnapshot = null;
      let codigoRetiro = null;
      let costoEnvio = 0;

      if (tipoEntrega === 'ENVIO') {
        const dirId = Number(payload.direccion_envio_id);
        if (!Number.isInteger(dirId)) {
          throw new AppError('Debes seleccionar una dirección de envío válida', 400);
        }
        const dir = await direccionesRepository.findByIdAndUser(dirId, usuarioId, conn);
        if (!dir) {
          throw new AppError('La dirección seleccionada no pertenece a tu cuenta', 404);
        }
        if (!dir.zona_activa) {
          throw new AppError('La zona de envío de esa dirección ya no está disponible', 400);
        }

        direccionEnvioId = dir.id;
        costoEnvio = roundMoney(Number(dir.costo_envio));
        direccionSnapshot = `${dir.alias}: ${dir.direccion_exacta}${dir.referencia ? ` (${dir.referencia})` : ''} — ${dir.zona_nombre}`;
      } else {
        codigoRetiro = generatePickupCode();
      }

      const resolvedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const producto = await pedidosRepository.findProductForCheckout(conn, item.producto_id);
        if (!producto || !producto.activo) {
          throw new AppError(`El producto ID ${item.producto_id} no existe o no está disponible`, 404);
        }

        const itemSubtotal = roundMoney(Number(producto.precio_venta) * item.cantidad);
        subtotal = roundMoney(subtotal + itemSubtotal);

        resolvedItems.push({
          producto_id: producto.id,
          nombre: producto.nombre,
          precio_unitario: roundMoney(Number(producto.precio_venta)),
          cantidad: item.cantidad,
          subtotal: itemSubtotal
        });
      }

      const total = roundMoney(subtotal + costoEnvio);
      const codigoPedido = generateOrderCode();

      const pedidoId = await pedidosRepository.createPedido(conn, {
        codigo_pedido: codigoPedido,
        usuario_id: usuarioId,
        tipo_entrega: tipoEntrega,
        direccion_envio_id: direccionEnvioId,
        direccion_snapshot: direccionSnapshot,
        codigo_retiro: codigoRetiro,
        subtotal,
        costo_envio: costoEnvio,
        total,
        costo_ventas_cogs: 0,
        estado: 'PENDIENTE_PAGO',
        notas: payload.notas || null
      });

      let costoVentasCogsTotal = 0;

      for (const item of resolvedItems) {
        const { costoTotalCogs, desgloseLotes } = await inventarioService.consumirStockFifo(conn, {
          productoId: item.producto_id,
          cantidad: item.cantidad,
          usuarioId,
          referenciaTipo: 'PEDIDO',
          referenciaId: pedidoId,
          motivo: `Venta checkout ${codigoPedido}`
        });

        const detalleId = await pedidosRepository.createDetallePedido(conn, {
          pedido_id: pedidoId,
          producto_id: item.producto_id,
          nombre_producto_snapshot: item.nombre,
          cantidad: item.cantidad,
          precio_unitario_snapshot: item.precio_unitario,
          subtotal: item.subtotal
        });

        for (const loteConsumo of desgloseLotes) {
          await pedidosRepository.createDetallePedidoLote(conn, {
            detalle_pedido_id: detalleId,
            lote_id: loteConsumo.lote_id,
            cantidad: loteConsumo.cantidad,
            costo_unitario_lote: loteConsumo.costo_unitario_lote
          });
        }

        costoVentasCogsTotal = roundMoney(costoVentasCogsTotal + costoTotalCogs);
      }

      // La pasarela corre dentro de la transacción: un rechazo bancario ejecuta ROLLBACK y deja los lotes intactos
      const resultadoPago = await gateway.iniciarPago({
        pedidoId,
        codigoPedido,
        monto: total,
        tipoEntrega,
        codigoRetiro,
        datosPago: payload.datos_pago
      });

      await pedidosRepository.updatePedidoAfterFifo(conn, pedidoId, {
        costoVentasCogs: costoVentasCogsTotal,
        estado: resultadoPago.estadoPedido
      });

      await pedidosRepository.createTransaccionPago(conn, {
        pedido_id: pedidoId,
        metodo: gateway.codigoMetodo,
        referencia_externa: resultadoPago.referenciaExterna,
        monto: total,
        estado: resultadoPago.estadoPago,
        datos_respuesta: resultadoPago.datosRespuesta
      });

      await conn.commit();

      const created = await pedidosRepository.findFullById(pedidoId);
      return stripSensitiveFinancialFields(created);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async listMine(usuarioId) {
    const rows = await pedidosRepository.findAll({ usuarioId });
    return rows.map(({ costo_ventas_cogs: _omitted, ...row }) => row);
  },

  async listAdmin(query) {
    return pedidosRepository.findAll({ estado: query.estado });
  },

  async getDetail(pedidoId, user) {
    const pedido = await pedidosRepository.findFullById(pedidoId);
    if (!pedido) throw new AppError('Pedido no encontrado', 404);

    const isAdminViewer = user.permisos.includes('pedidos:ver_todos');
    if (!isAdminViewer && pedido.usuario_id !== user.id) {
      throw new AppError('No tienes permiso para consultar este pedido', 403);
    }

    return isAdminViewer ? pedido : stripSensitiveFinancialFields(pedido);
  },

  async subirComprobanteQr(pedidoId, usuarioId, file) {
    if (!file) throw new AppError('Debes adjuntar la imagen del comprobante', 400);

    const pedido = await pedidosRepository.findFullById(pedidoId);
    if (!pedido) throw new AppError('Pedido no encontrado', 404);
    if (pedido.usuario_id !== usuarioId) {
      throw new AppError('No tienes permiso para modificar este pedido', 403);
    }
    if (!pedido.pago || pedido.pago.metodo !== 'QR_SIMULADO' || pedido.pago.estado !== 'PENDIENTE') {
      throw new AppError('Solo se puede subir comprobante para pagos QR pendientes', 409);
    }

    const comprobanteUrl = await uploadImageBuffer(file.buffer, 'corejusto/comprobantes');
    await pedidosRepository.updateComprobanteUrl(pedido.pago.id, comprobanteUrl);

    const updated = await pedidosRepository.findFullById(pedidoId);
    return stripSensitiveFinancialFields(updated);
  },

  async simularConfirmacionQr(pedidoId, usuarioId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const pedido = await pedidosRepository.findByIdForUpdate(conn, pedidoId);
      if (!pedido) throw new AppError('Pedido no encontrado', 404);
      if (pedido.usuario_id !== usuarioId) {
        throw new AppError('No tienes permiso para confirmar este pedido', 403);
      }
      if (pedido.estado !== 'PENDIENTE_PAGO') {
        throw new AppError('El pedido ya no está pendiente de pago', 409);
      }

      const transaccion = await pedidosRepository.findTransaccionByPedidoId(pedidoId, conn);
      if (!transaccion || transaccion.metodo !== 'QR_SIMULADO') {
        throw new AppError('Esta simulación solo aplica a pedidos con método QR_SIMULADO', 400);
      }

      const gateway = getPaymentGateway(transaccion.metodo);
      const confirmation = await gateway.confirmarPago(transaccion, {
        origen: 'WEBHOOK_BANCO_SIMULADO',
        nota: 'Confirmación bancaria automática en modo pruebas'
      });

      await pedidosRepository.updateTransaccionPago(conn, transaccion.id, {
        estado: confirmation.estadoPago,
        datosRespuesta: confirmation.datosRespuesta,
        validadoPorUsuarioId: null
      });

      await pedidosRepository.updatePedidoEstado(conn, pedidoId, confirmation.estadoPedido);
      await conn.commit();

      const updated = await pedidosRepository.findFullById(pedidoId);
      return stripSensitiveFinancialFields(updated);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async validarPagoAdmin(pedidoId, operadorId, payload = {}) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const pedido = await pedidosRepository.findByIdForUpdate(conn, pedidoId);
      if (!pedido) throw new AppError('Pedido no encontrado', 404);
      if (pedido.estado !== 'PENDIENTE_PAGO') {
        throw new AppError('Solo se pueden validar pagos de pedidos en estado PENDIENTE_PAGO', 409);
      }

      const transaccion = await pedidosRepository.findTransaccionByPedidoId(pedidoId, conn);
      if (!transaccion || transaccion.estado !== 'PENDIENTE') {
        throw new AppError('La transacción de pago no se encuentra pendiente', 409);
      }

      const gateway = getPaymentGateway(transaccion.metodo);
      const confirmation = await gateway.confirmarPago(transaccion, {
        origen: 'VALIDACION_OPERADOR',
        nota: payload.nota
      });

      await pedidosRepository.updateTransaccionPago(conn, transaccion.id, {
        estado: confirmation.estadoPago,
        datosRespuesta: confirmation.datosRespuesta,
        validadoPorUsuarioId: operadorId
      });

      await pedidosRepository.updatePedidoEstado(conn, pedidoId, confirmation.estadoPedido);
      await conn.commit();

      return pedidosRepository.findFullById(pedidoId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async actualizarEstado(pedidoId, nuevoEstado) {
    const target = String(nuevoEstado || '').toUpperCase();
    if (!TRANSICIONES_VALIDAS[target]) {
      throw new AppError('Estado de pedido inválido', 400);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const pedido = await pedidosRepository.findByIdForUpdate(conn, pedidoId);
      if (!pedido) throw new AppError('Pedido no encontrado', 404);

      const allowed = TRANSICIONES_VALIDAS[pedido.estado] || [];
      if (!allowed.includes(target)) {
        throw new AppError(
          `Transición no permitida: de ${pedido.estado} no se puede pasar directamente a ${target}`,
          409
        );
      }

      if (target === 'ENVIADO' && pedido.tipo_entrega !== 'ENVIO') {
        throw new AppError('Un pedido de Recojo en Tienda debe pasar a LISTO_RECOJO, no a ENVIADO', 400);
      }
      if (target === 'LISTO_RECOJO' && pedido.tipo_entrega !== 'RECOJO_TIENDA') {
        throw new AppError('Un pedido con Envío a domicilio debe pasar a ENVIADO, no a LISTO_RECOJO', 400);
      }

      await pedidosRepository.updatePedidoEstado(conn, pedidoId, target);
      await conn.commit();

      return pedidosRepository.findFullById(pedidoId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async cancelarPedido(pedidoId, user, payload = {}) {
    const motivo = payload.motivo || 'Cancelación solicitada';
    const isAdminCanceller = user.permisos.includes('pedidos:cancelar');

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const pedido = await pedidosRepository.findByIdForUpdate(conn, pedidoId);
      if (!pedido) throw new AppError('Pedido no encontrado', 404);

      if (!isAdminCanceller) {
        if (pedido.usuario_id !== user.id) {
          throw new AppError('No tienes permiso para cancelar este pedido', 403);
        }
        if (pedido.estado !== 'PENDIENTE_PAGO') {
          throw new AppError('Solo puedes cancelar pedidos propios que aún estén pendientes de pago', 409);
        }
      }

      if (pedido.estado === 'CANCELADO') {
        throw new AppError('El pedido ya se encuentra cancelado', 409);
      }
      if (pedido.estado === 'ENTREGADO') {
        throw new AppError('No se puede cancelar un pedido que ya fue entregado', 409);
      }

      const detalles = await pedidosRepository.findDetallesConLotes(conn, pedidoId);
      for (const item of detalles) {
        await inventarioService.revertirConsumoFifo(conn, {
          productoId: item.producto_id,
          desgloseLotes: item.lotes_consumidos,
          usuarioId: user.id,
          referenciaTipo: 'CANCELACION_PEDIDO',
          referenciaId: pedidoId,
          motivo: `Reversión FIFO por cancelación ${pedido.codigo_pedido}: ${motivo}`
        });
      }

      await pedidosRepository.updatePedidoEstado(conn, pedidoId, 'CANCELADO');

      const transaccion = await pedidosRepository.findTransaccionByPedidoId(pedidoId, conn);
      if (transaccion) {
        const estadoPagoFinal = transaccion.estado === 'APROBADO' ? 'REEMBOLSADO' : 'RECHAZADO';
        await pedidosRepository.updateTransaccionPago(conn, transaccion.id, {
          estado: estadoPagoFinal,
          datosRespuesta: {
            ...(transaccion.datos_respuesta || {}),
            cancelado_en: new Date().toISOString(),
            motivo_cancelacion: motivo
          },
          validadoPorUsuarioId: isAdminCanceller ? user.id : transaccion.validado_por_usuario_id
        });
      }

      await conn.commit();

      const updated = await pedidosRepository.findFullById(pedidoId);
      return isAdminCanceller ? updated : stripSensitiveFinancialFields(updated);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async obtenerResumenFinanciero() {
    const data = await pedidosRepository.getResumenFinanciero();
    const ingresos = Number(data.totales.ingresos_productos) || 0;
    const utilidad = Number(data.totales.utilidad_bruta_real) || 0;
    const margenRealPct = ingresos > 0 ? roundMoney((utilidad / ingresos) * 100) : 0;

    return {
      ...data.totales,
      margen_bruto_real_pct: margenRealPct,
      por_estado: data.por_estado
    };
  }
};