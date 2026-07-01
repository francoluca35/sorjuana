import type { SizeInventoryRow } from '@/lib/data/productSizes';
import { normalizeSizeInventoryForDb, sumSizeInventoryQty } from '@/lib/data/productSizes';

export const PRODUCT_EXCEL_COLUMNS = [
	'nombre',
	'color',
	'talles',
	'cantidad',
	'cantidad por talles',
	'costo inicial',
	'costo de prenda',
	'descripcion',
	'categoria',
	'subcategoria',
	'codigo',
] as const;

export const PRODUCT_EXCEL_OPTIONAL_COLUMNS = ['estado'] as const;

export type ProductExcelColumnKey =
	| 'nombre'
	| 'color'
	| 'talles'
	| 'cantidad'
	| 'cantidadPorTalles'
	| 'costoInicial'
	| 'costoPrenda'
	| 'descripcion'
	| 'categoria'
	| 'subcategoria'
	| 'codigo'
	| 'estado';

export type ParsedExcelRow = {
	rowNum: number;
	codigo: string;
	nombre: string;
	categoria: string;
	subcategoria: string;
	color: string;
	descripcion: string;
	costoInicial: number;
	costoPrenda: number;
	estado: string;
	sizeInventory: SizeInventoryRow[];
	stock: number;
};

export type GroupedExcelProduct = {
	key: string;
	name: string;
	codigo: string;
	categoria: string;
	subcategoria: string;
	descripcion: string;
	costoInicial: number;
	costoPrenda: number;
	kind: 'producto' | 'combo' | 'ofertas';
	sizeInventory: SizeInventoryRow[];
	stock: number;
	colors: string[];
	sourceRows: number[];
};

function normalizeHeader(value: unknown): string {
	if (value == null) return '';
	return String(value)
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]/g, '');
}

export function mapExcelHeaders(headerRow: unknown[]): Partial<Record<ProductExcelColumnKey, number>> {
	const indexByField: Partial<Record<ProductExcelColumnKey, number>> = {};

	for (let i = 0; i < headerRow.length; i++) {
		const normalized = normalizeHeader(headerRow[i]);
		if (!normalized || normalized === 'nacimp') continue;

		if (normalized === 'codigo' || normalized === 'cod') indexByField.codigo = i;
		if (normalized === 'categoria' || normalized === 'category') indexByField.categoria = i;
		if (normalized === 'subcategoria' || normalized === 'subcategory') indexByField.subcategoria = i;
		if (
			normalized === 'nombre' ||
			normalized === 'name' ||
			normalized === 'producto' ||
			normalized === 'nombreproducto'
		) {
			indexByField.nombre = i;
		}
		if (normalized === 'color') indexByField.color = i;
		if (
			normalized === 'talles' ||
			normalized === 'talle' ||
			normalized === 'talla' ||
			normalized === 'size' ||
			normalized === 'sizes'
		) {
			indexByField.talles = i;
		}
		if (
			normalized === 'cantidad' ||
			normalized === 'stock' ||
			normalized === 'cantidadstock' ||
			normalized === 'qty'
		) {
			indexByField.cantidad = i;
		}
		if (
			normalized === 'cantidadportalle' ||
			normalized === 'cantidadportalles' ||
			normalized === 'cantidadesportalle' ||
			normalized === 'cantidadxtalle' ||
			normalized === 'qtyportalle'
		) {
			indexByField.cantidadPorTalles = i;
		}
		if (normalized === 'costoinicial') indexByField.costoInicial = i;
		if (
			normalized === 'costodeprenda' ||
			normalized === 'costoprenda' ||
			normalized === 'precio' ||
			normalized === 'price'
		) {
			indexByField.costoPrenda = i;
		}
		if (normalized === 'descripcion' || normalized === 'description' || normalized === 'desc') {
			indexByField.descripcion = i;
		}
		if (normalized === 'estado' || normalized === 'status') indexByField.estado = i;
	}

	return indexByField;
}

