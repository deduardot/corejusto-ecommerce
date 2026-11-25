import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Layers,
  ClipboardList,
  Shield,
  Users,
  Palette,
  Store,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV_ITEMS = [
  {
    to: '/admin',
    end: true,
    label: 'Dashboard',
    icon: LayoutDashboard,
    anyPerm: null
  },
  {
    to: '/admin/catalogo',
    label: 'Catálogo',
    icon: Layers,
    anyPerm: ['productos:ver', 'categorias:gestionar', 'proveedores:gestionar']
  },
  {
    to: '/admin/inventario',
    label: 'Inventario FIFO',
    icon: Boxes,
    anyPerm: ['inventario:ver', 'inventario:ingresar_lote', 'inventario:ver_kardex']
  },
  {
    to: '/admin/pedidos',
    label: 'Pedidos y Pagos',
    icon: ClipboardList,
    anyPerm: ['pedidos:ver_todos']
  },
  {
    to: '/admin/roles',
    label: 'Roles y Permisos',
    icon: Shield,
    anyPerm: ['roles:ver']
  },
  {
    to: '/admin/usuarios',
    label: 'Usuarios',
    icon: Users,
    anyPerm: ['usuarios:ver']
  },
  {
    to: '/admin/configuracion',
    label: 'White-Label',
    icon: Palette,
    anyPerm: ['config:editar']
  }
];

export function AdminLayout() {
  const { user, logout, hasPermission } = useAuth();
  const { config } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.anyPerm || item.anyPerm.some((p) => hasPermission(p))
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderNavLinks = () => (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col bg-primary text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="truncate text-base font-extrabold">{config.nombre_tienda}</p>
          <p className="text-[11px] text-slate-300">Backoffice · {user?.rol_nombre}</p>
        </div>

        {renderNavLinks()}

        <div className="space-y-1 border-t border-white/10 p-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            <Store className="h-4 w-4" />
            Ver tienda pública
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex w-64 flex-col bg-primary text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <p className="text-sm font-extrabold">{config.nombre_tienda}</p>
                <p className="text-[11px] text-slate-300">{user?.rol_nombre}</p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavLinks()}
            <div className="space-y-1 border-t border-white/10 p-3">
              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
              >
                <Store className="h-4 w-4" />
                Ir a tienda pública
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-300 hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir navegación"
              className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-bold text-slate-900">{user?.nombre_completo}</p>
              <p className="text-[11px] text-slate-500">
                {user?.rol_nombre} · {user?.permisos?.length || 0} permisos activos
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Tienda Pública
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}