import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShoppingCart, Cpu, Award } from 'lucide-react';
import { api } from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { formatMoney } from '../../utils/format';
import { Spinner } from '../../components/ui/Spinner';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { config } = useTheme();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addedMsg, setAddedMsg] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/productos/slug/${slug}`)
      .then(({ data }) => setProduct(data.data))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner text="Cargando ficha técnica..." />;
  if (!product) {
    return (
      <div className="py-16 text-center">
        <p className="text-base font-semibold text-slate-700">Componente no encontrado.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-secondary hover:underline">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const maxStock = Number(product.stock_actual) || 0;
  const specs = product.especificaciones ? Object.entries(product.especificaciones) : [];

  const handleAdd = () => {
    addItem(product, qty);
    setAddedMsg(true);
    setTimeout(() => setAddedMsg(false), 1800);
  };

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </Link>

      <div className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
        <div className="flex min-h-[280px] items-center justify-center rounded-xl bg-slate-100 p-6">
          {product.imagen_url ? (
            <img
              src={product.imagen_url}
              alt={product.nombre}
              decoding="async"
              className="max-h-80 w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center text-slate-400">
              <Cpu className="h-20 w-20" />
              <span className="mt-2 font-mono text-xs">{product.sku}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
            {product.categoria_nombre} · SKU {product.sku}
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{product.nombre}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{product.descripcion}</p>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-primary">
              {formatMoney(product.precio_venta, config.moneda_simbolo)}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                maxStock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {maxStock > 0 ? `${maxStock} unidades en lotes activos` : 'Sin stock disponible'}
            </span>
          </div>

          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              Trazabilidad de Comercio Justo
            </div>
            <ul className="mt-2 space-y-1">
              <li><strong>Importador directo:</strong> {product.proveedor_nombre} ({product.proveedor_pais})</li>
              <li><strong>Certificación:</strong> {product.certificacion_comercio_justo}</li>
              <li><strong>Margen comercial transparente:</strong> {product.margen_transparente_pct}%</li>
              <li><strong>Garantía oficial:</strong> {product.meses_garantia} meses ({product.politica_garantia})</li>
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-slate-300">
              <button
                type="button"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-sm font-bold disabled:opacity-40"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                disabled={qty >= maxStock}
                onClick={() => setQty((q) => Math.min(maxStock, q + 1))}
                className="px-3 py-2 text-sm font-bold disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={maxStock <= 0}
              onClick={handleAdd}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:bg-slate-300"
            >
              <ShoppingCart className="h-4 w-4" />
              {addedMsg ? '¡Agregado al carrito!' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      </div>

      {specs.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Award className="h-4 w-4 text-secondary" />
            Especificaciones Técnicas
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map(([key, val]) => (
              <div key={key} className="rounded-lg bg-slate-50 p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {key.replace(/_/g, ' ')}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{String(val)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}