'use client';

import Image from 'next/image';
import { useEffect, useLayoutEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShoppingBag, X, Minus, Plus, Trash2, Loader2, Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCart, parseProductIdFromLineId } from '@/app/context/CartContext';
import { checkoutAndReserve } from '@/app/actions/checkout';
import { quoteShippingByPostalCodeAction } from '@/app/actions/shippingQuote';
import { normalizeArgentinaPostalCode } from '@/lib/shipping/correoQuote';
import { cn } from '@/app/components/ui/utils';

type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta';

const accent = '#a34963';
const serif = { fontFamily: '"Cormorant Garamond", serif' } as const;
const sans = { fontFamily: 'Montserrat, sans-serif' } as const;

function formatMoney(n: number) {
	return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const inputClass =
	'mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-base text-[#1a1410] outline-none transition placeholder:text-black/35 focus:border-[#a34963]/50 md:text-sm';

export function CartSheet() {
	const {
		isOpen,
		closeCart,
		items,
		totalCount,
		setLineQty,
		removeLine,
		clearCart,
	} = useCart();
	const router = useRouter();

	const [desktop, setDesktop] = useState(false);
	const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout'>('cart');
	const [custName, setCustName] = useState('');
	const [custPhone, setCustPhone] = useState('');
	const [custLocality, setCustLocality] = useState('');
	const [custAddress, setCustAddress] = useState('');
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
	const [showCheckoutProducts, setShowCheckoutProducts] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [shippingCp, setShippingCp] = useState('');
	const [shippingAmount, setShippingAmount] = useState<number | null>(null);
	const [shippingValidForCp, setShippingValidForCp] = useState<string | null>(null);
	const [shippingLoading, setShippingLoading] = useState(false);
	const [shippingError, setShippingError] = useState<string | null>(null);

	useLayoutEffect(() => {
		const mq = window.matchMedia('(min-width: 768px)');
		setDesktop(mq.matches);
		const sync = () => setDesktop(mq.matches);
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	}, []);

	useEffect(() => {
		if (!isOpen) {
			setCheckoutStep('cart');
			setSubmitting(false);
			setPaymentMethod('efectivo');
			setShowCheckoutProducts(false);
			setShippingCp('');
			setShippingAmount(null);
			setShippingValidForCp(null);
			setShippingError(null);
		}
	}, [isOpen]);

	useEffect(() => {
		if (items.length === 0) setCheckoutStep('cart');
	}, [items.length]);

	useEffect(() => {
		if (checkoutStep !== 'checkout') setShowCheckoutProducts(false);
	}, [checkoutStep]);

	useEffect(() => {
		if (!isOpen) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeCart();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [isOpen, closeCart]);

	const discountedSubtotal = useMemo(
		() => items.reduce((s, l) => s + l.price * l.qty, 0),
		[items],
	);

	const checkoutSubtotal = useMemo(() => {
		return items.reduce((sum, l) => {
			const effectiveUnitPrice =
				paymentMethod === 'tarjeta'
					? l.listPrice != null && l.listPrice > 0
						? l.listPrice
						: l.price
					: l.price;
			return sum + effectiveUnitPrice * l.qty;
		}, 0);
	}, [items, paymentMethod]);

	const cpNormalized = useMemo(() => normalizeArgentinaPostalCode(shippingCp), [shippingCp]);
	const shippingApplies =
		shippingAmount != null &&
		shippingValidForCp != null &&
		cpNormalized === shippingValidForCp &&
		cpNormalized.length >= 4;

	const checkoutGrandTotal = useMemo(
		() => checkoutSubtotal + (shippingApplies ? shippingAmount : 0),
		[checkoutSubtotal, shippingApplies, shippingAmount],
	);

	async function onCalculateShipping() {
		setShippingError(null);
		const cp = normalizeArgentinaPostalCode(shippingCp);
		if (cp.length < 4) {
			setShippingError('Ingresá un código postal de al menos 4 dígitos.');
			return;
		}
		setShippingLoading(true);
		try {
			const r = await quoteShippingByPostalCodeAction(cp);
			if (!r.ok) {
				setShippingAmount(null);
				setShippingValidForCp(null);
				setShippingError(r.message);
				return;
			}
			setShippingAmount(r.amountArs);
			setShippingValidForCp(cp);
			toast.success(`Envío estimado: ${formatMoney(r.amountArs)}`);
		} catch (e) {
			setShippingAmount(null);
			setShippingValidForCp(null);
			setShippingError(e instanceof Error ? e.message : 'No se pudo cotizar el envío.');
		} finally {
			setShippingLoading(false);
		}
	}

	async function onWhatsAppCheckout(e: FormEvent) {
		e.preventDefault();
		if (items.length === 0) return;
		setSubmitting(true);
		try {
			const r = await checkoutAndReserve(
				{
					name: custName,
					phone: custPhone,
					locality: custLocality,
					address: custAddress,
					...(shippingApplies && shippingAmount != null
						? {
								shippingPostalCode: cpNormalized,
								shippingCostArs: shippingAmount,
							}
						: {}),
				},
				items.map((l) => ({
					productId: l.productId || parseProductIdFromLineId(l.id),
					size: l.size ?? null,
					qty: l.qty,
				})),
				paymentMethod,
				items.map((l) => ({
					productId: l.productId || parseProductIdFromLineId(l.id),
					productCode: l.productCode ?? null,
					name: l.name,
					size: l.size ?? null,
					qty: l.qty,
					discountedUnitPrice: l.price,
					listUnitPrice:
						l.listPrice != null && l.listPrice > 0 ? l.listPrice : l.price,
				})),
			);
			if (r.ok) {
				window.open(r.whatsappUrl, '_blank', 'noopener,noreferrer');
				clearCart();
				setCustName('');
				setCustPhone('');
				setCustLocality('');
				setCustAddress('');
				setPaymentMethod('efectivo');
				setShippingCp('');
				setShippingAmount(null);
				setShippingValidForCp(null);
				setShippingError(null);
				setCheckoutStep('cart');
				closeCart();
				toast.success('Pedido registrado. Se reservó el stock y se abrió WhatsApp.');
				router.refresh();
			} else {
				toast.error(r.error);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error al procesar el pedido.');
		} finally {
			setSubmitting(false);
		}
	}

	const sheetTransition = {
		type: 'spring' as const,
		damping: 34,
		stiffness: 360,
		mass: 0.85,
	};

	return (
		<AnimatePresence>
			{isOpen ? (
				<div className="fixed inset-0 z-[220]" aria-hidden={!isOpen}>
					<motion.button
						type="button"
						key="cart-scrim"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
						className="fixed inset-0 z-0 bg-black/50 md:bg-black/45 md:backdrop-blur-[2px]"
						aria-label="Cerrar carrito"
						onClick={closeCart}
					/>

					<motion.div
						key="cart-panel"
						role="dialog"
						aria-modal="true"
						aria-labelledby="cart-sheet-title"
						initial={
							desktop
								? { x: '100%', opacity: 1 }
								: { y: '100%', opacity: 1 }
						}
						animate={desktop ? { x: 0 } : { y: 0 }}
						exit={desktop ? { x: '100%' } : { y: '100%' }}
						transition={sheetTransition}
						className={cn(
							'fixed z-10 flex h-[min(92dvh,100dvh)] max-h-[min(92dvh,100dvh)] min-h-0 w-full flex-col overflow-hidden bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)]',
							'bottom-0 left-0 right-0 rounded-t-[1.35rem]',
							'md:bottom-0 md:top-0 md:left-auto md:right-0 md:h-auto md:max-h-[100dvh] md:w-full md:max-w-[min(22.5rem,100vw)] md:rounded-none md:rounded-l-[1.25rem] md:shadow-[-12px_0_48px_rgba(0,0,0,0.12)]',
						)}
						style={{
							paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
						}}
					>
						<div
							className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-black/10 md:hidden"
							aria-hidden
						/>

						<header className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] px-5 pb-4 pt-3 md:pt-5">
							<div className="flex min-w-0 items-center gap-3">
								<ShoppingBag
									className="h-6 w-6 shrink-0"
									strokeWidth={1.35}
									style={{ color: accent }}
									aria-hidden
								/>
								<div className="min-w-0">
									<h2
										id="cart-sheet-title"
										className="text-xl leading-tight tracking-tight text-[#1a1410] md:text-2xl"
										style={{ ...serif, fontWeight: 600 }}
									>
										Mi Carrito{' '}
										<span className="font-bold tabular-nums">{totalCount}</span>
									</h2>
								</div>
							</div>
							<button
								type="button"
								onClick={closeCart}
								className="rounded-full p-2 text-[#1a1410]/55 transition hover:bg-black/[0.05] hover:text-[#1a1410]"
								aria-label="Cerrar"
							>
								<X className="h-5 w-5" strokeWidth={1.5} />
							</button>
						</header>

						{items.length === 0 ? (
							<>
								<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
									<p
										className="py-10 text-center text-sm text-black/50"
										style={sans}
									>
										Tu carrito está vacío.
										<br />
										<Link
											href="/catalogo"
											onClick={closeCart}
											className="mt-3 inline-block font-medium underline decoration-[#a34963]/40 underline-offset-4"
											style={{ color: accent }}
										>
											Ver catálogo
										</Link>
									</p>
								</div>
								<footer className="shrink-0 border-t border-black/[0.06] px-5 pt-4">
									<div
										className="mb-4 flex items-baseline justify-between gap-3 text-[#1a1410]"
										style={serif}
									>
										<span className="text-lg" style={{ fontWeight: 500 }}>
											Total estimado
										</span>
										<span className="text-xl font-semibold">
											{formatMoney(discountedSubtotal)}
										</span>
									</div>
									<button
										type="button"
										onClick={closeCart}
										className={cn(
											'mb-3 flex w-full items-center justify-center rounded-xl border-2 border-[#a34963]/35 bg-white py-3 text-center text-xs font-semibold tracking-[0.1em] text-[#a34963] transition hover:bg-[#a34963]/8 active:scale-[0.99]',
										)}
										style={sans}
									>
										Seguir comprando
									</button>
									<button
										type="button"
										disabled
										className={cn(
											'flex w-full items-center justify-center rounded-xl py-3.5 text-center text-xs font-semibold tracking-[0.12em] text-white transition pointer-events-none opacity-45',
										)}
										style={{ ...sans, backgroundColor: accent }}
									>
										PROCEDER AL PAGO
									</button>
									<button
										type="button"
										disabled
										className="mt-3 w-full py-2 text-sm font-medium text-black/25"
										style={sans}
									>
										Vaciar carrito
									</button>
								</footer>
							</>
						) : checkoutStep === 'checkout' ? (
							<form
								onSubmit={onWhatsAppCheckout}
								className="flex min-h-0 min-w-0 flex-1 flex-col"
							>
								<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 touch-pan-y">
									<button
										type="button"
										onClick={() => setCheckoutStep('cart')}
										className="mb-3 text-left text-xs font-medium text-[#a34963] underline-offset-4 hover:underline"
										style={sans}
									>
										← Volver al carrito
									</button>
									<div>
										<button
											type="button"
											onClick={() => setShowCheckoutProducts((v) => !v)}
											className="mb-1 w-full rounded-lg border border-black/10 bg-[#faf8f6] px-3 py-2.5 text-left text-xs font-semibold tracking-[0.06em] text-[#1a1410] transition hover:bg-[#f5f2ed]"
											style={sans}
										>
											{showCheckoutProducts ? 'Ocultar productos' : 'Ver productos'}
										</button>
										{showCheckoutProducts ? (
											<div className="max-h-[min(40vh,15rem)] overflow-y-auto overscroll-contain rounded-lg border border-black/10 bg-white px-3 py-2.5">
												<ul className="space-y-2">
													{items.map((line) => {
														const unitPrice =
															paymentMethod === 'tarjeta'
																? line.listPrice != null && line.listPrice > 0
																	? line.listPrice
																	: line.price
																: line.price;
														return (
															<li key={line.id} className="border-b border-black/[0.06] pb-2 last:border-b-0 last:pb-0">
																<p className="text-xs font-semibold text-[#1a1410]" style={sans}>
																	{line.name}
																</p>
																<p className="mt-0.5 text-[11px] text-black/65" style={sans}>
																	Talle: {line.size?.trim() || '—'} · Color: {line.color?.trim() || '—'}
																</p>
																<p className="mt-0.5 text-[11px] text-black/75" style={sans}>
																	{line.qty} × {formatMoney(unitPrice)}
																</p>
															</li>
														);
													})}
												</ul>
											</div>
										) : null}
									</div>
									<div className="mt-3 space-y-3">
										<div>
											<label className="text-xs font-medium text-black/60" style={sans}>
												Nombre y apellido
											</label>
											<input
												required
												name="name"
												autoComplete="name"
												value={custName}
												onChange={(e) => setCustName(e.target.value)}
												className={inputClass}
												placeholder="Tu nombre"
											/>
										</div>
										<div>
											<label className="text-xs font-medium text-black/60" style={sans}>
												Teléfono
											</label>
											<input
												required
												name="phone"
												type="tel"
												autoComplete="tel"
												inputMode="tel"
												value={custPhone}
												onChange={(e) => setCustPhone(e.target.value)}
												className={inputClass}
												placeholder="Código de área + número"
											/>
										</div>
										<div>
											<label className="text-xs font-medium text-black/60" style={sans}>
												Localidad
											</label>
											<input
												required
												name="locality"
												autoComplete="address-level2"
												value={custLocality}
												onChange={(e) => setCustLocality(e.target.value)}
												className={inputClass}
												placeholder="Ciudad o localidad"
											/>
										</div>
										<div className="rounded-lg border border-black/10 bg-[#faf8f6] p-3">
											<p
												className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1a1410]"
												style={sans}
											>
												Calcular precio de envío
											</p>
											<p className="mt-1 text-[11px] leading-snug text-black/50" style={sans}>
												Ingresá el código postal de destino para ver el costo estimado de envío.
											</p>
											<div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
												<div className="min-w-0 flex-1">
													<label className="text-xs font-medium text-black/60" style={sans}>
														Código postal
													</label>
													<input
														type="text"
														inputMode="numeric"
														autoComplete="postal-code"
														value={shippingCp}
														onChange={(e) => setShippingCp(e.target.value)}
														className={inputClass}
														placeholder="Ej: 1722"
														maxLength={8}
													/>
												</div>
												<button
													type="button"
													onClick={() => void onCalculateShipping()}
													disabled={shippingLoading}
													className={cn(
														'flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#a34963]/40 bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.08em] text-[#a34963] transition hover:bg-[#a34963]/10 disabled:pointer-events-none disabled:opacity-50',
													)}
													style={sans}
												>
													{shippingLoading ? (
														<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
													) : (
														<Package className="h-4 w-4" aria-hidden />
													)}
													Calcular envío
												</button>
											</div>
											{shippingError ? (
												<p className="mt-2 text-[11px] text-red-600" style={sans}>
													{shippingError}
												</p>
											) : null}
											{shippingAmount != null && shippingValidForCp ? (
												<p className="mt-2 text-sm font-semibold text-[#1a1410]" style={sans}>
													Envío estimado (CP {shippingValidForCp}):{' '}
													<span style={{ color: accent }}>{formatMoney(shippingAmount)}</span>
												</p>
											) : null}
											{shippingAmount != null &&
											shippingValidForCp &&
											cpNormalized !== shippingValidForCp ? (
												<p className="mt-2 text-[11px] text-amber-800" style={sans}>
													El código postal cambió: tocá «Calcular envío» de nuevo para actualizar el
													importe.
												</p>
											) : null}
										</div>
										<div>
											<label className="text-xs font-medium text-black/60" style={sans}>
												Pagar con
											</label>
											<select
												name="payment_method"
												value={paymentMethod}
												onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
												className={inputClass}
											>
												<option value="efectivo">Efectivo</option>
												<option value="transferencia">Transferencia</option>
												<option value="tarjeta">Tarjeta</option>
											</select>
										</div>
										<div>
											<label className="text-xs font-medium text-black/60" style={sans}>
												Dirección
											</label>
											<input
												required
												name="address"
												autoComplete="street-address"
												value={custAddress}
												onChange={(e) => setCustAddress(e.target.value)}
												className={inputClass}
												placeholder="Calle y número"
											/>
										</div>
									</div>
									<p className="mt-4 text-center text-[11px] leading-snug text-black/45" style={sans}>
										Al confirmar se reserva el stock, se guarda el pedido en el panel y se abre
										WhatsApp con el mensaje listo para enviar.
									</p>
									{paymentMethod === 'tarjeta' ? (
										<p className="mt-2 text-center text-[11px] leading-snug text-black/50" style={sans}>
											Con tarjeta se usa el precio de lista.
										</p>
									) : null}
								</div>
								<footer className="shrink-0 border-t border-black/[0.06] bg-white px-5 pt-4 pb-1">
									<div className="mb-3 space-y-2 text-[#1a1410]" style={serif}>
										<div className="flex items-baseline justify-between gap-3 text-sm">
											<span style={{ fontWeight: 500 }}>Productos</span>
											<span className="tabular-nums">{formatMoney(checkoutSubtotal)}</span>
										</div>
										{shippingApplies ? (
											<div className="flex items-baseline justify-between gap-3 text-sm text-black/75">
												<span style={{ fontWeight: 500 }}>Envío (CP {shippingValidForCp})</span>
												<span className="tabular-nums">{formatMoney(shippingAmount ?? 0)}</span>
											</div>
										) : null}
										<div className="flex items-baseline justify-between gap-3 border-t border-black/[0.06] pt-2">
											<span className="text-lg" style={{ fontWeight: 500 }}>
												Total estimado
											</span>
											<span className="text-xl font-semibold tabular-nums">
												{formatMoney(checkoutGrandTotal)}
											</span>
										</div>
									</div>
									<button
										type="submit"
										disabled={submitting || items.length === 0}
										className={cn(
											'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-center text-xs font-semibold tracking-[0.12em] text-white transition hover:opacity-95 active:scale-[0.99]',
											(submitting || items.length === 0) && 'pointer-events-none opacity-60',
										)}
										style={{ ...sans, backgroundColor: accent }}
									>
										{submitting ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
												Procesando…
											</>
										) : (
											'Comprar por WhatsApp'
										)}
									</button>
								</footer>
							</form>
						) : (
							<>
								<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 touch-pan-y">
									<ul className="space-y-5">
										{items.map((line) => (
											<li
												key={line.id}
												className="flex gap-3 border-b border-black/[0.05] pb-5 last:border-0 last:pb-0"
											>
												<div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-[#f5f2ed]">
													{line.image ? (
														<Image
															src={line.image}
															alt=""
															fill
															unoptimized
															className="object-cover"
															sizes="72px"
														/>
													) : (
														<div
															className="flex h-full w-full items-center justify-center text-xs text-black/35"
															style={sans}
														>
															Sin foto
														</div>
													)}
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex justify-between gap-2">
														<div className="min-w-0">
															<p
																className="text-[0.95rem] leading-snug text-[#1a1410] md:text-base"
																style={{ ...serif, fontWeight: 500 }}
															>
																{line.name}
															</p>
															{line.size ? (
																<p
																	className="mt-0.5 text-xs text-[#a34963]/80"
																	style={sans}
																>
																	{line.color ? `Color: ${line.color}` : ''}
																	{line.color && line.size ? ' · ' : ''}
																	{line.size ? `Talla: ${line.size}` : ''}
																</p>
															) : line.color ? (
																<p
																	className="mt-0.5 text-xs text-[#a34963]/80"
																	style={sans}
																>
																	Color: {line.color}
																</p>
															) : null}
														</div>
														<button
															type="button"
															onClick={() => removeLine(line.id)}
															className="shrink-0 rounded-md p-1.5 text-black/35 transition hover:bg-red-50 hover:text-red-600"
															aria-label={`Quitar ${line.name}`}
														>
															<Trash2 className="h-4 w-4" strokeWidth={1.5} />
														</button>
													</div>
													<p
														className="mt-1 text-base font-semibold"
														style={{ ...sans, color: accent }}
													>
														{formatMoney(line.price)}
													</p>
													<div className="mt-3 flex items-center gap-3">
														<div
															className="inline-flex items-center rounded-full border border-black/[0.1] bg-white px-1 py-0.5"
															style={sans}
														>
															<button
																type="button"
																className="flex h-8 w-8 items-center justify-center rounded-full text-[#1a1410] transition hover:bg-black/[0.05]"
																aria-label="Menos"
																onClick={() =>
																	setLineQty(line.id, line.qty - 1)
																}
															>
																<Minus className="h-3.5 w-3.5" strokeWidth={2} />
															</button>
															<span className="min-w-[1.5rem] text-center text-sm tabular-nums">
																{line.qty}
															</span>
															<button
																type="button"
																className="flex h-8 w-8 items-center justify-center rounded-full text-[#1a1410] transition hover:bg-black/[0.05]"
																aria-label="Más"
																onClick={() =>
																	setLineQty(line.id, line.qty + 1)
																}
															>
																<Plus className="h-3.5 w-3.5" strokeWidth={2} />
															</button>
														</div>
													</div>
												</div>
											</li>
										))}
									</ul>
								</div>
								<footer className="shrink-0 border-t border-black/[0.06] px-5 pt-4">
									<div
										className="mb-4 flex items-baseline justify-between gap-3 text-[#1a1410]"
										style={serif}
									>
										<span className="text-lg" style={{ fontWeight: 500 }}>
											Total estimado
										</span>
										<span className="text-xl font-semibold">
											{formatMoney(discountedSubtotal)}
										</span>
									</div>
									<button
										type="button"
										onClick={closeCart}
										className={cn(
											'mb-3 flex w-full items-center justify-center rounded-xl border-2 border-[#a34963]/35 bg-white py-3 text-center text-xs font-semibold tracking-[0.1em] text-[#a34963] transition hover:bg-[#a34963]/8 active:scale-[0.99]',
										)}
										style={sans}
									>
										Seguir comprando
									</button>
									<button
										type="button"
										onClick={() => items.length > 0 && setCheckoutStep('checkout')}
										disabled={items.length === 0}
										className={cn(
											'flex w-full items-center justify-center rounded-xl py-3.5 text-center text-xs font-semibold tracking-[0.12em] text-white transition hover:opacity-95 active:scale-[0.99]',
											items.length === 0 && 'pointer-events-none opacity-45',
										)}
										style={{ ...sans, backgroundColor: accent }}
									>
										PROCEDER AL PAGO
									</button>
									<button
										type="button"
										onClick={() => clearCart()}
										disabled={items.length === 0}
										className={cn(
											'mt-3 w-full py-2 text-sm font-medium transition',
											items.length === 0
												? 'text-black/25'
												: 'text-[#a34963] hover:underline',
										)}
										style={sans}
									>
										Vaciar carrito
									</button>
								</footer>
							</>
						)}
					</motion.div>
				</div>
			) : null}
		</AnimatePresence>
	);
}
