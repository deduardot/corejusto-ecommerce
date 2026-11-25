export class IPaymentGateway {
  constructor(codigoMetodo) {
    this.codigoMetodo = codigoMetodo;
  }

  async iniciarPago(_contexto) {
    throw new Error('Método iniciarPago() debe ser implementado por cada estrategia');
  }

  async confirmarPago(_transaccion, _payload) {
    throw new Error('Método confirmarPago() debe ser implementado por cada estrategia');
  }
}