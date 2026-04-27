'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

const STORAGE_KEY = 'sj-cart-lines-v1';

export function parseProductIdFromLineId(lineId: string): string {
	const sep = lineId.indexOf('__s_');
	return sep === -1 ? lineId : lineId.slice(0, sep);
}

export type CartLine = {
	/** Clave de línea (puede ser `productId` o `productId__s_Talle`). */
	id: string;
	/** UUID del producto en `products.id`. */
	productId: string;
	name: string;
	price: number;
	listPrice?: number;
	productCode?: string;
	qty: number;
	image?: string;
	color?: string;
	size?: string;
};

export type CartAddPayload = {
	id: string;
	productId?: string;
	name: string;
	price: number;
	listPrice?: number;
	productCode?: string;
	qty?: number;
	image?: string;
	color?: string;
	size?: string;
};

export type CartContextValue = {
	items: CartLine[];
	totalCount: number;
	isOpen: boolean;
	openCart: () => void;
	closeCart: () => void;
	toggleCart: () => void;
	addItem: (item: CartAddPayload) => void;
	setLineQty: (lineId: string, qty: number) => void;
	removeLine: (lineId: string) => void;
	clearCart: () => void;
};

function isCartLine(x: unknown): x is CartLine {
	if (!x || typeof x !== 'object') return false;
	const o = x as Record<string, unknown>;
	return (
		typeof o.id === 'string' &&
		typeof o.name === 'string' &&
		typeof o.price === 'number' &&
		Number.isFinite(o.price) &&
		typeof o.qty === 'number' &&
		Number.isFinite(o.qty) &&
		o.qty >= 1
	);
}

function parseStoredLines(raw: string | null): CartLine[] {
	if (!raw?.trim()) return [];
	try {
		const data = JSON.parse(raw) as unknown;
		if (!Array.isArray(data)) return [];
		const out: CartLine[] = [];
		for (const row of data) {
			if (!isCartLine(row)) continue;
			const line = row as CartLine;
			out.push({
				...line,
				qty: Math.floor(line.qty),
				productId: line.productId ?? parseProductIdFromLineId(line.id),
				listPrice:
					line.listPrice != null && Number.isFinite(line.listPrice)
						? Number(line.listPrice)
						: undefined,
				productCode:
					typeof line.productCode === 'string' && line.productCode.trim().length > 0
						? line.productCode.trim()
						: undefined,
			});
		}
		return out;
	} catch {
		return [];
	}
}

const CartContext = createContext<CartContextValue | null>(null);

function lineIdFor(item: CartAddPayload) {
	const c = item.color?.trim();
	const s = item.size?.trim();
	if (c && s) return `${item.id}__c_${c}__s_${s}`;
	if (c) return `${item.id}__c_${c}`;
	if (s) return `${item.id}__s_${s}`;
	return item.id;
}

export function CartProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<CartLine[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [hasHydrated, setHasHydrated] = useState(false);

	useEffect(() => {
		try {
			if (typeof window === 'undefined') return;
			setItems(parseStoredLines(localStorage.getItem(STORAGE_KEY)));
		} catch {
			/* ignore */
		}
		setHasHydrated(true);
	}, []);

	useEffect(() => {
		if (!hasHydrated) return;
		try {
			if (typeof window === 'undefined') return;
			localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
		} catch {
			/* ignore quota / private mode */
		}
	}, [items, hasHydrated]);

	const openCart = useCallback(() => setIsOpen(true), []);
	const closeCart = useCallback(() => setIsOpen(false), []);
	const toggleCart = useCallback(() => setIsOpen((o) => !o), []);

	const addItem = useCallback((item: CartAddPayload) => {
		const qty = item.qty ?? 1;
		const id = lineIdFor(item);
		const productId = item.productId ?? parseProductIdFromLineId(item.id);
		setItems((prev) => {
			const i = prev.findIndex((l) => l.id === id);
			if (i === -1) {
				return [
					...prev,
					{
						id,
						productId,
						name: item.name,
						price: item.price,
						listPrice:
							item.listPrice != null && Number.isFinite(item.listPrice)
								? item.listPrice
								: undefined,
						productCode: item.productCode?.trim() || undefined,
						qty,
						image: item.image,
						color: item.color?.trim() || undefined,
						size: item.size?.trim() || undefined,
					},
				];
			}
			return prev.map((l, j) =>
				j === i ? { ...l, qty: l.qty + qty } : l,
			);
		});
	}, []);

	const setLineQty = useCallback((lineId: string, qty: number) => {
		if (qty < 1) {
			setItems((prev) => prev.filter((l) => l.id !== lineId));
			return;
		}
		setItems((prev) =>
			prev.map((l) => (l.id === lineId ? { ...l, qty } : l)),
		);
	}, []);

	const removeLine = useCallback((lineId: string) => {
		setItems((prev) => prev.filter((l) => l.id !== lineId));
	}, []);

	const clearCart = useCallback(() => setItems([]), []);

	const totalCount = useMemo(
		() => items.reduce((s, l) => s + l.qty, 0),
		[items],
	);

	const value = useMemo(
		() => ({
			items,
			totalCount,
			isOpen,
			openCart,
			closeCart,
			toggleCart,
			addItem,
			setLineQty,
			removeLine,
			clearCart,
		}),
		[
			items,
			totalCount,
			isOpen,
			openCart,
			closeCart,
			toggleCart,
			addItem,
			setLineQty,
			removeLine,
			clearCart,
		],
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
