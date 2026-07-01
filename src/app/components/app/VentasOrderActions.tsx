'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { markSalesOrderPaid, cancelSalesOrder } from '@/app/actions/salesOrders';
import type { SalesOrderStatus } from '@/lib/data/salesOrders';
import { cn } from '@/app/components/ui/utils';

const sans = { fontFamily: 'Montserrat, sans-serif' } as const;

function statusLabel(s: SalesOrderStatus): { text: string; className: string } {
	switch (s) {
		case 'pending':
			return { text: 'Reservado', className: 'bg-amber-200 text-amber-950 ring-amber-400/80' };
		case 'paid':
			return { text: 'Pagado', className: 'bg-emerald-200 text-emerald-950 ring-emerald-400/80' };
		case 'cancelled':
			return { text: 'Cancelado', className: 'bg-red-200 text-red-950 ring-red-400/80' };
		default:
			return { text: s, className: 'bg-black/5 text-black/70' };
	}
}

export function VentasOrderStatusBadge({ status }: { status: SalesOrderStatus }) {
	const { text, className } = statusLabel(status);
	return (
		<span
			className={cn(
				'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
				className,
			)}
			style={sans}
		>
			{text}
		</span>
	);
}

export function VentasOrderActions({ orderId }: { orderId: string }) {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	function onConfirmPayment() {
		const ok = window.confirm(
			'¿Confirmás el pago de este pedido?\n\nEl estado pasará a Pagado y se descontará el stock de los productos.',
		);
		if (!ok) return;

		startTransition(async () => {
			const r = await markSalesOrderPaid(orderId);
			if (r.ok) {
				if (r.sentAutomatically) {
					toast.success('Pago confirmado. Stock descontado. Aviso enviado por WhatsApp.');
				} else if (r.fallbackUrl) {
					window.open(r.fallbackUrl, '_blank', 'noopener,noreferrer');
					toast.success('Pago confirmado y stock descontado.', {
						description: r.notifyWarning,
						duration: 20_000,
					});
				} else {
					toast.success(r.notifyWarning ?? 'Pago confirmado. Stock descontado.');
				}
				router.refresh();
			} else {
				toast.error(r.error);
			}
		});
	}

	function onCancel() {
		const ok = window.confirm('¿Cancelar este pedido reservado?');
		if (!ok) return;

		startTransition(async () => {
			const r = await cancelSalesOrder(orderId);
			if (r.ok) {
				toast.success('Pedido cancelado.');
				router.refresh();
			} else {
				toast.error(r.error);
			}
		});
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<button
				type="button"
				disabled={isPending}
				onClick={onConfirmPayment}
				className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-xs font-semibold tracking-wide text-white transition hover:bg-emerald-900 disabled:opacity-50"
				style={sans}
			>
				<CheckCircle2 className="size-4 shrink-0" aria-hidden />
				{isPending ? 'Procesando…' : 'Confirmar pago'}
			</button>
			<button
				type="button"
				disabled={isPending}
				onClick={onCancel}
				className="inline-flex h-10 items-center rounded-md border border-[#a34963]/50 bg-white px-4 py-2 text-xs font-medium tracking-wide text-[#a34963] transition hover:bg-[#a34963]/10 disabled:opacity-50"
				style={sans}
			>
				Cancelar
			</button>
		</div>
	);
}
