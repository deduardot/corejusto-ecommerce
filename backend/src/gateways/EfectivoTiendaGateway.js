import crypto from 'crypto';
import { IPaymentGateway } from './IPaymentGateway.js';
import { AppError } from '../utils/AppError.js';

export class EfectivoTiendaGateway extends IPaymentGateway {
  constructor() {
    super('EFECTIVO_TIENDA');
  }

  async iniciarPago({ codigoPedido, monto, tipoEntrega, codigoRetiro }) {
    if (tipoEntrega !== 'RECOJO_TIENDA') {
      throw new AppError('El pago en efectivo en tienda solo está disponible para Recojo en Tienda', 400);
    }

    const ref = `CASH-${codigoPedido}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    return {
      estadoPago: 'PENDIENTE',
      estadoPedido: 'PENDIENTE_PAGO',
      referenciaExterna: ref,
      datosRespuesta: {
        pasarela: 'EfectivoTiendaGateway',
        modo: 'PRESENCIAL',
        codigo_retiro: codigoRetiro,
        monto_a_pagar: monto,
        instrucciones: 'Presenta tu código de retiro en caja al recoger tus componentes.'
      }
    };
  }

  async confirmarPago(transaccion, payload = {}) {
    return {
      estadoPago: 'APROBADO',
      estadoPedido: 'PAGADO',
      datosRespuesta: {
        ...(transaccion.datos_respuesta || {}),
        cobrado_en: new Date().toISOString(),
        origen_confirmacion: 'CAJA_TIENDA',
        nota_validacion: payload.nota || 'Pago recibido en efectivo en caja'
      }
    };
  }
}