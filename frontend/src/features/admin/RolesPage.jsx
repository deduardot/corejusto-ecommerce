import { useEffect, useState } from 'react';
import { Shield, Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { api } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getApiError } from '../../utils/format';
import { Spinner } from '../../components/ui/Spinner';

const EMPTY_FORM = { id: null, nombre: '', descripcion: '', permiso_ids: [] };

export default function RolesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('roles:gestionar');

  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permisos')
      ]);
      setRoles(rolesRes.data.data || []);
      setPermisos(permsRes.data.data || []);
    } catch (err) {
      setError(getApiError(err, 'No se pudieron cargar los roles'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const permisosPorModulo = permisos.reduce((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = [];
    acc[p.modulo].push(p);
    return acc;
  }, {});

  const togglePermission = (id) => {
    setForm((prev) => ({
      ...prev,
      permiso_ids: prev.permiso_ids.includes(id)
        ? prev.permiso_ids.filter((pid) => pid !== id)
        : [...prev.permiso_ids, id]
    }));
  };

  const handleEdit = (role) => {
    setError('');
    setSuccess('');
    setForm({
      id: role.id,
      nombre: role.nombre,
      descripcion: role.descripcion,
      permiso_ids: (role.permisos || []).map((p) => p.id)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        permiso_ids: form.permiso_ids
      };
      if (form.id) {
        await api.put(`/roles/${form.id}`, payload);
        setSuccess('Rol actualizado correctamente.');
      } else {
        await api.post('/roles', payload);
        setSuccess('Nuevo rol creado correctamente.');
      }
      setForm(EMPTY_FORM);
      await fetchData();
    } catch (err) {
      setError(getApiError(err, 'Error al guardar el rol'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`¿Eliminar el rol "${role.nombre}"?`)) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/roles/${role.id}`);
      setSuccess('Rol eliminado correctamente.');
      if (form.id === role.id) setForm(EMPTY_FORM);
      await fetchData();
    } catch (err) {
      setError(getApiError(err, 'No se pudo eliminar el rol'));
    }
  };

  if (loading) return <Spinner text="Cargando matriz RBAC..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Roles y Matriz de Permisos (RBAC)</h1>
        <p className="text-xs text-slate-500">
          Crea grupos dinámicos y asigna permisos atómicos sin modificar código.
        </p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-3 xl:col-span-2">
          {roles.map((role) => (
            <div key={role.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-secondary" />
                    <h2 className="text-sm font-bold text-slate-900">{role.nombre}</h2>
                    {role.es_sistema && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        <Lock className="h-2.5 w-2.5" />
                        Sistema
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{role.descripcion}</p>
                </div>

                {canManage && role.nombre !== 'SuperAdmin' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(role)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary"
                      title="Editar rol"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!role.es_sistema && (
                      <button
                        type="button"
                        onClick={() => handleDelete(role)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        title="Eliminar rol"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {role.total_usuarios} usuario(s)
                </span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {role.permisos.length} permiso(s)
                </span>
              </div>
            </div>
          ))}
        </div>

        {canManage && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Plus className="h-4 w-4 text-secondary" />
                {form.id ? `Editando rol #${form.id}` : 'Crear nuevo rol'}
              </h2>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm(EMPTY_FORM)}
                  className="text-xs font-semibold text-slate-500 hover:underline"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Nombre del rol *</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Auditor de Inventario"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Descripción *</label>
                <input
                  type="text"
                  required
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Alcance del grupo de usuarios"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Matriz de Permisos ({form.permiso_ids.length} seleccionados)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(permisosPorModulo).map(([modulo, lista]) => (
                  <div key={modulo} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-extrabold uppercase text-primary">{modulo}</p>
                    <div className="space-y-1.5">
                      {lista.map((p) => (
                        <label key={p.id} className="flex cursor-pointer items-start gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={form.permiso_ids.includes(p.id)}
                            onChange={() => togglePermission(p.id)}
                            className="mt-0.5 rounded border-slate-300"
                          />
                          <div>
                            <span className="font-mono font-semibold text-slate-800">{p.clave}</span>
                            <span className="block text-[11px] text-slate-500">{p.descripcion}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : form.id ? 'Guardar cambios del rol' : 'Crear rol'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}