import { useEffect, useState } from 'react';
import { UserPlus, Pencil, Power } from 'lucide-react';
import { api } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getApiError } from '../../utils/format';
import { Spinner } from '../../components/ui/Spinner';

const EMPTY_FORM = {
  id: null,
  rol_id: '',
  nombre_completo: '',
  email: '',
  password: '',
  telefono: '',
  nit_ci: ''
};

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canManage = hasPermission('usuarios:gestionar');

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/usuarios'),
        hasPermission('roles:ver') ? api.get('/roles') : Promise.resolve({ data: { data: [] } })
      ]);
      setUsers(usersRes.data.data || []);
      setRoles(rolesRes.data.data || []);
    } catch (err) {
      setError(getApiError(err, 'No se pudieron cargar los usuarios'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (u) => {
    setError('');
    setSuccess('');
    setForm({
      id: u.id,
      rol_id: String(u.rol_id),
      nombre_completo: u.nombre_completo,
      email: u.email,
      password: '',
      telefono: u.telefono || '',
      nit_ci: u.nit_ci || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {
        rol_id: Number(form.rol_id),
        nombre_completo: form.nombre_completo,
        email: form.email,
        telefono: form.telefono || undefined,
        nit_ci: form.nit_ci || undefined,
        ...(form.password ? { password: form.password } : {})
      };

      if (form.id) {
        await api.put(`/usuarios/${form.id}`, payload);
        setSuccess('Usuario actualizado correctamente.');
      } else {
        await api.post('/usuarios', payload);
        setSuccess('Usuario creado correctamente.');
      }

      setForm(EMPTY_FORM);
      await fetchData();
    } catch (err) {
      setError(getApiError(err, 'Error al guardar usuario'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/usuarios/${u.id}/estado`, { activo: !u.activo });
      setSuccess(`Cuenta ${!u.activo ? 'activada' : 'desactivada'} correctamente.`);
      await fetchData();
    } catch (err) {
      setError(getApiError(err, 'No se pudo actualizar el estado'));
    }
  };

  if (loading) return <Spinner text="Cargando usuarios..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Gestión de Usuarios</h1>
        <p className="text-xs text-slate-500">Asigna roles dinámicos, edita datos o suspende cuentas con efecto inmediato.</p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

      {canManage && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <UserPlus className="h-4 w-4 text-secondary" />
              {form.id ? `Editar usuario #${form.id}` : 'Registrar nuevo usuario'}
            </h2>
            {form.id && (
              <button type="button" onClick={() => setForm(EMPTY_FORM)} className="text-xs text-slate-500 hover:underline">
                Cancelar
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              type="text"
              required
              placeholder="Nombre completo *"
              value={form.nombre_completo}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              required
              placeholder="Correo electrónico *"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              required
              value={form.rol_id}
              onChange={(e) => setForm({ ...form, rol_id: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecciona rol *</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
            <input
              type="password"
              required={!form.id}
              minLength={form.id ? undefined : 8}
              placeholder={form.id ? 'Nueva contraseña (opcional)' : 'Contraseña mín. 8 caracteres *'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="NIT / CI"
              value={form.nit_ci}
              onChange={(e) => setForm({ ...form, nit_ci: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : form.id ? 'Actualizar usuario' : 'Crear usuario'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Teléfono / NIT</th>
              <th className="px-4 py-3">Estado</th>
              {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-bold text-slate-900">{u.nombre_completo}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                    {u.rol_nombre}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {u.telefono || '—'} / {u.nit_ci || '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold ${
                      u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(u)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          className={`rounded-lg p-1.5 ${
                            u.activo
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}