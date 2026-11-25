import crypto from 'crypto';
import { IPaymentGateway } from './IPaymentGateway.js';

export class QRSimuladoGateway extends IPaymentGateway {
  constructor() {
    super('QR_SIMULADO');
  }

  async iniciarPago({ codigoPedido, monto }) {
    const token = crypto.randomBytes(4).toString('hex').toUpperCase();
    const referenciaExterna = `QR-${codigoPedido}-${token}`;
    const expiraEn = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    return {
      estadoPago: 'PENDIENTE',
      estadoPedido: 'PENDIENTE_PAGO',
      referenciaExterna,
      datosRespuesta: {
        pasarela: 'QRSimuladoGateway',
        modo: 'SANDBOX',
        qr_payload: `COREJUSTO|PEDIDO:${codigoPedido}|MONTO:${monto}|REF:${referenciaExterna}`,
        expira_en: expiraEn,
        instrucciones: 'Escanea el código QR desde tu banca móvil y sube el comprobante o confirma el pago.'
      }
    };
  }

  async confirmarPago(transaccion, payload = {}) {
    return {
      estadoPago: 'APROBADO',
      estadoPedido: 'PAGADO',
      datosRespuesta: {
        ...(transaccion.datos_respuesta || {}),
        confirmado_en: new Date().toISOString(),
        origen_confirmacion: payload.origen || 'VALIDACION_OPERADOR',
        nota_validacion: payload.nota || 'Transferencia QR verificada'
      }
    };
  }
}