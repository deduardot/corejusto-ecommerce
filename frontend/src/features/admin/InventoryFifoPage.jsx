import { useEffect, useState } from 'react';
import { PackagePlus, AlertOctagon, History, Play, Ban } from 'lucide-react';
import { api } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatDate, formatMoney, getApiError } from '../../utils/format';
import { Spinner } from '../../components/ui/Spinner';

const MOV_BADGE = {
  ENTRADA: 'bg-emerald-100 text-emerald-800',
  SALIDA_VENTA: 'bg-sky-100 text-sky-800',
  DEVOLUCION: 'bg-indigo-100 text-indigo-800',
  AJUSTE_MERMA: 'bg-rose-100 text-rose-800'
};

export default function InventoryFifoPage() {
  const { hasPermission } = useAuth();
  const { config } = useTheme();

  const canIngresar = hasPermission('inventario:ingresar_lote');
  const canAjustar = hasPermission('inventario:ajustar');
  const canKardex = hasPermission('inventario:ver_kardex');

  const [tab, setTab] = useState('lotes');
  const [lotes, setLotes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [kardex, setKardex] = useState({ items: [], paginacion: { pagina: 1, total_paginas: 1 } });
  const [kardexFilter, setKardexFilter] = useState({ producto_id: '', tipo: '', page: 1 });

  const [loteForm, setLoteForm] = useState({
    producto_id: '',
    proveedor_id: '',
    cantidad: '',
    costo_unitario: '',
    observaciones: ''
  });
  const [mermaForm, setMermaForm] = useState({ lote_id: '', cantidad: '1', motivo: '' });
  const [simForm, setSimForm] = useState({ producto_id: '5', cantidad: '12' });
  const [simResult, setSimResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadBase = async () => {
    try {
      const [lotesRes, prodRes, provRes] = await Promise.all([
        api.get('/inventario/lotes'),
        api.get('/productos', { params: { limit: 50 } }),
        api.get('/proveedores')
      ]);
      setLotes(lotesRes.data.data || []);
      setProductos(prodRes.data.data?.items || []);
      setProveedores(provRes.data.data || []);
    } catch (err) {
      setError(getApiError(err, 'No se pudo cargar el inventario FIFO'));
    } finally {
      setLoading(false);
    }
  };

  const loadKardex = async (filters = kardexFilter) => {
    if (!canKardex) return;
    try {
      const { data } = await api.get('/inventario/kardex', {
        params: {
          producto_id: filters.producto_id || undefined,
          tipo: filters.tipo || undefined,
          page: filters.page,
          limit: 15
        }
      });
      setKardex(data.data);
    } catch (err) {
      setError(getApiError(err, 'No se pudo cargar el Kardex'));
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (tab === 'kardex') loadKardex(kardexFilter);
  }, [tab, kardexFilter]);

  const handleIngresarLote = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/inventario/lotes', {
        ...loteForm,
        producto_id: Number(loteForm.producto_id),
        proveedor_id: Number(loteForm.proveedor_id),
        cantidad: Number(loteForm.cantidad),
        costo_unitario: Number(loteForm.costo_unitario)
      });
      setSuccess('Lote registrado y asiento ENTRADA generado en Kardex.');
      setLoteForm({ producto_id: '', proveedor_id: '', cantidad: '', costo_unitario: '', observaciones: '' });
      await loadBase();
    } catch (err) {
      setError(getApiError(err, 'No se pudo registrar el lote'));
    }
  };

  const handleMerma = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/inventario/ajustes/merma', {
        lote_id: Number(mermaForm.lote_id),
        cantidad: Number(mermaForm.cantidad),
        motivo: mermaForm.motivo
      });
      setSuccess('Ajuste de merma aplicado y registrado en Kardex.');
      setMermaForm({ lote_id: '', cantidad: '1', motivo: '' });
      await loadBase();
    } catch (err) {
      setError(getApiError(err, 'No se pudo registrar la merma'));
    }
  };

  const handleAnularLote = async (lote) => {
    const motivo = window.prompt(`Motivo de anulación para ${lote.codigo_lote} (mín. 5 caracteres):`);
    if (!motivo) return;
    setError('');
    setSuccess('');
    try {
      await api.patch(`/inventario/lotes/${lote.id}/anular`, { motivo });
      setSuccess(`Lote ${lote.codigo_lote} anulado correctamente.`);
      await loadBase();
    } catch (err) {
      setError(getApiError(err, 'No se pudo anular el lote'));
    }
  };

  const handleSimularFifo = async (e) => {
    e.preventDefault();
    setError('');
    setSimResult(null);
    try {
      const { data } = await api.post('/inventario/simular-fifo', {
        producto_id: Number(simForm.producto_id),
        cantidad: Number(simForm.cantidad)
      });
      setSimResult(data.data);
    } catch (err) {
      setError(getApiError(err, 'No se pudo simular el consumo FIFO'));
    }
  };

  if (loading) return <Spinner text="Cargando consola FIFO..." />;

  const activeLotes = lotes.filter((l) => l.estado === 'ACTIVO' && l.cantidad_disponible > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Consola de Inventario FIFO (PEPS)</h1>
          <p className="text-xs text-slate-500">Control por lotes con trazabilidad de costo unitario y Kardex inmutable.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('lotes')}
            className={`rounded-xl px-4 py-2 text-xs font-bold ${tab === 'lotes' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
          >
            Lotes y Ajustes ({lotes.length})
          </button>
          {canKardex && (
            <button
              type="button"
              onClick={() => setTab('kardex')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${tab === 'kardex' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
            >
              <History className="h-3.5 w-3.5" />
              Kardex Inmutable
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('simulador')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${tab === 'simulador' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
          >
            <Play className="h-3.5 w-3.5" />
            Simulador FIFO
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

      {tab === 'lotes' && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            {canIngresar && (
              <form onSubmit={handleIngresarLote} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <PackagePlus className="h-4 w-4 text-secondary" />
                  Registrar Ingreso de Lote
                </h2>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <select
                    required
                    value={loteForm.producto_id}
                    onChange={(e) => setLoteForm({ ...loteForm, producto_id: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">Componente *</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>
                    ))}
                  </select>
                  <select
                    required
                    value={loteForm.proveedor_id}
                    onChange={(e) => setLoteForm({ ...loteForm, proveedor_id: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">Proveedor *</option>
                    {proveedores.map((pr) => (
                      <option key={pr.id} value={pr.id}>{pr.nombre}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="Cantidad de unidades *"
                    value={loteForm.cantidad}
                    onChange={(e) => setLoteForm({ ...loteForm, cantidad: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    required
                    placeholder={`Costo unitario (${config.moneda_simbolo}) *`}
                    value={loteForm.costo_unitario}
                    onChange={(e) => setLoteForm({ ...loteForm, costo_unitario: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Observaciones / Nº factura importación"
                  value={loteForm.observaciones}
                  onChange={(e) => setLoteForm({ ...loteForm, observaciones: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
                <button type="submit" className="w-full rounded-xl bg-secondary py-2 text-xs font-bold text-white">
                  Ingresar lote FIFO
                </button>
              </form>
            )}

            {canAjustar && (
              <form onSubmit={handleMerma} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <AlertOctagon className="h-4 w-4 text-rose-600" />
                  Registrar Ajuste por Merma / RMA
                </h2>
                <select
                  required
                  value={mermaForm.lote_id}
                  onChange={(e) => setMermaForm({ ...mermaForm, lote_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="">Selecciona lote activo *</option>
                  {activeLotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.codigo_lote} · {l.producto_nombre} (disp: {l.cantidad_disponible})
                    </option>
                  ))}
                </select>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="Cant."
                    value={mermaForm.cantidad}
                    onChange={(e) => setMermaForm({ ...mermaForm, cantidad: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    minLength={5}
                    placeholder="Motivo obligatorio (mín. 5 caracteres) *"
                    value={mermaForm.motivo}
                    onChange={(e) => setMermaForm({ ...mermaForm, motivo: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:col-span-2"
                  />
                </div>
                <button type="submit" className="w-full rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700">
                  Registrar baja por merma
                </button>
              </form>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Ingreso</th>
                  <th className="px-4 py-3">Disponible / Inicial</th>
                  <th className="px-4 py-3">Costo Unit.</th>
                  <th className="px-4 py-3">Estado</th>
                  {canAjustar && <th className="px-4 py-3 text-right">Anular</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lotes.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{l.codigo_lote}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{l.producto_nombre}</span>
                      <span className="block text-[11px] text-slate-400">{l.proveedor_nombre}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(l.fecha_ingreso)}</td>
                    <td className="px-4 py-3 font-bold">
                      {l.cantidad_disponible} / <span className="text-slate-400">{l.cantidad_inicial}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {formatMoney(l.costo_unitario, config.moneda_simbolo)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 font-bold ${
                          l.estado === 'ACTIVO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.estado === 'AGOTADO'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {l.estado}
                      </span>
                    </td>
                    {canAjustar && (
                      <td className="px-4 py-3 text-right">
                        {l.estado === 'ACTIVO' && l.cantidad_disponible === l.cantidad_inicial && (
                          <button
                            type="button"
                            onClick={() => handleAnularLote(l)}
                            title="Anular lote sin salidas"
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'kardex' && canKardex && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <select
              value={kardexFilter.producto_id}
              onChange={(e) => setKardexFilter({ ...kardexFilter, producto_id: e.target.value, page: 1 })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
            >
              <option value="">Todos los productos</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>
              ))}
            </select>

            <select
              value={kardexFilter.tipo}
              onChange={(e) => setKardexFilter({ ...kardexFilter, tipo: e.target.value, page: 1 })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
            >
              <option value="">Todos los movimientos</option>
              <option value="ENTRADA">ENTRADA</option>
              <option value="SALIDA_VENTA">SALIDA_VENTA</option>
              <option value="DEVOLUCION">DEVOLUCION</option>
              <option value="AJUSTE_MERMA">AJUSTE_MERMA</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Producto / Lote</th>
                  <th className="px-4 py-3">Cant.</th>
                  <th className="px-4 py-3">Costo Total</th>
                  <th className="px-4 py-3">Responsable / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(kardex.items || []).map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(m.creado_en)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${MOV_BADGE[m.tipo]}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{m.producto_nombre}</span>
                      <span className="block font-mono text-[11px] text-slate-400">{m.codigo_lote}</span>
                    </td>
                    <td className="px-4 py-3 font-bold">{m.cantidad}</td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {formatMoney(m.costo_total, config.moneda_simbolo)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{m.usuario_nombre}</span>
                      <span className="block text-[11px] text-slate-500">{m.motivo}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {kardex.paginacion?.total_paginas > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={kardexFilter.page <= 1}
                onClick={() => setKardexFilter((f) => ({ ...f, page: f.page - 1 }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-600">
                Página {kardex.paginacion.pagina} de {kardex.paginacion.total_paginas}
              </span>
              <button
                type="button"
                disabled={kardexFilter.page >= kardex.paginacion.total_paginas}
                onClick={() => setKardexFilter((f) => ({ ...f, page: f.page + 1 }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'simulador' && (
        <div className="space-y-4">
          <form onSubmit={handleSimularFifo} className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Componente</label>
              <select
                value={simForm.producto_id}
                onChange={(e) => setSimForm({ ...simForm, producto_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.nombre} (stock: {p.stock_actual})</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Cantidad</label>
              <input
                type="number"
                min={1}
                required
                value={simForm.cantidad}
                onChange={(e) => setSimForm({ ...simForm, cantidad: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <button type="submit" className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white">
              Simular consumo PEPS
            </button>
          </form>

          {simResult && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Ingreso Proyectado</p>
                  <p className="text-lg font-extrabold text-primary">
                    {formatMoney(simResult.ingreso_venta_proyectado, config.moneda_simbolo)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Costo de Ventas (COGS FIFO)</p>
                  <p className="text-lg font-extrabold text-amber-700">
                    {formatMoney(simResult.costo_total_cogs, config.moneda_simbolo)}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[11px] text-emerald-700">Utilidad Bruta Real</p>
                  <p className="text-lg font-extrabold text-emerald-800">
                    {formatMoney(simResult.utilidad_bruta_proyectada, config.moneda_simbolo)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Orden / Lote</th>
                      <th className="py-2 pr-3">Fecha Ingreso</th>
                      <th className="py-2 pr-3">A Consumir</th>
                      <th className="py-2 pr-3">Restante Proyectado</th>
                      <th className="py-2 pr-3">Costo Unit.</th>
                      <th className="py-2">Subtotal COGS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {simResult.desglose_lotes.map((d, idx) => (
                      <tr key={d.lote_id}>
                        <td className="py-2.5 pr-3 font-mono font-bold">#{idx + 1} · {d.codigo_lote}</td>
                        <td className="py-2.5 pr-3 text-slate-500">{formatDate(d.fecha_ingreso)}</td>
                        <td className="py-2.5 pr-3 font-bold text-primary">{d.cantidad_a_consumir}</td>
                        <td className="py-2.5 pr-3">
                          {d.stock_restante_proyectado} ({d.estado_proyectado})
                        </td>
                        <td className="py-2.5 pr-3">{formatMoney(d.costo_unitario, config.moneda_simbolo)}</td>
                        <td className="py-2.5 font-bold">{formatMoney(d.subtotal_cogs, config.moneda_simbolo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}