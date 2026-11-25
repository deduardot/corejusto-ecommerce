import { useEffect, useState } from 'react';
import { Pencil, Trash2, Power, Plus, Image } from 'lucide-react';
import { api } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatMoney, getApiError } from '../../utils/format';
import { Spinner } from '../../components/ui/Spinner';

const EMPTY_PROD = {
  id: null,
  categoria_id: '',
  proveedor_id: '',
  sku: '',
  nombre: '',
  descripcion: '',
  precio_venta: '',
  margen_transparente_pct: '15',
  meses_garantia: '12',
  stock_minimo: '5',
  especificaciones: '{"socket": "AM5"}'
};

const EMPTY_CAT = { id: null, nombre: '', descripcion: '', activo: true };
const EMPTY_PROV = {
  id: null,
  nombre: '',
  pais_origen: '',
  contacto_email: '',
  telefono: '',
  certificacion_comercio_justo: '',
  politica_garantia: '',
  activo: true
};

export default function CatalogAdminPage() {
  const { hasPermission } = useAuth();
  const { config } = useTheme();

  const canProducts = hasPermission('productos:ver');
  const canManageProducts = hasPermission('productos:gestionar');
  const canCategories = hasPermission('categorias:gestionar');
  const canSuppliers = hasPermission('proveedores:gestionar');

  const initialTab = canProducts ? 'productos' : canCategories ? 'categorias' : 'proveedores';
  const [tab, setTab] = useState(initialTab);

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [prodForm, setProdForm] = useState(EMPTY_PROD);
  const [prodFile, setProdFile] = useState(null);
  const [catForm, setCatForm] = useState(EMPTY_CAT);
  const [provForm, setProvForm] = useState(EMPTY_PROV);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAll = async () => {
    try {
      const [pRes, cRes, prRes] = await Promise.all([
        canProducts ? api.get('/productos/admin') : Promise.resolve({ data: { data: [] } }),
        canCategories ? api.get('/categorias/admin') : api.get('/categorias'),
        canSuppliers ? api.get('/proveedores/admin') : api.get('/proveedores')
      ]);
      setProductos(pRes.data.data || []);
      setCategorias(cRes.data.data || []);
      setProveedores(prRes.data.data || []);
    } catch (err) {
      setError(getApiError(err, 'No se pudo cargar el catálogo'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('categoria_id', prodForm.categoria_id);
    formData.append('proveedor_id', prodForm.proveedor_id);
    formData.append('sku', prodForm.sku);
    formData.append('nombre', prodForm.nombre);
    formData.append('descripcion', prodForm.descripcion);
    formData.append('precio_venta', prodForm.precio_venta);
    formData.append('margen_transparente_pct', prodForm.margen_transparente_pct);
    formData.append('meses_garantia', prodForm.meses_garantia);
    formData.append('stock_minimo', prodForm.stock_minimo);
    if (prodForm.especificaciones.trim()) {
      formData.append('especificaciones', prodForm.especificaciones.trim());
    }
    if (prodFile) {
      formData.append('imagen', prodFile);
    }

    try {
      if (prodForm.id) {
        await api.put(`/productos/${prodForm.id}`, formData);
        setSuccess('Producto actualizado correctamente.');
      } else {
        await api.post('/productos', formData);
        setSuccess('Producto creado. Ingresa su primer lote en Inventario FIFO.');
      }
      setProdForm(EMPTY_PROD);
      setProdFile(null);
      await loadAll();
    } catch (err) {
      setError(getApiError(err, 'Error al guardar el producto'));
    }
  };

  const handleToggleProduct = async (p) => {
    setError('');
    try {
      await api.patch(`/productos/${p.id}/estado`, { activo: !p.activo });
      await loadAll();
    } catch (err) {
      setError(getApiError(err, 'No se pudo cambiar el estado del producto'));
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (catForm.id) {
        await api.put(`/categorias/${catForm.id}`, catForm);
        setSuccess('Categoría actualizada.');
      } else {
        await api.post('/categorias', catForm);
        setSuccess('Categoría creada.');
      }
      setCatForm(EMPTY_CAT);
      await loadAll();
    } catch (err) {
      setError(getApiError(err, 'Error al guardar la categoría'));
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    setError('');
    try {
      await api.delete(`/categorias/${id}`);
      setSuccess('Categoría eliminada.');
      await loadAll();
    } catch (err) {
      setError(getApiError(err, 'No se pudo eliminar la categoría'));
    }
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (provForm.id) {
        await api.put(`/proveedores/${provForm.id}`, provForm);
        setSuccess('Proveedor actualizado.');
      } else {
        await api.post('/proveedores', provForm);
        setSuccess('Proveedor creado.');
      }
      setProvForm(EMPTY_PROV);
      await loadAll();
    } catch (err) {
      setError(getApiError(err, 'Error al guardar proveedor'));
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('¿Eliminar este proveedor?')) return;
    setError('');
    try {
      await api.delete(`/proveedores/${id}`);
      setSuccess('Proveedor eliminado.');
      await loadAll();
    } catch (err) {
      setError(getApiError(err, 'No se pudo eliminar el proveedor'));
    }
  };

  if (loading) return <Spinner text="Cargando catálogo..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Gestión de Catálogo</h1>
          <p className="text-xs text-slate-500">Administra componentes, categorías y proveedores de Comercio Justo.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canProducts && (
            <button
              type="button"
              onClick={() => setTab('productos')}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${tab === 'productos' ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              Productos ({productos.length})
            </button>
          )}
          {canCategories && (
            <button
              type="button"
              onClick={() => setTab('categorias')}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${tab === 'categorias' ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              Categorías ({categorias.length})
            </button>
          )}
          {canSuppliers && (
            <button
              type="button"
              onClick={() => setTab('proveedores')}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${tab === 'proveedores' ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              Proveedores ({proveedores.length})
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

      {tab === 'productos' && (
        <div className="space-y-5">
          {canManageProducts && (
            <form onSubmit={handleSaveProduct} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Plus className="h-4 w-4 text-secondary" />
                  {prodForm.id ? `Editando producto #${prodForm.id}` : 'Nuevo componente de PC'}
                </h2>
                {prodForm.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setProdForm(EMPTY_PROD);
                      setProdFile(null);
                    }}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  type="text"
                  required
                  placeholder="SKU único *"
                  value={prodForm.sku}
                  onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="Nombre del producto *"
                  value={prodForm.nombre}
                  onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:col-span-2"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={`Precio venta (${config.moneda_simbolo}) *`}
                  value={prodForm.precio_venta}
                  onChange={(e) => setProdForm({ ...prodForm, precio_venta: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />

                <select
                  required
                  value={prodForm.categoria_id}
                  onChange={(e) => setProdForm({ ...prodForm, categoria_id: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="">Categoría *</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>

                <select
                  required
                  value={prodForm.proveedor_id}
                  onChange={(e) => setProdForm({ ...prodForm, proveedor_id: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="">Proveedor *</option>
                  {proveedores.map((pr) => (
                    <option key={pr.id} value={pr.id}>{pr.nombre}</option>
                  ))}
                </select>

                <input
                  type="number"
                  step="0.5"
                  placeholder="Margen justo %"
                  value={prodForm.margen_transparente_pct}
                  onChange={(e) => setProdForm({ ...prodForm, margen_transparente_pct: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Garantía (m)"
                    value={prodForm.meses_garantia}
                    onChange={(e) => setProdForm({ ...prodForm, meses_garantia: e.target.value })}
                    className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Stock mín."
                    value={prodForm.stock_minimo}
                    onChange={(e) => setProdForm({ ...prodForm, stock_minimo: e.target.value })}
                    className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <textarea
                  required
                  rows={2}
                  placeholder="Descripción comercial *"
                  value={prodForm.descripcion}
                  onChange={(e) => setProdForm({ ...prodForm, descripcion: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
                <textarea
                  rows={2}
                  placeholder='Especificaciones JSON (ej: {"vram":"8GB","interfaz":"PCIe 4.0"})'
                  value={prodForm.especificaciones}
                  onChange={(e) => setProdForm({ ...prodForm, especificaciones: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <Image className="h-4 w-4 text-secondary" />
                  {prodFile ? prodFile.name : 'Subir imagen (WebP Cloudinary)'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => setProdFile(e.target.files?.[0] || null)}
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-xl bg-secondary px-5 py-2 text-xs font-bold text-white hover:opacity-95"
                >
                  {prodForm.id ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoría / Proveedor</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Stock FIFO</th>
                  <th className="px-4 py-3">Estado</th>
                  {canManageProducts && <th className="px-4 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{p.sku}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{p.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.categoria_nombre} · <span className="text-slate-400">{p.proveedor_nombre}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {formatMoney(p.precio_venta, config.moneda_simbolo)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 font-bold ${
                          p.alerta_stock_bajo ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.stock_actual} (mín {p.stock_minimo})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${p.activo ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {p.activo ? 'Activo' : 'Oculto'}
                      </span>
                    </td>
                    {canManageProducts && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setProdForm({
                                id: p.id,
                                categoria_id: String(p.categoria_id),
                                proveedor_id: String(p.proveedor_id),
                                sku: p.sku,
                                nombre: p.nombre,
                                descripcion: p.descripcion,
                                precio_venta: String(p.precio_venta),
                                margen_transparente_pct: String(p.margen_transparente_pct),
                                meses_garantia: String(p.meses_garantia),
                                stock_minimo: String(p.stock_minimo),
                                especificaciones: p.especificaciones ? JSON.stringify(p.especificaciones) : ''
                              })
                            }
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleProduct(p)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'categorias' && canCategories && (
        <div className="grid gap-5 lg:grid-cols-3">
          <form onSubmit={handleSaveCategory} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">
              {catForm.id ? 'Editar categoría' : 'Nueva categoría'}
            </h2>
            <input
              type="text"
              required
              placeholder="Nombre *"
              value={catForm.nombre}
              onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              placeholder="Descripción"
              value={catForm.descripcion}
              onChange={(e) => setCatForm({ ...catForm, descripcion: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-white">
                {catForm.id ? 'Actualizar' : 'Crear'}
              </button>
              {catForm.id && (
                <button type="button" onClick={() => setCatForm(EMPTY_CAT)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs">
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Productos</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categorias.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-bold text-slate-900">{c.nombre}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{c.slug}</td>
                    <td className="px-4 py-3">{c.total_productos}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => setCatForm({ id: c.id, nombre: c.nombre, descripcion: c.descripcion || '', activo: c.activo })}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c.id)}
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
      )}

      {tab === 'proveedores' && canSuppliers && (
        <div className="space-y-5">
          <form onSubmit={handleSaveSupplier} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {provForm.id ? 'Editar proveedor' : 'Nuevo proveedor (Trazabilidad Comercio Justo)'}
              </h2>
              {provForm.id && (
                <button type="button" onClick={() => setProvForm(EMPTY_PROV)} className="text-xs text-slate-500 hover:underline">
                  Cancelar
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                type="text"
                required
                placeholder="Nombre del proveedor *"
                value={provForm.nombre}
                onChange={(e) => setProvForm({ ...provForm, nombre: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="País de origen *"
                value={provForm.pais_origen}
                onChange={(e) => setProvForm({ ...provForm, pais_origen: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="email"
                placeholder="Email de contacto"
                value={provForm.contacto_email}
                onChange={(e) => setProvForm({ ...provForm, contacto_email: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Certificación Comercio Justo *"
                value={provForm.certificacion_comercio_justo}
                onChange={(e) => setProvForm({ ...provForm, certificacion_comercio_justo: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:col-span-2"
              />
              <input
                type="text"
                required
                placeholder="Política de garantía *"
                value={provForm.politica_garantia}
                onChange={(e) => setProvForm({ ...provForm, politica_garantia: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white">
                {provForm.id ? 'Actualizar proveedor' : 'Crear proveedor'}
              </button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Certificación Comercio Justo</th>
                  <th className="px-4 py-3">Garantía</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proveedores.map((pr) => (
                  <tr key={pr.id}>
                    <td className="px-4 py-3 font-bold text-slate-900">{pr.nombre}</td>
                    <td className="px-4 py-3">{pr.pais_origen}</td>
                    <td className="px-4 py-3 text-emerald-700">{pr.certificacion_comercio_justo}</td>
                    <td className="px-4 py-3 text-slate-600">{pr.politica_garantia}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => setProvForm({ ...pr, contacto_email: pr.contacto_email || '', telefono: pr.telefono || '' })}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSupplier(pr.id)}
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
      )}
    </div>
  );
}