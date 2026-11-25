import crypto from 'crypto';
import { IPaymentGateway } from './IPaymentGateway.js';
import { AppError } from '../utils/AppError.js';

function isValidLuhn(cardNumber) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let digit = Number(cardNumber[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function isFutureExpiry(expiracion) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(expiracion || '').trim());
  if (!match) return false;

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return year > currentYear || (year === currentYear && month >= currentMonth);
}

function detectBrand(digits) {
  if (digits.startsWith('4')) return 'VISA';
  if (/^5[1-5]/.test(digits)) return 'MASTERCARD';
  return 'TARJETA';
}

export class TarjetaSimuladaGateway extends IPaymentGateway {
  constructor() {
    super('TARJETA_SIMULADA');
  }

  async iniciarPago({ codigoPedido, monto, datosPago = {} }) {
    const digits = String(datosPago.numero_tarjeta || '').replace(/\s+/g, '');
    const titular = String(datosPago.titular || '').trim();
    const cvv = String(datosPago.cvv || '').trim();

    if (!/^\d{16}$/.test(digits) || !isValidLuhn(digits)) {
      throw new AppError('Número de tarjeta inválido (no supera validación Luhn)', 400);
    }
    if (!titular || titular.length < 3) {
      throw new AppError('El nombre del titular de la tarjeta es obligatorio', 400);
    }
    if (!isFutureExpiry(datosPago.expiracion)) {
      throw new AppError('Fecha de expiración inválida o vencida (formato MM/AA)', 400);
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      throw new AppError('CVV inválido (3 o 4 dígitos)', 400);
    }

    // Regla sandbox para defensa: tarjetas Luhn-válidas terminadas en 0000 simulan rechazo bancario y disparan ROLLBACK FIFO
    if (digits.endsWith('0000')) {
      throw new AppError('Pago rechazado por el banco emisor: fondos insuficientes', 402);
    }

    const authCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const referenciaExterna = `CARD-${codigoPedido}-${authCode}`;

    return {
      estadoPago: 'APROBADO',
      estadoPedido: 'PAGADO',
      referenciaExterna,
      datosRespuesta: {
        pasarela: 'TarjetaSimuladaGateway',
        modo: 'SANDBOX',
        marca: detectBrand(digits),
        ultimos_4: digits.slice(-4),
        titular,
        codigo_autorizacion: authCode,
        monto_cobrado: monto,
        procesado_en: new Date().toISOString()
      }
    };
  }

  async confirmarPago(transaccion) {
    return {
      estadoPago: transaccion.estado,
      estadoPedido: 'PAGADO',
      datosRespuesta: transaccion.datos_respuesta
    };
  }
}