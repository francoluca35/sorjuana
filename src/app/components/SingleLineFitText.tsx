'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

export type SingleLineFitTextProps = {
	children: string;
	className?: string;
	wrapperClassName?: string;
	/** Alineación del bloque respecto al contenedor (el texto sigue en una sola línea). */
	align?: 'center' | 'left' | 'right';
	style?: React.CSSProperties;
	minFontSizePx?: number;
	maxFontSizePx?: number;
};

/**
 * Mantiene el texto en una sola línea reduciendo font-size hasta entrar en el ancho disponible.
 */
export function SingleLineFitText({
	children,
	className,
	wrapperClassName,
	align = 'center',
	style,
	minFontSizePx = 8,
	maxFontSizePx = 32,
}: SingleLineFitTextProps) {
	const alignClass =
		align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
	const outerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLSpanElement>(null);

	const fit = useCallback(() => {
		const outer = outerRef.current;
		const inner = innerRef.current;
		if (!outer || !inner) return;

		const w = outer.clientWidth;
		if (w <= 0) return;

		let size = maxFontSizePx;
		inner.style.fontSize = `${size}px`;

		while (size > minFontSizePx && inner.scrollWidth > w - 0.5) {
			size -= 0.5;
			inner.style.fontSize = `${size}px`;
		}
	}, [children, minFontSizePx, maxFontSizePx]);

	useLayoutEffect(() => {
		fit();
		const ro = new ResizeObserver(() => fit());
		if (outerRef.current) ro.observe(outerRef.current);
		return () => ro.disconnect();
	}, [fit]);

	return (
		<div
			ref={outerRef}
			className={`min-w-0 w-full overflow-hidden ${alignClass} ${wrapperClassName ?? ''}`}
		>
			<span
				ref={innerRef}
				className={`inline-block max-w-full whitespace-nowrap ${className ?? ''}`}
				style={{
					...style,
					whiteSpace: 'nowrap',
				}}
			>
				{children}
			</span>
		</div>
	);
}
