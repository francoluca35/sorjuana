/** Disparado tras guardar descuentos globales en admin (Precios). */
export const PRICE_SETTINGS_UPDATED_EVENT = 'sj-price-settings-updated';

export function notifyPriceSettingsUpdated(): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(PRICE_SETTINGS_UPDATED_EVENT));
}
