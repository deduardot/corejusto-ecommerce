import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, ShieldCheck, Cpu, Check } from 'lucide-react';
import { api } from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { formatMoney } from '../../utils/format';
import { Spinner } from '../../components/ui/Spinner';

export default function CatalogPage() {
  const { config } = useTheme();
  const { addItem } = useCart();

  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total_paginas: 1, total: 0 });
  const [selectedCat, setSelectedCat] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    api.get('/categorias').then(({ data }) => setCategorias(data.data || [])).catch(() => {});
  }, []);

  // Debounce de 350ms para evitar ráfagas de peticiones HTTP en redes 3G mientras el usuario escribe
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get('/productos', {
        params: {
          categoria: selectedCat || undefined,
          q: searchQuery || undefined,
          page,
          limit: 9
        }
      })
      .then(({ data }) => {
        if (!active) return;
        setProductos(data.data.items || []);
        setPaginacion(data.data.paginacion);
      })
      .catch(() => {
        if (active) setProductos([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCat, searchQuery, page]);

  const handleQuickAdd = (product) => {
    addItem(product, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-primary px-6 py-8 text-white shadow-sm">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Hardware con Trazabilidad de Origen y Margen Transparente
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {config.nombre_tienda}
          </h1>
          <p className="mt-2 text-sm text-slate-300">{config.eslogan}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar CPU, GPU, SSD o SKU..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-secondary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCat('');
              setPage(1);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedCat === ''
                ? 'bg-primary text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCat(cat.slug);
                setPage(1);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedCat === cat.slug
                  ? 'bg-primary text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <Spinner text="Cargando componentes..." />
      ) : productos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <p className="text-sm font-medium text-slate-600">No encontramos componentes con esos filtros.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {productos.map((prod) => {
              const inStock = Number(prod.stock_actual) > 0;
              return (
                <article
                  key={prod.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <Link
                    to={`/producto/${prod.slug}`}
                    className="relative flex h-44 items-center justify-center bg-slate-100 p-4"
                  >
                    {prod.imagen_url ? (
                      <img
                        src={prod.imagen_url}
                        alt={prod.nombre}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <Cpu className="h-12 w-12" />
                        <span className="mt-1 text-[11px] font-mono">{prod.sku}</span>
                      </div>
                    )}

                    <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                      {prod.categoria_nombre}
                    </span>

                    <span
                      className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {inStock ? `${prod.stock_actual} disp.` : 'Agotado'}
                    </span>
                  </Link>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-[11px] font-medium text-slate-500">
                      {prod.proveedor_nombre} ({prod.proveedor_pais}) · Garantía {prod.meses_garantia}m
                    </p>
                    <Link
                      to={`/producto/${prod.slug}`}
                      className="mt-1 line-clamp-2 text-base font-bold text-slate-900 hover:text-secondary"
                    >
                      {prod.nombre}
                    </Link>

                    <p className="mt-1.5 text-xs text-emerald-700">
                      Margen justo declarado: {prod.margen_transparente_pct}%
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="text-lg font-extrabold text-primary">
                        {formatMoney(prod.precio_venta, config.moneda_simbolo)}
                      </span>
                      <button
                        type="button"
                        disabled={!inStock}
                        onClick={() => handleQuickAdd(prod)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {addedId === prod.id ? (
                          <>
                            <Check className="h-4 w-4" />
                            Agregado
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4" />
                            Agregar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {paginacion.total_paginas > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-600">
                Página {paginacion.pagina} de {paginacion.total_paginas}
              </span>
              <button
                type="button"
                disabled={page >= paginacion.total_paginas}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}