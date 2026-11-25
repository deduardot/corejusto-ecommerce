import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getApiError } from '../../utils/format';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(form);
      const target = location.state?.from || (user.permisos?.length > 0 ? '/admin' : '/');
      navigate(target, { replace: true });
    } catch (err) {
      setError(getApiError(err, 'No se pudo iniciar sesión'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Iniciar sesión</h1>
            <p className="text-xs text-slate-500">Accede a tu cuenta de cliente o panel administrativo</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Correo electrónico</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="cliente@corejusto.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Contraseña</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-600">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-secondary hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}