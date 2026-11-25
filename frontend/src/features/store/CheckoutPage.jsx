import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Store, CreditCard, QrCode, Banknote, Plus } from 'lucide-react';
import { api } from '../../api/axios';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { formatMoney, getApiError } from '../../utils/format';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { config } = useTheme();
  const navigate = useNavigate();

  const [tipoEntrega, setTipoEntrega] = useState('ENVIO');
  const [direcciones, setDirecciones] = useState([]);
  const [direccionId, setDireccionId] = useState('');
  const [showNewDir, setShowNewDir] = useState(false);
  const [newDir, setNewDir] = useState({
    zona_envio_id: '',
    alias: '',
    direccion_exacta: '',
    referencia: '',
    es_principal: false
  });

  const [metodoPago, setMetodoPago] = useState('QR_SIMULADO');
  // Los datos de tarjeta viven solo en memoria durante el envío y nunca se guardan en localStorage
  const [card, setCard] = useState({ numero_tarjeta: '', titular: '', expiracion: '', cvv: '' });
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDirecciones = async () => {
    try {
      const { data } = await api.get('/direcciones');
      const list = data.data || [];
      setDirecciones(list);
      if (list.length > 0 && !direccionId) {
        setDireccionId(String(list[0].id));
      }
    } catch {
      setDirecciones([]);
    }
  };

  useEffect(() => {
    loadDirecciones();
  }, []);

  useEffect(() => {
    if (tipoEntrega === 'ENVIO' && metodoPago === 'EFECTIVO_TIENDA') {
      setMetodoPago('QR_SIMULADO');
    }
  }, [tipoEntrega, metodoPago]);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium text-slate-600">No tienes productos en tu carrito.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-secondary hover:underline">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const selectedDir = direcciones.find((d) => String(d.id) === String(direccionId));
  const costoEnvio = tipoEntrega === 'ENVIO' ? Number(selectedDir?.costo_envio || 0) : 0;
  const total = subtotal + costoEnvio;

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/direcciones', {
        ...newDir,
        zona_envio_id: Number(newDir.zona_envio_id)
      });
      await loadDirecciones();
      setDireccionId(String(data.data.id));
      setShowNewDir(false);
      setNewDir({ zona_envio_id: '', alias: '', direccion_exacta: '', referencia: '', es_principal: false });
    } catch (err) {
      setError(getApiError(err, 'No se pudo guardar la dirección'));
    }
  };

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    setError('');

    if (tipoEntrega === 'ENVIO' && !direccionId) {
      setError('Selecciona o registra una dirección de envío');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tipo_entrega: tipoEntrega,
        direccion_envio_id: tipoEntrega === 'ENVIO' ? Number(direccionId) : undefined,
        metodo_pago: metodoPago,
        items: items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
        notas: notas || undefined,
        datos_pago: metodoPago === 'TARJETA_SIMULADA' ? card : undefined
      };

      const { data } = await api.post('/pedidos', payload);
      clearCart();
      navigate(`/mis-pedidos?reciente=${data.data.id}`, { replace: true });
    } catch (err) {
      setError(getApiError(err, 'No se pudo procesar tu pedido'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={handleConfirmOrder} className="space-y-6 lg:col-span-2">
        <h1 className="text-xl font-bold text-slate-900">Finalizar compra</h1>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">1. Modalidad de entrega</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTipoEntrega('ENVIO')}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                tipoEntrega === 'ENVIO' ? 'border-secondary bg-emerald-50/50' : 'border-slate-200'
              }`}
            >
              <Truck className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm font-bold">Envío a domicilio</p>
                <p className="text-xs text-slate-500">Tarifa según tu zona</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTipoEntrega('RECOJO_TIENDA')}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                tipoEntrega === 'RECOJO_TIENDA' ? 'border-secondary bg-emerald-50/50' : 'border-slate-200'
              }`}
            >
              <Store className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm font-bold">Recojo en tienda (Gratis)</p>
                <p className="text-xs text-slate-500">Genera código de retiro</p>
              </div>
            </button>
          </div>

          {tipoEntrega === 'ENVIO' ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Selecciona tu dirección</p>
                <button
                  type="button"
                  onClick={() => setShowNewDir((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {showNewDir ? 'Cancelar' : 'Nueva dirección'}
                </button>
              </div>

              {showNewDir && (
                <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Alias (Ej: Casa, Trabajo)"
                      value={newDir.alias}
                      onChange={(e) => setNewDir({ ...newDir, alias: e.target.value })}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                    />
                    <select
                      value={newDir.zona_envio_id}
                      onChange={(e) => setNewDir({ ...newDir, zona_envio_id: e.target.value })}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                    >
                      <option value="">Selecciona zona de envío</option>
                      {(config.zonas_envio || []).map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.nombre} ({formatMoney(z.costo_envio, config.moneda_simbolo)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Dirección exacta (calle, número, anillo)"
                    value={newDir.direccion_exacta}
                    onChange={(e) => setNewDir({ ...newDir, direccion_exacta: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Referencia (opcional)"
                    value={newDir.referencia}
                    onChange={(e) => setNewDir({ ...newDir, referencia: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAddress}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    Guardar dirección
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {direcciones.map((dir) => (
                  <label
                    key={dir.id}
                    className={`flex cursor-pointer items-start justify-between rounded-xl border p-3 text-xs ${
                      String(direccionId) === String(dir.id) ? 'border-secondary bg-emerald-50/40' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex gap-2.5">
                      <input
                        type="radio"
                        name="direccion"
                        checked={String(direccionId) === String(dir.id)}
                        onChange={() => setDireccionId(String(dir.id))}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{dir.alias} · {dir.zona_nombre}</p>
                        <p className="text-slate-600">{dir.direccion_exacta}</p>
                        {dir.referencia && <p className="text-slate-400">{dir.referencia}</p>}
                      </div>
                    </div>
                    <span className="font-bold text-primary">
                      {formatMoney(dir.costo_envio, config.moneda_simbolo)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700">
              <strong>Punto de retiro:</strong> {config.direccion_tienda}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">2. Método de pago (Pasarela Desacoplada)</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setMetodoPago('QR_SIMULADO')}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left ${
                metodoPago === 'QR_SIMULADO' ? 'border-secondary bg-emerald-50/50' : 'border-slate-200'
              }`}
            >
              <QrCode className="h-5 w-5 text-secondary" />
              <span className="text-xs font-bold">Pago QR Simple</span>
              <span className="text-[11px] text-slate-500">Genera QR dinámico</span>
            </button>

            <button
              type="button"
              onClick={() => setMetodoPago('TARJETA_SIMULADA')}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left ${
                metodoPago === 'TARJETA_SIMULADA' ? 'border-secondary bg-emerald-50/50' : 'border-slate-200'
              }`}
            >
              <CreditCard className="h-5 w-5 text-secondary" />
              <span className="text-xs font-bold">Tarjeta Crédito/Débito</span>
              <span className="text-[11px] text-slate-500">Validación Luhn</span>
            </button>

            <button
              type="button"
              disabled={tipoEntrega !== 'RECOJO_TIENDA'}
              onClick={() => setMetodoPago('EFECTIVO_TIENDA')}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
                metodoPago === 'EFECTIVO_TIENDA' ? 'border-secondary bg-emerald-50/50' : 'border-slate-200'
              }`}
            >
              <Banknote className="h-5 w-5 text-secondary" />
              <span className="text-xs font-bold">Efectivo en Tienda</span>
              <span className="text-[11px] text-slate-500">Solo recojo en tienda</span>
            </button>
          </div>

          {metodoPago === 'TARJETA_SIMULADA' && (
            <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Número de tarjeta (16 dígitos)</label>
                <input
                  type="text"
                  required
                  maxLength={19}
                  value={card.numero_tarjeta}
                  onChange={(e) => setCard({ ...card, numero_tarjeta: e.target.value })}
                  placeholder="4242 4242 4242 4242"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Titular de la tarjeta</label>
                <input
                  type="text"
                  required
                  value={card.titular}
                  onChange={(e) => setCard({ ...card, titular: e.target.value })}
                  placeholder="Nombre como aparece en la tarjeta"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Expiración (MM/AA)</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={card.expiracion}
                  onChange={(e) => setCard({ ...card, expiracion: e.target.value })}
                  placeholder="12/28"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">CVV</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                  placeholder="123"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Notas del pedido (opcional)</label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Llamar 10 minutos antes de entregar"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-secondary py-3.5 text-sm font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
        >
          {submitting
            ? 'Procesando transacción FIFO...'
            : `Confirmar pedido · ${formatMoney(total, config.moneda_simbolo)}`}
        </button>
      </form>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Tu pedido ({items.length})</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-xs">
          {items.map((i) => (
            <li key={i.producto_id} className="flex justify-between py-2.5">
              <span className="pr-2 text-slate-700">
                {i.cantidad}x {i.nombre}
              </span>
              <span className="shrink-0 font-semibold text-slate-900">
                {formatMoney(i.precio_venta * i.cantidad, config.moneda_simbolo)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal, config.moneda_simbolo)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Envío</span>
            <span>{costoEnvio === 0 ? 'Gratis' : formatMoney(costoEnvio, config.moneda_simbolo)}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-extrabold text-primary">
            <span>Total</span>
            <span>{formatMoney(total, config.moneda_simbolo)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}