export function validateExcelHeaders(
	indexByField: Partial<Record<ProductExcelColumnKey, number>>,
): string | null {
	if (indexByField.nombre == null) return 'Falta la columna obligatoria: nombre.';
	if (indexByField.categoria == null) return 'Falta la columna obligatoria: categoria.';
	if (indexByField.costoPrenda == null) {
		return 'Falta la columna obligatoria: costo de prenda.';
	}
	return null;
}

export function parseMoneyLike(value: unknown): number {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? Math.max(0, value) : 0;
	}
	let text = String(value ?? '')
		.trim()
		.replace(/\s/g, '')
		.replace(/[$€£]/g, '');
	if (!text) return 0;

	if (text.includes(',')) {
		const lastComma = text.lastIndexOf(',');
		const afterComma = text.slice(lastComma + 1);
		if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
			if (text.includes('.')) {
				if (lastComma > text.lastIndexOf('.')) {
					text = text.replace(/\./g, '').replace(',', '.');
				} else {
					text = text.replace(/,/g, '');
				}
			} else {
				const parts = text.split(',');
				if (parts.length === 2) {
					text = `${parts[0]!.replace(/\D/g, '')}.${parts[1]}`;
				}
			}
		} else {
			text = text.replace(/,/g, '');
		}
	}

	if (text.includes('.')) {
		const parts = text.split('.');
		const last = parts[parts.length - 1]!;
		if (parts.length === 2 && last.length <= 2 && /^\d+$/.test(last)) {
			/* decimal */
		} else {
			text = parts.join('');
		}
	}

	const n = Number.parseFloat(text);
	return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parseQty(value: unknown): number {
	if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
	const n = Number.parseInt(String(value ?? '').trim(), 10);
	return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parseListCell(value: unknown): string[] {
	return String(value ?? '')
		.split(/[,;|/]+/)
		.map((part) => part.trim())
		.filter(Boolean);
}

function inferKindFromEstado(estadoRaw: unknown): 'producto' | 'combo' | 'ofertas' {
	const estado = String(estadoRaw ?? '').trim().toLowerCase();
	if (estado.includes('combo')) return 'combo';
	if (estado.includes('oferta')) return 'ofertas';
	return 'producto';
}

function buildSizeInventoryFromCells(args: {
	color: string;
	tallesRaw: string;
	cantidadPorTallesRaw: string;
	cantidad: number;
}): { rows: SizeInventoryRow[]; error?: string } {
	const color = args.color.trim() || null;
	const sizes = parseListCell(args.tallesRaw);
	const qtyParts = parseListCell(args.cantidadPorTallesRaw).map(parseQty);

	if (sizes.length > 0) {
		if (qtyParts.length === sizes.length) {
			return {
				rows: sizes.map((size, index) => ({
					color,
					size,
					qty: qtyParts[index] ?? 0,
				})),
			};
		}
		if (qtyParts.length === 0 && args.cantidad > 0) {
			if (sizes.length === 1) {
				return { rows: [{ color, size: sizes[0]!, qty: args.cantidad }] };
			}
			return {
				rows: sizes.map((size) => ({ color, size, qty: args.cantidad })),
			};
		}
		return {
			rows: [],
			error: `En la fila hay ${sizes.length} talle(s) pero ${qtyParts.length} cantidad(es) por talle. Completá "cantidad por talles" con el mismo formato (ej. 2,3,1).`,
		};
	}

	if (args.cantidad > 0) {
		return { rows: [{ color, size: 'Unico', qty: args.cantidad }] };
	}

	return { rows: [] };
}

export function parseExcelDataRows(
	rows: (string | number | null)[][],
	indexByField: Partial<Record<ProductExcelColumnKey, number>>,
): { parsed: ParsedExcelRow[]; skipped: number; errors: string[] } {
	const parsed: ParsedExcelRow[] = [];
	let skipped = 0;
	const errors: string[] = [];

	for (let i = 1; i < rows.length; i++) {
		const row = rows[i] ?? [];
		const rowNum = i + 1;
		const isEmpty = row.every((cell) => String(cell ?? '').trim() === '');
		if (isEmpty) {
			skipped += 1;
			continue;
		}

		const nombre =
			indexByField.nombre != null ? String(row[indexByField.nombre] ?? '').trim() : '';
		const categoria =
			indexByField.categoria != null ? String(row[indexByField.categoria] ?? '').trim() : '';
		const subcategoria =
			indexByField.subcategoria != null ? String(row[indexByField.subcategoria] ?? '').trim() : '';
		let codigo =
			indexByField.codigo != null ? String(row[indexByField.codigo] ?? '').trim() : '';
		const color =
			indexByField.color != null ? String(row[indexByField.color] ?? '').trim() : '';
		const tallesRaw =
			indexByField.talles != null ? String(row[indexByField.talles] ?? '').trim() : '';
		const cantidadPorTallesRaw =
			indexByField.cantidadPorTalles != null
				? String(row[indexByField.cantidadPorTalles] ?? '').trim()
				: '';
		const cantidad =
			indexByField.cantidad != null ? parseQty(row[indexByField.cantidad]) : 0;
		const costoInicial =
			indexByField.costoInicial != null ? parseMoneyLike(row[indexByField.costoInicial]) : 0;
		const costoPrenda =
			indexByField.costoPrenda != null ? parseMoneyLike(row[indexByField.costoPrenda]) : 0;
		const descripcion =
			indexByField.descripcion != null ? String(row[indexByField.descripcion] ?? '').trim() : '';
		const estado =
			indexByField.estado != null ? String(row[indexByField.estado] ?? '').trim() : '';

		if (!nombre) {
			skipped += 1;
			continue;
		}
		if (!categoria) {
			skipped += 1;
			continue;
		}
		if (costoPrenda <= 0) {
			errors.push(`Fila ${rowNum}: el costo de prenda debe ser mayor a 0.`);
			continue;
		}
		if (!codigo) {
			codigo = `AUTO-${String(rowNum).padStart(4, '0')}`;
		}

		const built = buildSizeInventoryFromCells({
			color,
			tallesRaw,
			cantidadPorTallesRaw,
			cantidad,
		});
		if (built.error) {
			errors.push(`Fila ${rowNum}: ${built.error}`);
			continue;
		}

		const sizeInventory = normalizeSizeInventoryForDb(built.rows);
		const stock =
			sizeInventory.length > 0 ? sumSizeInventoryQty(sizeInventory) : cantidad;

		parsed.push({
			rowNum,
			codigo,
			nombre,
			categoria,
			subcategoria,
			color,
			descripcion,
			costoInicial,
			costoPrenda,
			estado,
			sizeInventory,
			stock,
		});
	}

	return { parsed, skipped, errors };
}

export function groupExcelRows(rows: ParsedExcelRow[]): GroupedExcelProduct[] {
	const groups = new Map<string, GroupedExcelProduct>();

	for (const row of rows) {
		const key = row.codigo
			? `code:${row.codigo.trim().toLowerCase()}`
			: `name:${row.nombre.trim().toLowerCase()}::${row.categoria.trim().toLowerCase()}::${row.subcategoria.trim().toLowerCase()}`;

		const existing = groups.get(key);
		if (!existing) {
			groups.set(key, {
				key,
				name: row.nombre,
				codigo: row.codigo,
				categoria: row.categoria,
				subcategoria: row.subcategoria,
				descripcion: row.descripcion,
				costoInicial: row.costoInicial,
				costoPrenda: row.costoPrenda,
				kind: inferKindFromEstado(row.estado),
				sizeInventory: [...row.sizeInventory],
				stock: row.stock,
				colors: row.color ? [row.color] : [],
				sourceRows: [row.rowNum],
			});
			continue;
		}

		existing.sizeInventory = normalizeSizeInventoryForDb([
			...existing.sizeInventory,
			...row.sizeInventory,
		]);
		existing.stock =
			existing.sizeInventory.length > 0
				? sumSizeInventoryQty(existing.sizeInventory)
				: existing.stock + row.stock;
		if (row.color && !existing.colors.includes(row.color)) {
			existing.colors.push(row.color);
		}
		if (!existing.descripcion && row.descripcion) {
			existing.descripcion = row.descripcion;
		}
		existing.sourceRows.push(row.rowNum);
	}

	return Array.from(groups.values());
}
