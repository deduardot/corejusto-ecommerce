import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ShoppingCart,User, LogOut, ShieldCheck, Menu, X, Cpu, Package } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export function StoreLayout() {
  const { config } = useTheme();
  const { user, logout, isStaff } = useAuth();
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 bg-primary text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            {config.logo_url ? (
              <img
                src={config.logo_url}
                alt={config.nombre_tienda}
                className="h-9 w-9 rounded-lg object-contain bg-white p-0.5"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-white">
                <Cpu className="h-5 w-5" />
              </div>
            )}
            <div className="leading-tight">
              <span className="block text-base font-bold tracking-tight">{config.nombre_tienda}</span>
              <span className="hidden text-[11px] text-slate-300 sm:block">Comercio Justo Certificado</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            <Link to="/" className="text-sm font-medium text-slate-200 hover:text-white">
              Catálogo
            </Link>

            {user && (
              <Link to="/mis-pedidos" className="flex items-center gap-1.5 text-sm font-medium text-slate-200 hover:text-white">
                <Package className="h-4 w-4" />
                Mis pedidos
              </Link>
            )}

            {isStaff && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              >
                <ShieldCheck className="h-4 w-4" />
                Panel Admin
              </Link>
            )}

            <Link
              to="/carrito"
              className="relative flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Carrito</span>
              {totalItems > 0 && (
                <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-xs font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-3 border-l border-white/20 pl-4">
                <div className="text-right leading-tight">
                  <span className="block text-xs font-semibold">{user.nombre_completo}</span>
                  <span className="block text-[11px] text-slate-300">{user.rol_nombre}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10">
                  Ingresar
                </Link>
                <Link
                  to="/registro"
                  className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Crear cuenta
                </Link>
              </div>
            )}
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <Link to="/carrito" className="relative rounded-lg bg-white/10 p-2">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Abrir menú"
              className="rounded-lg p-2 hover:bg-white/10"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 bg-primary px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-2">
              <Link to="/" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-white/10">
                Catálogo
              </Link>
              {user && (
                <Link to="/mis-pedidos" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-white/10">
                  Mis pedidos
                </Link>
              )}
              {isStaff && (
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold">
                  Panel Admin ({user.rol_nombre})
                </Link>
              )}
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión ({user.nombre_completo})
                </button>
              ) : (
                <div className="mt-1 flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-lg border border-white/20 py-2 text-center text-sm"
                  >
                    Ingresar
                  </Link>
                  <Link
                    to="/registro"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-lg bg-secondary py-2 text-center text-sm font-semibold"
                  >
                    Crear cuenta
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-slate-600 sm:px-6 md:grid-cols-3">
          <div>
            <p className="font-bold text-slate-900">{config.nombre_tienda}</p>
            <p className="mt-1 text-xs leading-relaxed">{config.eslogan}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Compromiso de Comercio Justo</p>
            <p className="mt-1 text-xs leading-relaxed">{config.politica_comercio_justo}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Punto de Recojo y Contacto</p>
            <p className="mt-1 text-xs">{config.direccion_tienda}</p>
            <p className="mt-0.5 text-xs">{config.email_contacto} · {config.telefono_contacto}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}