'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { importProductsFromExcelAction } from '@/app/actions/products';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';

const sans = 'Montserrat, sans-serif';
const serif = "'Cormorant Garamond', serif";

const labelClass =
	'mb-1.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-[#6b6156]';

const inputClass =
	'h-10 rounded-md border border-[#b8956a]/28 bg-white/55 text-[#1a1410] shadow-none backdrop-blur-sm placeholder:text-[#9c9590] focus-visible:border-[#8b6f47]/55 focus-visible:ring-[#b8956a]/25';

const cardClass =
	'rounded-md border border-[#b8956a]/22 bg-white/40 p-4 backdrop-blur-sm sm:p-5';

export default function ExcelImportPanel() {
	const [file, setFile] = useState<File | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!file) {
			toast.error('Seleccioná un archivo Excel.');
			return;
		}
		setIsSubmitting(true);
		try {
			const fd = new FormData();
			fd.append('file', file);
			const result = await importProductsFromExcelAction(fd);
			if (!result.ok) {
				toast.error(result.message);
				return;
			}
			toast.success(`Importación completa: ${result.inserted} productos cargados, ${result.skipped} filas omitidas.`);
			setFile(null);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="min-w-0 text-[#1a1410]" style={{ fontFamily: sans }}>
			<header className="mb-8 border-b border-[#b8956a]/20 pb-8">
				<h1 className="text-3xl font-light tracking-wide text-[#1a1410] sm:text-4xl" style={{ fontFamily: serif }}>
					Carga de excel
				</h1>
				<p className="mt-2 max-w-2xl text-sm font-light leading-relaxed text-[#6b6156]">
					Encabezados esperados: CODIGO, CATEGORIA, SUBCATEGORIA (opcional), NOMBREPRODUCTO, COLOR, TALLE,
					PRECIO, ESTADO, CANTIDAD. El nombre del producto sale de NOMBREPRODUCTO (si falta, se usa el código).
					Categoría y subcategoría se crean en el panel si no existen. No se importan imágenes.
				</p>
			</header>

			<form onSubmit={onSubmit} className={cn(cardClass, 'max-w-2xl space-y-5')}>
				<div>
					<Label htmlFor="excel-file" className={labelClass} style={{ fontFamily: sans }}>
						Archivo Excel
					</Label>
					<Input
						id="excel-file"
						type="file"
						accept=".xlsx,.xls"
						className={inputClass}
						onChange={(e) => setFile(e.target.files?.[0] ?? null)}
					/>
				</div>
				<p className="text-xs text-[#6b6156]">
					Si una fila no tiene codigo o categoria, se omite automáticamente.
				</p>
				<Button
					type="submit"
					disabled={isSubmitting || !file}
					className="rounded-sm border border-[#6b5340]/25 bg-[#1a1410] px-8 text-[#f5f2ed] shadow-md transition hover:bg-[#2a221c] disabled:opacity-60"
					style={{ fontFamily: sans, fontWeight: 500 }}
				>
					{isSubmitting ? 'Importando…' : 'Importar productos'}
				</Button>
			</form>
		</div>
	);
}
