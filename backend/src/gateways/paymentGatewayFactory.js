import { TarjetaSimuladaGateway } from './TarjetaSimuladaGateway.js';
import { QRSimuladoGateway } from './QRSimuladoGateway.js';
import { EfectivoTiendaGateway } from './EfectivoTiendaGateway.js';
import { AppError } from '../utils/AppError.js';

const GATEWAYS = {
  TARJETA_SIMULADA: new TarjetaSimuladaGateway(),
  QR_SIMULADO: new QRSimuladoGateway(),
  EFECTIVO_TIENDA: new EfectivoTiendaGateway()
};

export function getPaymentGateway(metodo) {
  const key = String(metodo || '').toUpperCase();
  const gateway = GATEWAYS[key];
  if (!gateway) {
    throw new AppError(
      'Método de pago no soportado. Usa TARJETA_SIMULADA, QR_SIMULADO o EFECTIVO_TIENDA',
      400
    );
  }
  return gateway;
}