'use client';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';
import {
	normalizeSizeInventoryForDb,
	sumSizeInventoryQty,
	type SizeInventoryRow,
} from '@/lib/data/productSizes';
import { Plus, Trash2 } from 'lucide-react';

const PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Único'] as const;

type Props = {
	rows: SizeInventoryRow[];
	onChange: (rows: SizeInventoryRow[]) => void;
	disabled?: boolean;
	className?: string;
	/** Prefijo para ids accesibles */
	idPrefix?: string;
	/** Clase del número de total (ej. acento de la carga de producto) */
	totalAccentClassName?: string;
	/**
	 * Color fijo para cada fila (variante por color en un solo producto).
	 * Si está definido, cada talle guarda `color` en JSON al agregar/editar.
	 */
	implicitColor?: string | null;
};

export function SizeInventoryEditor({
	rows,
	onChange,
	disabled,
	className,
	idPrefix = 'sizes',
	totalAccentClassName = 'text-teal-700',
	implicitColor,
}: Props) {
	const normalized = normalizeSizeInventoryForDb(rows);
	const total = sumSizeInventoryQty(normalized);
	const colorForRow = implicitColor?.trim() || null;

	function updateRow(index: number, patch: Partial<SizeInventoryRow>) {
		const next = rows.map((r, i) => {
			if (i !== index) return r;
			const merged = { ...r, ...patch };
			if (colorForRow) merged.color = colorForRow;
			return merged;
		});
		onChange(next);
	}

	function removeRow(index: number) {
		onChange(rows.filter((_, i) => i !== index));
	}

	function addRow(presetSize = '') {
		onChange([...rows, { size: presetSize, qty: 0, color: colorForRow }]);
	}

	return (
		<div className={cn('space-y-4', className)}>
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div>
					<Label className="text-xs font-medium text-slate-600">Talles y cantidades</Label>
					<p className="mt-1 text-[11px] font-light leading-relaxed text-slate-500">
						Agregá cada talle y cuántas unidades hay. El stock total se calcula solo.
					</p>
				</div>
				<p className="text-sm font-semibold tabular-nums text-slate-900">
					Total: <span className={totalAccentClassName}>{total}</span>
				</p>
			</div>

			<div className="flex flex-wrap gap-1.5">
				{PRESETS.map((label) => (
					<Button
						key={label}
						type="button"
						variant="outline"
						size="sm"
						disabled={disabled}
						className="h-8 rounded-full border-slate-200 px-3 text-xs"
						onClick={() => addRow(label)}
					>
						+ {label}
					</Button>
				))}
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={disabled}
					className="h-8 rounded-full border-slate-200 px-3 text-xs"
					onClick={() => addRow('')}
				>
					<Plus className="mr-1 inline size-3.5" aria-hidden />
					Otro
				</Button>
			</div>

			{rows.length === 0 ? (
				<p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
					Todavía no hay talles. Usá los botones de arriba o &quot;Otro&quot; para cargar el primero.
				</p>
			) : (
				<ul className="space-y-3">
					{rows.map((row, index) => (
						<li key={index} className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
							<div className="min-w-[6rem] flex-1">
								<Label htmlFor={`${idPrefix}-size-${index}`} className="sr-only">
									Talle {index + 1}
								</Label>
								<Input
									id={`${idPrefix}-size-${index}`}
									value={row.size}
									onChange={(e) => updateRow(index, { size: e.target.value })}
									placeholder="Ej. 38"
									disabled={disabled}
									className="h-10"
								/>
							</div>
							<div className="w-24 shrink-0">
								<Label htmlFor={`${idPrefix}-qty-${index}`} className="sr-only">
									Cantidad talle {index + 1}
								</Label>
								<Input
									id={`${idPrefix}-qty-${index}`}
									type="number"
									min={0}
									step={1}
									inputMode="numeric"
									value={Number.isFinite(row.qty) ? row.qty : 0}
									onChange={(e) =>
										updateRow(index, { qty: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
									}
									disabled={disabled}
									className="h-10"
								/>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-10 w-10 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
								disabled={disabled}
								onClick={() => removeRow(index)}
								aria-label={`Quitar talle ${index + 1}`}
							>
								<Trash2 className="size-4" />
							</Button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
