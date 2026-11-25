import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Package, CheckCircle2, Upload, XCircle } from 'lucide-react';
import { api } from '../../api/axios';
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

export default function MyOrdersPage() {
  const { config } = useTheme();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [error, setError] = useState('');

  const loadOrderDetail = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/pedidos/${id}`);
      setSelectedOrder(data.data);
    } catch (err) {
      setError(getApiError(err, 'No se pudo cargar el detalle del pedido'));
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/pedidos/mios');
      const list = data.data || [];
      setOrders(list);

      const recentId = searchParams.get('reciente');
      const targetId = recentId ? Number(recentId) : list[0]?.id;
      if (targetId) await loadOrderDetail(targetId);
    } catch (err) {
      setError(getApiError(err, 'No se pudieron cargar tus pedidos'));
    } finally {
      setLoading(false);
    }
  }, [searchParams, loadOrderDetail]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSimulateQr = async (pedidoId) => {
    setError('');
    setActionMsg('');
    try {
      const { data } = await api.post(`/pedidos/${pedidoId}/pago/simular-qr`);
      setSelectedOrder(data.data);
      setActionMsg('Pago QR confirmado en modo simulación bancaria.');
      await loadOrders();
    } catch (err) {
      setError(getApiError(err, 'No se pudo confirmar el pago QR'));
    }
  };

  const handleUploadReceipt = async (pedidoId, file) => {
    if (!file) return;
    setError('');
    setActionMsg('');
    const formData = new FormData();
    formData.append('comprobante', file);
    try {
      const { data } = await api.post(`/pedidos/${pedidoId}/pago/comprobante`, formData);
      setSelectedOrder(data.data);
      setActionMsg('Comprobante subido correctamente. Un operador validará tu pago.');
    } catch (err) {
      setError(getApiError(err, 'Error al subir el comprobante'));
    }
  };

  const handleCancelOrder = async (pedidoId) => {
    setError('');
    setActionMsg('');
    try {
      const { data } = await api.patch(`/pedidos/${pedidoId}/cancelar`, {
        motivo: 'Cancelado por el cliente antes de completar pago'
      });
      setSelectedOrder(data.data);
      setActionMsg('Pedido cancelado y stock restaurado.');
      await loadOrders();
    } catch (err) {
      setError(getApiError(err, 'No se pudo cancelar el pedido'));
    }
  };

  if (loading) return <Spinner text="Cargando tus pedidos..." />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Mis pedidos</h1>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {actionMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {actionMsg}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-600">Aún no realizaste ningún pedido.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2.5">
            {orders.map((ord) => (
              <button
                key={ord.id}
                type="button"
                onClick={() => loadOrderDetail(ord.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedOrder?.id === ord.id
                    ? 'border-secondary bg-white shadow-sm ring-1 ring-secondary'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900">{ord.codigo_pedido}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[ord.estado]}`}>
                    {ord.estado.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{formatDate(ord.creado_en)}</span>
                  <span className="font-bold text-primary">{formatMoney(ord.total, config.moneda_simbolo)}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedOrder && (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-mono text-lg font-bold text-slate-900">{selectedOrder.codigo_pedido}</h2>
                  <p className="text-xs text-slate-500">{formatDate(selectedOrder.creado_en)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_BADGE[selectedOrder.estado]}`}>
                  {selectedOrder.estado.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid gap-4 text-xs sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="font-bold text-slate-700">Entrega</p>
                  <p className="mt-1 text-slate-600">
                    {selectedOrder.tipo_entrega === 'ENVIO'
                      ? selectedOrder.direccion_snapshot
                      : `Recojo en tienda · Código de retiro: ${selectedOrder.codigo_retiro}`}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="font-bold text-slate-700">Pago</p>
                  <p className="mt-1 text-slate-600">
                    {selectedOrder.pago?.metodo?.replace(/_/g, ' ')} · Estado: <strong>{selectedOrder.pago?.estado}</strong>
                  </p>
                  {selectedOrder.pago?.referencia_externa && (
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                      Ref: {selectedOrder.pago.referencia_externa}
                    </p>
                  )}
                </div>
              </div>

              {selectedOrder.pago?.metodo === 'QR_SIMULADO' && selectedOrder.pago?.estado === 'PENDIENTE' && (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 sm:flex-row">
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <QRCodeSVG
                      value={selectedOrder.pago.datos_respuesta?.qr_payload || selectedOrder.codigo_pedido}
                      size={132}
                    />
                  </div>
                  <div className="flex-1 space-y-2.5 text-center sm:text-left">
                    <p className="text-sm font-bold text-slate-900">Escanea el QR para completar tu pago</p>
                    <p className="text-xs text-slate-600">
                      Monto exacto: <strong>{formatMoney(selectedOrder.total, config.moneda_simbolo)}</strong>
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                      <button
                        type="button"
                        onClick={() => handleSimulateQr(selectedOrder.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Simular confirmación bancaria
                      </button>

                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Upload className="h-4 w-4" />
                        Subir comprobante
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleUploadReceipt(selectedOrder.id, e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Detalle de productos</h3>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {(selectedOrder.items || []).map((item) => (
                    <li key={item.id} className="flex justify-between py-2">
                      <span>
                        {item.cantidad}x {item.nombre_producto_snapshot}
                      </span>
                      <span className="font-semibold">
                        {formatMoney(item.subtotal, config.moneda_simbolo)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-extrabold text-primary">
                  <span>Total pagado</span>
                  <span>{formatMoney(selectedOrder.total, config.moneda_simbolo)}</span>
                </div>
              </div>

              {selectedOrder.estado === 'PENDIENTE_PAGO' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancelar pedido
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}