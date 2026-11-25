import { useEffect, useState } from 'react';
import { CheckCircle2, Truck, XCircle, ExternalLink } from 'lucide-react';
import { api } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatDate, formatMoney, getApiError } from '../../utils/format';
import { Spinner } from '../../components/ui/Spinner';

const STATUS_BADGE = {
  PENDIENTE_PAGO: 'bg-amber-100 text-amber-800',
  PAGADO: 'bg-emerald-100 text-emerald-800',
  EN_PREPARACION: 'bg-sky-100 text-sky-800',
  ENVIADO: 'bg-indigo-100 text-indigo-800',
  LISTO_RECOJO: 'bg-teal-100 text-teal-800',
  ENTREGADO: 'bg-emerald-200 text-emerald-900',
  CANCELADO: 'bg-rose-100 text-rose-800'
};

function getNextStates(order) {
  if (!order) return [];
  if (order.estado === 'PAGADO') return ['EN_PREPARACION'];
  if (order.estado === 'EN_PREPARACION') {
    return order.tipo_entrega === 'ENVIO' ? ['ENVIADO'] : ['LISTO_RECOJO'];
  }
  if (order.estado === 'ENVIADO' || order.estado === 'LISTO_RECOJO') return ['ENTREGADO'];
  return [];
}

export default function OrdersAdminPage() {
  const { hasPermission } = useAuth();
  const { config } = useTheme();

  const canUpdate = hasPermission('pedidos:actualizar_estado');
  const canCancel = hasPermission('pedidos:cancelar');

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOrders = async (estado = statusFilter) => {
    try {
      const { data } = await api.get('/pedidos', {
        params: { estado: estado || undefined }
      });
      setOrders(data.data || []);
    } catch (err) {
      setError(getApiError(err, 'No se pudieron cargar los pedidos'));
    } finally {
      setLoading(false);
    }
  };

  const inspectOrder = async (id) => {
    setError('');
    try {
      const { data } = await api.get(`/pedidos/${id}`);
      setSelected(data.data);
    } catch (err) {
      setError(getApiError(err, 'No se pudo cargar el detalle del pedido'));
    }
  };

  useEffect(() => {
    loadOrders(statusFilter);
  }, [statusFilter]);

  const handleValidatePayment = async (id) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/pedidos/${id}/validar-pago`, {
        nota: 'Pago verificado desde panel administrativo'
      });
      setSelected(data.data);
      setSuccess('Pago validado correctamente. El pedido pasó a estado PAGADO.');
      await loadOrders();
    } catch (err) {
      setError(getApiError(err, 'No se pudo validar el pago'));
    }
  };

  const handleAdvanceState = async (id, nextState) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/pedidos/${id}/estado`, { estado: nextState });
      setSelected(data.data);
      setSuccess(`Estado actualizado a ${nextState.replace(/_/g, ' ')}.`);
      await loadOrders();
    } catch (err) {
      setError(getApiError(err, 'No se pudo actualizar el estado'));
    }
  };

  const handleCancel = async (id) => {
    const motivo = window.prompt('Motivo de cancelación (se revertirán automáticamente los lotes FIFO):');
    if (!motivo) return;
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/pedidos/${id}/cancelar`, { motivo });
      setSelected(data.data);
      setSuccess('Pedido cancelado y stock restaurado a sus lotes FIFO originales.');
      await loadOrders();
    } catch (err) {
      setError(getApiError(err, 'No se pudo cancelar el pedido'));
    }
  };

  if (loading) return <Spinner text="Cargando pedidos..." />;

  const nextStates = getNextStates(selected);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Gestión de Pedidos y Pagos</h1>
          <p className="text-xs text-slate-500">Valida comprobantes QR/efectivo, gestiona despachos y audita el COGS por lote.</p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
        >
          <option value="">Todos los estados</option>
          {Object.keys(STATUS_BADGE).map((st) => (
            <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Pago</th>
                <th className="px-3 py-3">Total / COGS</th>
                <th className="px-3 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((ord) => (
                <tr
                  key={ord.id}
                  onClick={() => inspectOrder(ord.id)}
                  className={`cursor-pointer transition hover:bg-slate-50 ${
                    selected?.id === ord.id ? 'bg-emerald-50/60' : ''
                  }`}
                >
                  <td className="px-3 py-3 font-mono font-bold text-slate-900">
                    {ord.codigo_pedido}
                    <span className="block font-sans text-[10px] font-normal text-slate-400">
                      {formatDate(ord.creado_en)}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800">{ord.cliente_nombre}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">
                    {ord.pago_metodo?.replace(/_/g, ' ')}
                    <span className="block font-semibold">{ord.pago_estado}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-bold text-primary">{formatMoney(ord.total, config.moneda_simbolo)}</span>
                    <span className="block text-[10px] text-slate-500">
                      COGS: {formatMoney(ord.costo_ventas_cogs, config.moneda_simbolo)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[ord.estado]}`}>
                      {ord.estado.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          {!selected ? (
            <p className="py-12 text-center text-xs text-slate-500">
              Selecciona un pedido de la tabla para auditar lotes FIFO, validar pago o avanzar su estado.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="font-mono text-base font-extrabold text-slate-900">{selected.codigo_pedido}</h2>
                  <p className="text-xs text-slate-500">
                    {selected.cliente_nombre} · {selected.cliente_email}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_BADGE[selected.estado]}`}>
                  {selected.estado.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
                <p>
                  <strong>Entrega:</strong>{' '}
                  {selected.tipo_entrega === 'ENVIO'
                    ? selected.direccion_snapshot
                    : `Recojo en tienda · Código ${selected.codigo_retiro}`}
                </p>
                <p>
                  <strong>Pago:</strong> {selected.pago?.metodo} ({selected.pago?.estado})
                </p>
                <p>
                  <strong>Utilidad Bruta Pedido:</strong>{' '}
                  <span className="font-bold text-emerald-700">
                    {formatMoney(selected.subtotal - selected.costo_ventas_cogs, config.moneda_simbolo)}
                  </span>
                </p>
                {selected.pago?.comprobante_url && (
                  <a
                    href={selected.pago.comprobante_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 pt-1 font-semibold text-secondary hover:underline"
                  >
                    Ver comprobante subido <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Desglose de Ítems y Lotes FIFO Consumidos
                </p>
                {(selected.items || []).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-2.5 text-xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{item.cantidad}x {item.nombre_producto_snapshot}</span>
                      <span>{formatMoney(item.subtotal, config.moneda_simbolo)}</span>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                      {(item.lotes_consumidos || []).map((l, idx) => (
                        <li key={idx} className="font-mono">
                          ↳ {l.codigo_lote}: {l.cantidad} u. @ {formatMoney(l.costo_unitario_lote, config.moneda_simbolo)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {canUpdate && selected.estado === 'PENDIENTE_PAGO' && (
                  <button
                    type="button"
                    onClick={() => handleValidatePayment(selected.id)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-white"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Validar Pago
                  </button>
                )}

                {canUpdate &&
                  nextStates.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleAdvanceState(selected.id, st)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white"
                    >
                      <Truck className="h-4 w-4" />
                      Pasar a {st.replace(/_/g, ' ')}
                    </button>
                  ))}

                {canCancel && !['ENTREGADO', 'CANCELADO'].includes(selected.estado) && (
                  <button
                    type="button"
                    onClick={() => handleCancel(selected.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancelar + Revertir FIFO
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}