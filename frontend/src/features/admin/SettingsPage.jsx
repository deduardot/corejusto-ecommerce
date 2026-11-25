import { useEffect, useState } from 'react';
import { Palette, Upload, Trash2, Pencil } from 'lucide-react';
import { api } from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';
import { formatMoney, getApiError } from '../../utils/format';
import { Spinner } from '../../components/ui/Spinner';

const EMPTY_ZONE = { id: null, nombre: '', costo_envio: '', tiempo_estimado: '', activo: true };

export default function SettingsPage() {
  const { config, refreshConfig } = useTheme();
  const [form, setForm] = useState({
    nombre_tienda: '',
    eslogan: '',
    color_primario: '#0F172A',
    color_secundario: '#10B981',
    moneda_simbolo: 'Bs.',
    moneda_codigo: 'BOB',
    email_contacto: '',
    telefono_contacto: '',
    direccion_tienda: '',
    politica_comercio_justo: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [zonas, setZonas] = useState([]);
  const [zoneForm, setZoneForm] = useState(EMPTY_ZONE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      const [cfgRes, zonasRes] = await Promise.all([
        api.get('/config'),
        api.get('/config/zonas')
      ]);
      const c = cfgRes.data.data;
      setForm({
        nombre_tienda: c.nombre_tienda || '',
        eslogan: c.eslogan || '',
        color_primario: c.color_primario || '#0F172A',
        color_secundario: c.color_secundario || '#10B981',
        moneda_simbolo: c.moneda_simbolo || 'Bs.',
        moneda_codigo: c.moneda_codigo || 'BOB',
        email_contacto: c.email_contacto || '',
        telefono_contacto: c.telefono_contacto || '',
        direccion_tienda: c.direccion_tienda || '',
        politica_comercio_justo: c.politica_comercio_justo || ''
      });
      setZonas(zonasRes.data.data || []);
    } catch (err) {
      setError(getApiError(err, 'No se pudo cargar la configuración'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (logoFile) formData.append('logo', logoFile);

      await api.put('/config', formData);
      // Actualiza las variables CSS y el contexto global inmediatamente para evidenciar White-Label en vivo
      await refreshConfig();
      setLogoFile(null);
      setSuccess('Identidad White-Label actualizada y aplicada en tiempo real.');
    } catch (err) {
      setError(getApiError(err, 'No se pudo actualizar la configuración'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        nombre: zoneForm.nombre,
        costo_envio: Number(zoneForm.costo_envio),
        tiempo_estimado: zoneForm.tiempo_estimado,
        activo: zoneForm.activo
      };
      if (zoneForm.id) {
        await api.put(`/config/zonas/${zoneForm.id}`, payload);
        setSuccess('Zona de envío actualizada.');
      } else {
        await api.post('/config/zonas', payload);
        setSuccess('Zona de envío creada.');
      }
      setZoneForm(EMPTY_ZONE);
      await loadData();
      await refreshConfig();
    } catch (err) {
      setError(getApiError(err, 'Error al guardar zona de envío'));
    }
  };

  const handleDeleteZone = async (id) => {
    if (!window.confirm('¿Eliminar esta zona de envío?')) return;
    setError('');
    try {
      await api.delete(`/config/zonas/${id}`);
      setSuccess('Zona eliminada.');
      await loadData();
      await refreshConfig();
    } catch (err) {
      setError(getApiError(err, 'No se pudo eliminar la zona'));
    }
  };

  if (loading) return <Spinner text="Cargando editor White-Label..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Configuración White-Label y Logística</h1>
        <p className="text-xs text-slate-500">
          Personaliza marca, colores, moneda y tarifas para adaptar la plataforma a cualquier negocio.
        </p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

      <form onSubmit={handleSaveBrand} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Palette className="h-4 w-4 text-secondary" />
          Identidad Visual y Datos Comerciales
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Nombre de la tienda *</label>
            <input
              type="text"
              required
              value={form.nombre_tienda}
              onChange={(e) => setForm({ ...form, nombre_tienda: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Eslogan</label>
            <input
              type="text"
              value={form.eslogan}
              onChange={(e) => setForm({ ...form, eslogan: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Color Primario</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color_primario}
                onChange={(e) => setForm({ ...form, color_primario: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-slate-300"
              />
              <input
                type="text"
                value={form.color_primario}
                onChange={(e) => setForm({ ...form, color_primario: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Color Secundario (Acento)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color_secundario}
                onChange={(e) => setForm({ ...form, color_secundario: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-slate-300"
              />
              <input
                type="text"
                value={form.color_secundario}
                onChange={(e) => setForm({ ...form, color_secundario: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Símbolo</label>
              <input
                type="text"
                required
                value={form.moneda_simbolo}
                onChange={(e) => setForm({ ...form, moneda_simbolo: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Código ISO</label>
              <input
                type="text"
                required
                value={form.moneda_codigo}
                onChange={(e) => setForm({ ...form, moneda_codigo: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Email de contacto</label>
            <input
              type="email"
              required
              value={form.email_contacto}
              onChange={(e) => setForm({ ...form, email_contacto: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Teléfono</label>
            <input
              type="text"
              required
              value={form.telefono_contacto}
              onChange={(e) => setForm({ ...form, telefono_contacto: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Dirección de tienda (Recojo)</label>
            <input
              type="text"
              required
              value={form.direccion_tienda}
              onChange={(e) => setForm({ ...form, direccion_tienda: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Política de Comercio Justo</label>
          <textarea
            rows={2}
            required
            value={form.politica_comercio_justo}
            onChange={(e) => setForm({ ...form, politica_comercio_justo: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Upload className="h-4 w-4 text-secondary" />
            {logoFile ? logoFile.name : 'Cambiar logo (Cloudinary)'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-secondary px-6 py-2.5 text-xs font-bold text-white hover:opacity-95 disabled:opacity-60"
          >
            {saving ? 'Aplicando...' : 'Guardar y aplicar tema'}
          </button>
        </div>
      </form>

      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={handleSaveZone} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">
            {zoneForm.id ? 'Editar zona de envío' : 'Nueva zona de envío'}
          </h2>
          <input
            type="text"
            required
            placeholder="Nombre de zona *"
            value={zoneForm.nombre}
            onChange={(e) => setZoneForm({ ...zoneForm, nombre: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
          <input
            type="number"
            step="0.01"
            min={0}
            required
            placeholder={`Costo de envío (${config.moneda_simbolo}) *`}
            value={zoneForm.costo_envio}
            onChange={(e) => setZoneForm({ ...zoneForm, costo_envio: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
          <input
            type="text"
            required
            placeholder="Tiempo estimado (ej: 2 a 4 horas) *"
            value={zoneForm.tiempo_estimado}
            onChange={(e) => setZoneForm({ ...zoneForm, tiempo_estimado: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-white">
              {zoneForm.id ? 'Actualizar' : 'Agregar zona'}
            </button>
            {zoneForm.id && (
              <button type="button" onClick={() => setZoneForm(EMPTY_ZONE)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs">
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Zona</th>
                <th className="px-4 py-3">Tiempo Estimado</th>
                <th className="px-4 py-3">Tarifa</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zonas.map((z) => (
                <tr key={z.id}>
                  <td className="px-4 py-3 font-bold text-slate-900">{z.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{z.tiempo_estimado}</td>
                  <td className="px-4 py-3 font-bold text-primary">
                    {formatMoney(z.costo_envio, config.moneda_simbolo)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => setZoneForm({ ...z, costo_envio: String(z.costo_envio) })}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteZone(z.id)}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}