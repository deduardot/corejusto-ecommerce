import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { StoreLayout } from './components/layout/StoreLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Spinner } from './components/ui/Spinner';

const CatalogPage = lazy(() => import('./features/store/CatalogPage'));
const ProductDetailPage = lazy(() => import('./features/store/ProductDetailPage'));
const CartPage = lazy(() => import('./features/store/CartPage'));
const CheckoutPage = lazy(() => import('./features/store/CheckoutPage'));
const MyOrdersPage = lazy(() => import('./features/store/MyOrdersPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));

const DashboardPage = lazy(() => import('./features/admin/DashboardPage'));
const RolesPage = lazy(() => import('./features/admin/RolesPage'));
const UsersPage = lazy(() => import('./features/admin/UsersPage'));
const CatalogAdminPage = lazy(() => import('./features/admin/CatalogAdminPage'));
const InventoryFifoPage = lazy(() => import('./features/admin/InventoryFifoPage'));
const OrdersAdminPage = lazy(() => import('./features/admin/OrdersAdminPage'));
const SettingsPage = lazy(() => import('./features/admin/SettingsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={<Spinner text="Cargando módulo..." />}>
              <Routes>
                <Route element={<StoreLayout />}>
                  <Route path="/" element={<CatalogPage />} />
                  <Route path="/producto/:slug" element={<ProductDetailPage />} />
                  <Route path="/carrito" element={<CartPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/registro" element={<RegisterPage />} />
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <CheckoutPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/mis-pedidos"
                    element={
                      <ProtectedRoute>
                        <MyOrdersPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireStaff>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route
                    path="catalogo"
                    element={
                      <ProtectedRoute anyPermission={['productos:ver', 'categorias:gestionar', 'proveedores:gestionar']}>
                        <CatalogAdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="inventario"
                    element={
                      <ProtectedRoute anyPermission={['inventario:ver', 'inventario:ingresar_lote', 'inventario:ver_kardex']}>
                        <InventoryFifoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="pedidos"
                    element={
                      <ProtectedRoute permisoRequerido="pedidos:ver_todos">
                        <OrdersAdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="roles"
                    element={
                      <ProtectedRoute permisoRequerido="roles:ver">
                        <RolesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="usuarios"
                    element={
                      <ProtectedRoute permisoRequerido="usuarios:ver">
                        <UsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="configuracion"
                    element={
                      <ProtectedRoute permisoRequerido="config:editar">
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}