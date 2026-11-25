import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui/Spinner';

export function ProtectedRoute({
  children,
  permisoRequerido = null,
  anyPermission = null,
  requireStaff = false
}) {
  const { user, loadingAuth, hasPermission, isStaff } = useAuth();
  const location = useLocation();

  if (loadingAuth) return <Spinner text="Verificando sesión..." />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireStaff && !isStaff) {
    return <Navigate to="/" replace />;
  }

  if (permisoRequerido && !hasPermission(permisoRequerido)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Acceso restringido</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu rol actual ({user.rol_nombre}) no posee el permiso requerido: {permisoRequerido}.
        </p>
      </div>
    );
  }

  if (Array.isArray(anyPermission) && !anyPermission.some((p) => hasPermission(p))) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Acceso restringido</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu rol actual ({user.rol_nombre}) no tiene autorización para este módulo.
        </p>
      </div>
    );
  }

  return children;
}