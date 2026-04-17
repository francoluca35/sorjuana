export const BEST_SELLERS_IDS_STORAGE_KEY = 'sj-mas-vendidos-ids-v1';

export const BEST_SELLERS_UPDATED_EVENT = 'sj-mas-vendidos-updated';

export const BEST_SELLERS_MAX = 4;

export { parseStoredProductIds, serializeProductIds, resolveRecentArrivalsForDisplay } from '@/lib/recentArrivalsSelection';

export function broadcastBestSellersSelectionUpdated() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(BEST_SELLERS_UPDATED_EVENT));
}

export function subscribeBestSellersStorage(onStoreChange: () => void) {
	if (typeof window === 'undefined') return () => {};
	const on = () => onStoreChange();
	window.addEventListener(BEST_SELLERS_UPDATED_EVENT, on);
	window.addEventListener('storage', on);
	return () => {
		window.removeEventListener(BEST_SELLERS_UPDATED_EVENT, on);
		window.removeEventListener('storage', on);
	};
}

export function getBestSellersStorageSnapshot(): string {
	if (typeof window === 'undefined') return '';
	return localStorage.getItem(BEST_SELLERS_IDS_STORAGE_KEY) ?? '';
}

export function getBestSellersStorageServerSnapshot(): string {
	return '';
}
