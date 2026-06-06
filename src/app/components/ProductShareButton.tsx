'use client';

import * as React from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { shareProductLink } from '@/lib/productShare';
import { cn } from '@/app/components/ui/utils';

type ProductShareButtonProps = {
	productId: string;
	productName: string;
	price?: number;
	variant?: 'card' | 'modal';
	className?: string;
};

export function ProductShareButton({
	productId,
	productName,
	price,
	variant = 'card',
	className,
}: ProductShareButtonProps) {
	const [busy, setBusy] = React.useState(false);

	async function onShare(e: React.MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		e.stopPropagation();
		if (busy) return;

		setBusy(true);
		try {
			const result = await shareProductLink({
				productId,
				name: productName,
				price,
			});
			if (result === 'copied') {
				toast.success('Enlace copiado. Pegalo en WhatsApp o donde quieras compartir.');
			} else if (result === 'whatsapp') {
				toast.message('Se abrió WhatsApp para compartir la prenda.');
			}
		} finally {
			setBusy(false);
		}
	}

	return (
		<button
			type="button"
			onClick={onShare}
			disabled={busy}
			aria-label={`Compartir ${productName}`}
			className={cn(
				'inline-flex touch-manipulation items-center justify-center transition active:scale-95 disabled:opacity-60',
				variant === 'card'
					? 'absolute top-3 right-3 z-30 h-9 w-9 rounded-full border border-white/40 bg-[#1a1410]/55 text-white shadow-sm backdrop-blur-sm hover:bg-[#1a1410]/75 md:opacity-0 md:group-hover:opacity-100'
					: 'h-11 w-11 rounded-full bg-black/70 text-white shadow-md hover:bg-black/85 md:h-10 md:w-10 md:bg-black/60 md:backdrop-blur-sm',
				className,
			)}
		>
			<Share2 className={variant === 'card' ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={1.8} aria-hidden />
		</button>
	);
}
