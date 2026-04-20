'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { getPriceSettingsAction, savePriceSettingsAction } from '@/app/actions/priceSettings';

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

export function PreciosAdminPanel() {
	const [cashDiscount, setCashDiscount] = useState('');
	const [transferDiscount, setTransferDiscount] = useState('');
	const [basePrice, setBasePrice] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const data = await getPriceSettingsAction();
				if (cancelled) return;
				setCashDiscount(String(data.cashDiscountPercent));
				setTransferDiscount(String(data.transferDiscountPercent));
			} catch {
				if (!cancelled) {
					toast.error('No se pudieron cargar los descuentos guardados.');
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

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
			toast.success('Descuentos guardados en la base de datos.');
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
					Configurá los descuentos globales por medio de pago. Se guardan en base de datos y se usan para
					calcular precio final desde un precio base.
				</p>
			</header>

			<section className="rounded-lg border border-[#b8956a]/25 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<Label htmlFor="cash-discount">Precio efectivo - porcentaje de descuento (%)</Label>
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
						<Label htmlFor="transfer-discount">Precio transferencia - porcentaje de descuento (%)</Label>
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
						{saving ? 'Guardando…' : 'Guardar'}
					</Button>
					{loading ? (
						<p className="self-center text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
							Cargando configuración...
						</p>
					) : null}
				</div>
			</section>

			<section className="rounded-lg border border-[#b8956a]/25 bg-[#faf8f5]/90 p-5 shadow-sm sm:p-6">
				<h2 className="text-lg font-light text-[#1a1410]" style={{ fontFamily: serif }}>
					Cálculo rápido
				</h2>
				<p className="mt-1 text-sm text-[#6b6156]" style={{ fontFamily: sans }}>
					Precio final = precio base - descuento.
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
