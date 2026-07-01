'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { getPriceSettingsAction, savePriceSettingsAction } from '@/app/actions/priceSettings';
import { notifyPriceSettingsUpdated } from '@/lib/priceSettingsEvents';

const sans = 'Montserrat, sans-serif';
const serif = "'Cormorant Garamond', serif";

function parsePercentInput(raw: string): number {
	const normalized = raw.trim().replace(',', '.');
	const n = Number.parseFloat(normalized);
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(100, n));
}

function parseMoneyInput(raw: string): number {
	const normalized = raw.replace(/\./g, '').replace(',', '.');
	const n = Number.parseFloat(normalized);
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, n);
}

function applyDiscount(basePrice: number, discountPercent: number): number {
	const pct = Math.max(0, Math.min(100, discountPercent));
	return Math.max(0, Math.round(basePrice * (1 - pct / 100)));
}

function formatMoneyAR(n: number): string {
	return `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function formatPercentDisplay(n: number): string {
	return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}

export function PreciosAdminPanel() {
	const [cashDiscount, setCashDiscount] = useState('');
	const [transferDiscount, setTransferDiscount] = useState('');
	const [basePrice, setBasePrice] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [hasStoredDoc, setHasStoredDoc] = useState(false);

	const loadSettings = useCallback(async () => {
		setLoading(true);
		try {
			const data = await getPriceSettingsAction();
			setCashDiscount(formatPercentDisplay(data.cashDiscountPercent));
			setTransferDiscount(formatPercentDisplay(data.transferDiscountPercent));
			setHasStoredDoc(data.hasStoredDoc);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'No se pudieron cargar los descuentos desde Firestore.';
			toast.error(msg);
			setHasStoredDoc(false);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadSettings();
	}, [loadSettings]);

	const cashDiscountValue = useMemo(() => parsePercentInput(cashDiscount), [cashDiscount]);
	const transferDiscountValue = useMemo(() => parsePercentInput(transferDiscount), [transferDiscount]);
	const basePriceValue = useMemo(() => parseMoneyInput(basePrice), [basePrice]);

	const cashPrice = useMemo(
		() => applyDiscount(basePriceValue, cashDiscountValue),
		[basePriceValue, cashDiscountValue],
	);
	const transferPrice = useMemo(
		() => applyDiscount(basePriceValue, transferDiscountValue),
		[basePriceValue, transferDiscountValue],
	);

	async function onSave() {
		if (saving) return;
		setSaving(true);
		try {
			const result = await savePriceSettingsAction({
				cashDiscountPercent: cashDiscountValue,
				transferDiscountPercent: transferDiscountValue,
			});
			if (!result.ok) {
				toast.error(result.message);
				return;
			}

			setHasStoredDoc(true);
			notifyPriceSettingsUpdated();
			await loadSettings();

			if (result.warning) {
				toast.warning(result.warning);
			}

			toast.success(
				result.updatedProducts > 0
					? `Descuentos guardados en Firestore (efectivo ${cashDiscountValue}%, transferencia ${transferDiscountValue}%). Se actualizaron ${result.updatedProducts} producto(s).`
					: `Descuentos guardados en Firestore: efectivo ${cashDiscountValue}%, transferencia ${transferDiscountValue}%.`,
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="mx-auto max-w-3xl space-y-8">
			<header>
				<h1 className="text-2xl font-light text-[#1a1410] sm:text-3xl" style={{ fontFamily: serif }}>
					Precios
				</h1>
				<p className="mt-2 text-sm text-[#6b6156]" style={{ fontFamily: sans }}>
					Configurá los descuentos globales por medio de pago. Se guardan por separado en Firestore (
					<code className="text-xs">price_settings.cash_discount_percent</code> y{' '}
					<code className="text-xs">price_settings.transfer_discount_percent</code>). Al guardar, se recalculan
					automáticamente los precios de todas las prendas según su costo de prenda.
				</p>
				{loading ? (
					<p className="mt-2 text-xs text-[#8a7a68]" style={{ fontFamily: sans }}>
						Cargando descuentos guardados…
					</p>
				) : (
					<p className="mt-2 text-xs text-[#8a7a68]" style={{ fontFamily: sans }}>
						{hasStoredDoc
							? 'Mostrando los porcentajes guardados en la base de datos.'
							: 'Aún no hay descuentos guardados: se muestran 0% hasta que publiques valores.'}
					</p>
				)}
			</header>

			<section className="rounded-lg border border-[#b8956a]/25 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<Label htmlFor="cash-discount">Precio efectivo — porcentaje de descuento (%)</Label>
						<Input
							id="cash-discount"
							inputMode="decimal"
							value={cashDiscount}
							onChange={(e) => setCashDiscount(e.target.value)}
							placeholder="0"
							className="mt-1.5 border-[#b8956a]/30"
							disabled={loading || saving}
						/>
					</div>
					<div>
						<Label htmlFor="transfer-discount">Precio transferencia — porcentaje de descuento (%)</Label>
						<Input
							id="transfer-discount"
							inputMode="decimal"
							value={transferDiscount}
							onChange={(e) => setTransferDiscount(e.target.value)}
							placeholder="0"
							className="mt-1.5 border-[#b8956a]/30"
							disabled={loading || saving}
						/>
					</div>
				</div>
				<div className="mt-5 flex flex-wrap gap-3">
					<Button
						type="button"
						onClick={() => void onSave()}
						disabled={loading || saving}
						className="bg-[#1a1410] text-[#f5f2ed] hover:bg-[#b8956a]"
						style={{ fontFamily: sans }}
					>
						{saving ? 'Guardando…' : 'Guardar en base de datos'}
					</Button>
				</div>
			</section>

			<section className="rounded-lg border border-[#b8956a]/25 bg-[#faf8f5]/90 p-5 shadow-sm sm:p-6">
				<h2 className="text-lg font-light text-[#1a1410]" style={{ fontFamily: serif }}>
					Cálculo rápido
				</h2>
				<p className="mt-1 text-sm text-[#6b6156]" style={{ fontFamily: sans }}>
					Precio final = precio base − descuento. Efectivo y transferencia usan su propio porcentaje.
				</p>
				<div className="mt-4 grid gap-4 sm:grid-cols-3">
					<div>
						<Label htmlFor="base-price">Precio base</Label>
						<Input
							id="base-price"
							inputMode="decimal"
							value={basePrice}
							onChange={(e) => setBasePrice(e.target.value)}
							placeholder="0"
							className="mt-1.5 border-[#b8956a]/30"
						/>
					</div>
					<div className="rounded-md border border-[#b8956a]/25 bg-white/80 p-3">
						<p className="text-[11px] uppercase tracking-[0.14em] text-[#8b6f47]" style={{ fontFamily: sans }}>
							Efectivo ({cashDiscountValue}%)
						</p>
						<p className="mt-1 text-lg text-[#1a1410]" style={{ fontFamily: serif }}>
							{formatMoneyAR(cashPrice)}
						</p>
					</div>
					<div className="rounded-md border border-[#b8956a]/25 bg-white/80 p-3">
						<p className="text-[11px] uppercase tracking-[0.14em] text-[#8b6f47]" style={{ fontFamily: sans }}>
							Transferencia ({transferDiscountValue}%)
						</p>
						<p className="mt-1 text-lg text-[#1a1410]" style={{ fontFamily: serif }}>
							{formatMoneyAR(transferPrice)}
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
