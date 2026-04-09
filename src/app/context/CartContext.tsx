'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type CartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type CartContextValue = {
  items: CartLine[];
  totalCount: number;
  addItem: (item: {
    id: string;
    name: string;
    price: number;
    qty?: number;
  }) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);

  const addItem = useCallback(
    (item: { id: string; name: string; price: number; qty?: number }) => {
      const qty = item.qty ?? 1;
      setItems((prev) => {
        const i = prev.findIndex((l) => l.id === item.id);
        if (i === -1) {
          return [...prev, { id: item.id, name: item.name, price: item.price, qty }];
        }
        return prev.map((l, j) =>
          j === i ? { ...l, qty: l.qty + qty } : l,
        );
      });
    },
    [],
  );

  const totalCount = useMemo(
    () => items.reduce((s, l) => s + l.qty, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, totalCount, addItem }),
    [items, totalCount, addItem],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }
  return ctx;
}
