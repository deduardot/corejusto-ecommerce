import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, AlertTriangle, Package, DollarSign, ClipboardList } from 'lucide-react';
import { api } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatMoney } from '../../utils/format';
import { Spinner } from '../../components/ui/Spinner';

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const { config } = useTheme();

  const [finanzas, setFinanzas] = useState(null);
  const [valorizacion, setValorizacion] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [pedidosPendientes, setPedidosPendientes] = useState(null);
  const [loading, setLoading] = useState(true);

  const canReports = hasPermission('reportes:ver');
  const canInventory = hasPermission('inventario:ver');
  const canOrders = hasPermission('pedidos:ver_todos');

  useEffect(() => {
    let active = true;
    const tasks = [];

    if (canReports) {
      tasks.push(
        api.get('/pedidos/resumen/financiero').then(({ data }) => {
          if (active) setFinanzas(data.data);
        }).catch(() => {})
      );
    }

    if (canInventory) {
      tasks.push(
        api.get('/inventario/valorizacion').then(({ data }) => {
          if (active) setValorizacion(data.data);
        }).catch(() => {}),
        api.get('/inventario/alertas').then(({ data }) => {
          if (active) setAlertas(data.data || []);
        }).catch(() => {})
      );
    }

    if (canOrders) {
      tasks.push(
        api.get('/pedidos', { params: { estado: 'PENDIENTE_PAGO' } }).then(({ data }) => {
          if (active) setPedidosPendientes((data.data || []).length);
        }).catch(() => {})
      );
    }

    Promise.all(tasks).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [canReports, canInventory, canOrders]);

  if (loading) return <Spinner text="Cargando indicadores..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Panel de Control</h1>
        <p className="text-xs text-slate-500">
          Vista adaptada a tu rol ({user?.rol_nombre}). Solo se consultan los módulos autorizados por tu JWT.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {finanzas && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Facturación Confirmada</span>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-primary">
                {formatMoney(finanzas.facturacion_total, config.moneda_simbolo)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {finanzas.pedidos_validos} pedidos válidos · COGS: {formatMoney(finanzas.costo_ventas_cogs_total, config.moneda_simbolo)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Utilidad Bruta Real (FIFO)</span>
                <TrendingUp className="h-4 w-4 text-secondary" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-secondary">
                {formatMoney(finanzas.utilidad_bruta_real, config.moneda_simbolo)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Margen bruto real: <strong>{finanzas.margen_bruto_real_pct}%</strong>
              </p>
            </div>
          </>
        )}

        {valorizacion && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Valor Inventario FIFO</span>
              <Package className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {formatMoney(valorizacion.resumen.valor_total_fifo, config.moneda_simbolo)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {valorizacion.resumen.total_unidades} unidades en {valorizacion.resumen.total_lotes_activos} lotes activos
            </p>
          </div>
        )}

        {pedidosPendientes !== null && (
          <Link
            to="/admin/pedidos"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-secondary"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Pagos Pendientes por Validar</span>
              <ClipboardList className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-amber-600">{pedidosPendientes}</p>
            <p className="mt-1 text-[11px] text-slate-500">Ir a gestión de pedidos y pagos →</p>
          </Link>
        )}
      </div>

      {canInventory && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas de Stock Mínimo ({alertas.length})
            </h2>
            {hasPermission('inventario:ingresar_lote') && (
              <Link
                to="/admin/inventario"
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
              >
                Reponer lotes FIFO
              </Link>
            )}
          </div>

          {alertas.length === 0 ? (
            <p className="mt-4 text-xs text-emerald-700">
              Todos los componentes se encuentran por encima de su stock mínimo.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Componente</th>
                    <th className="py-2 pr-3">Proveedor</th>
                    <th className="py-2 pr-3">Stock Actual</th>
                    <th className="py-2 pr-3">Mínimo</th>
                    <th className="py-2">Déficit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alertas.map((a) => (
                    <tr key={a.producto_id}>
                      <td className="py-2.5 pr-3 font-mono font-semibold">{a.sku}</td>
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">{a.nombre}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{a.proveedor_nombre}</td>
                      <td className="py-2.5 pr-3 font-bold text-rose-600">{a.stock_actual}</td>
                      <td className="py-2.5 pr-3">{a.stock_minimo}</td>
                      <td className="py-2.5">
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-700">
                          {a.deficit_minimo > 0 ? `-${a.deficit_minimo}` : 'En límite'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}