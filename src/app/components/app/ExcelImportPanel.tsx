'use client';

import { useState, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { importProductsFromExcelAction } from '@/app/actions/products';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';
import { PRODUCT_EXCEL_COLUMNS } from '@/lib/productExcelImport';

const sans = 'Montserrat, sans-serif';
const serif = "'Cormorant Garamond', serif";

const labelClass =
	'mb-1.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-[#6b6156]';

const inputClass =
	'h-10 rounded-md border border-[#b8956a]/28 bg-white/55 text-[#1a1410] shadow-none backdrop-blur-sm placeholder:text-[#9c9590] focus-visible:border-[#8b6f47]/55 focus-visible:ring-[#b8956a]/25';

const cardClass =
	'rounded-md border border-[#b8956a]/22 bg-white/40 p-4 backdrop-blur-sm sm:p-5';

const LEGEND_ROWS = [
	{
		columna: 'nombre',
		obligatorio: 'Sí',
		detalle: 'Nombre del producto (igual que en Cargar producto).',
		ejemplo: 'Remera básica',
	},
	{
		columna: 'color',
		obligatorio: 'No',
		detalle: 'Color de la variante. Si repetís el mismo código con otro color, se une en un solo producto.',
		ejemplo: 'Rojo',
	},
	{
		columna: 'talles',
		obligatorio: 'No',
		detalle: 'Talles separados por coma. Si hay varios, completá también cantidad por talles.',
		ejemplo: 'S,M,L,XL',
	},
	{
		columna: 'cantidad',
		obligatorio: 'No',
		detalle: 'Stock total si no usás talles, o stock del único talle.',
		ejemplo: '10',
	},
	{
		columna: 'cantidad por talles',
		obligatorio: 'No',
		detalle: 'Cantidades en el mismo orden que talles (una por talle).',
		ejemplo: '2,3,4,1',
	},
	{
		columna: 'costo inicial',
		obligatorio: 'No',
		detalle: 'Costo de compra / importación (campo costo inicial del formulario).',
		ejemplo: '15000',
	},
	{
		columna: 'costo de prenda',
		obligatorio: 'Sí',
		detalle: 'Precio base comercial. Con esto se calculan efectivo, transferencia y tarjeta según Precios.',
		ejemplo: '59900',
	},
	{
		columna: 'descripcion',
		obligatorio: 'No',
		detalle: 'Texto descriptivo del producto.',
		ejemplo: 'Algodón premium',
	},
	{
		columna: 'categoria',
		obligatorio: 'Sí',
		detalle: 'Categoría de tienda. Se crea en el árbol si no existe.',
		ejemplo: 'Ropa',
	},
	{
		columna: 'subcategoria',
		obligatorio: 'No',
		detalle: 'Subcategoría dentro de la categoría.',
		ejemplo: 'Remeras',
	},
	{
		columna: 'codigo',
		obligatorio: 'No',
		detalle: 'Código interno. Si falta se genera AUTO-0001. Mismo código = un producto con varios colores/talles.',
		ejemplo: '2345',
	},
] as const;

function downloadTemplate() {
	const headers = [...PRODUCT_EXCEL_COLUMNS];
	const example = [
		'Remera básica',
		'Rojo',
		'S,M,L',
		'',
		'2,3,4',
		'15000',
		'59900',
		'Algodón premium',
		'Ropa',
		'Remeras',
		'2345',
	];
	const ws = XLSX.utils.aoa_to_sheet([headers, example]);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Productos');
	XLSX.writeFile(wb, 'plantilla-productos-sorjuana.xlsx');
}

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
			toast.success(
				result.format === 'catalog-export'
					? `Importación CSV: ${result.inserted} producto(s) cargado(s) en Firestore (sin imágenes ni videos).${result.skipped > 0 ? ` ${result.skipped} fila(s) omitida(s).` : ''}`
					: `Importación completa: ${result.inserted} producto(s) cargado(s)${result.skipped > 0 ? `, ${result.skipped} fila(s) omitida(s)` : ''}.`,
			);
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
				<p className="mt-2 max-w-3xl text-sm font-light leading-relaxed text-[#6b6156]">
					Podés subir la <strong>plantilla manual</strong> (Excel) o un <strong>CSV exportado del catálogo</strong>{' '}
					(como <code className="text-xs">products_rows.csv</code>). En el CSV se importan nombre, precios,
					stock, talles, categoría y código; <strong>no</strong> se importan{' '}
					<code className="text-xs">image_url</code>, <code className="text-xs">image_urls</code> ni{' '}
					<code className="text-xs">video_url</code>.
				</p>
			</header>

			<section className={cn(cardClass, 'mb-6 max-w-4xl')}>
				<h2 className="text-lg font-light text-[#1a1410]" style={{ fontFamily: serif }}>
					Formato CSV de catálogo (exportación)
				</h2>
				<p className="mt-2 text-xs leading-relaxed text-[#6b6156]">
					Si subís un CSV como el export de productos, debe tener columnas{' '}
					<code className="text-[11px]">id</code>, <code className="text-[11px]">name</code>,{' '}
					<code className="text-[11px]">category</code>, <code className="text-[11px]">price</code>,{' '}
					<code className="text-[11px]">base_price</code>, <code className="text-[11px]">stock</code>,{' '}
					<code className="text-[11px]">size_inventory</code>, <code className="text-[11px]">product_code</code>,{' '}
					<code className="text-[11px]">color</code>, etc. Se conserva el <strong>id</strong> de cada producto.
					Las columnas de media se ignoran.
				</p>
			</section>

			<section className={cn(cardClass, 'mb-6 max-w-4xl')}>
				<h2 className="text-lg font-light text-[#1a1410]" style={{ fontFamily: serif }}>
					Formato manual (plantilla Excel)
				</h2>
				<p className="mt-2 text-xs leading-relaxed text-[#6b6156]">
					La primera fila del Excel debe tener exactamente estos encabezados (podés descargar la plantilla).
					Los montos pueden llevar <code className="text-[11px]">$</code> y puntos de miles (ej.{' '}
					<code className="text-[11px]">59.900</code>).
				</p>
				<div className="mt-4 overflow-x-auto rounded-md border border-[#b8956a]/20 bg-white/60">
					<table className="min-w-full text-left text-xs" style={{ fontFamily: sans }}>
						<thead className="border-b border-[#b8956a]/20 bg-[#f5f2ed]/80 text-[10px] uppercase tracking-[0.14em] text-[#6b6156]">
							<tr>
								<th className="px-3 py-2.5 font-medium">Columna</th>
								<th className="px-3 py-2.5 font-medium">Obligatorio</th>
								<th className="px-3 py-2.5 font-medium">Qué va</th>
								<th className="px-3 py-2.5 font-medium">Ejemplo</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[#b8956a]/15 text-[#1a1410]">
							{LEGEND_ROWS.map((row) => (
								<tr key={row.columna}>
									<td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.columna}</td>
									<td className="px-3 py-2.5 whitespace-nowrap">{row.obligatorio}</td>
									<td className="px-3 py-2.5 text-[#6b6156]">{row.detalle}</td>
									<td className="px-3 py-2.5 whitespace-nowrap text-[#8b6f47]">{row.ejemplo}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<ul className="mt-4 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#6b6156]">
					<li>
						Si hay varios talles, usá <strong>cantidad por talles</strong> con la misma cantidad de valores
						(ej. talles <code className="text-[11px]">S,M,L</code> → cantidad por talles{' '}
						<code className="text-[11px]">2,3,1</code>).
					</li>
					<li>
						Si no ponés talles pero sí <strong>cantidad</strong>, el producto queda con talle único y ese
						stock.
					</li>
					<li>
						Varias filas con el mismo <strong>codigo</strong> (u otro nombre + categoría) se agrupan en un
						solo producto con todos los colores y talles.
					</li>
				</ul>
				<Button
					type="button"
					variant="outline"
					onClick={downloadTemplate}
					className="mt-4 border-[#b8956a]/40 bg-white/80"
					style={{ fontFamily: sans }}
				>
					<Download className="mr-2 h-4 w-4" />
					Descargar plantilla Excel
				</Button>
			</section>

			<form onSubmit={onSubmit} className={cn(cardClass, 'max-w-2xl space-y-5')}>
				<div>
					<Label htmlFor="excel-file" className={labelClass} style={{ fontFamily: sans }}>
						Archivo Excel o CSV
					</Label>
					<Input
						id="excel-file"
						type="file"
						accept=".xlsx,.xls,.csv"
						className={inputClass}
						onChange={(e) => setFile(e.target.files?.[0] ?? null)}
					/>
				</div>
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
