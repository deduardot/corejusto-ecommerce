import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, Cpu } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { formatMoney } from '../../utils/format';

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { config } = useTheme();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white py-14 text-center shadow-sm">
        <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">Tu carrito está vacío</h1>
        <p className="mt-1 text-xs text-slate-500">Agrega componentes del catálogo para iniciar tu compra.</p>
        <Link
          to="/"
          className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <h1 className="text-xl font-bold text-slate-900">Carrito de compras</h1>
        {items.map((item) => (
          <div
            key={item.producto_id}
            className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 p-2">
              {item.imagen_url ? (
                <img src={item.imagen_url} alt={item.nombre} loading="lazy" className="h-full w-full object-contain" />
              ) : (
                <Cpu className="h-7 w-7 text-slate-400" />
              )}
            </div>

            <div className="flex-1">
              <Link to={`/producto/${item.slug}`} className="text-sm font-bold text-slate-900 hover:text-secondary">
                {item.nombre}
              </Link>
              <p className="text-xs text-slate-500">
                {formatMoney(item.precio_venta, config.moneda_simbolo)} c/u · Máx. {item.stock_actual} disp.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="flex items-center rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.producto_id, item.cantidad - 1)}
                  className="px-2.5 py-1 text-sm font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-semibold">{item.cantidad}</span>
                <button
                  type="button"
                  disabled={item.cantidad >= item.stock_actual}
                  onClick={() => updateQuantity(item.producto_id, item.cantidad + 1)}
                  className="px-2.5 py-1 text-sm font-bold disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <span className="w-24 text-right text-sm font-bold text-primary">
                {formatMoney(item.precio_venta * item.cantidad, config.moneda_simbolo)}
              </span>

              <button
                type="button"
                onClick={() => removeItem(item.producto_id)}
                aria-label="Eliminar producto"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Resumen</h2>
        <div className="mt-4 space-y-2 border-b border-slate-200 pb-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal productos</span>
            <span className="font-semibold text-slate-900">{formatMoney(subtotal, config.moneda_simbolo)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Envío</span>
            <span>Se calcula en el checkout</span>
          </div>
        </div>
        <Link
          to="/checkout"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-semibold text-white hover:opacity-95"
        >
          Continuar al pago
          <ArrowRight className="h-4 w-4" />
        </Link>
      </aside>
    </div>
  );
}