import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'cj_cart';
const CartContext = createContext(null);

function loadInitialCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadInitialCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, quantity = 1) => {
    const maxStock = Number(product.stock_actual) || 0;
    if (maxStock <= 0) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.producto_id === product.id);
      if (existing) {
        const nextQty = Math.min(existing.cantidad + quantity, maxStock);
        return prev.map((i) =>
          i.producto_id === product.id ? { ...i, cantidad: nextQty, stock_actual: maxStock } : i
        );
      }

      return [
        ...prev,
        {
          producto_id: product.id,
          slug: product.slug,
          sku: product.sku,
          nombre: product.nombre,
          precio_venta: Number(product.precio_venta),
          imagen_url: product.imagen_url || null,
          stock_actual: maxStock,
          cantidad: Math.min(quantity, maxStock)
        }
      ];
    });
  };

  const updateQuantity = (productoId, quantity) => {
    if (quantity <= 0) {
      removeItem(productoId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.producto_id === productoId
          ? { ...i, cantidad: Math.min(quantity, i.stock_actual || quantity) }
          : i
      )
    );
  };

  const removeItem = (productoId) => {
    setItems((prev) => prev.filter((i) => i.producto_id !== productoId));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0);
  const subtotal = items.reduce((sum, i) => sum + i.precio_venta * i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{ items, totalItems, subtotal, addItem, updateQuantity, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}