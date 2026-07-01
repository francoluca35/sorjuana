import { parseSizeInventoryFromDb, normalizeSizeInventoryForDb, sumSizeInventoryQty } from '@/lib/data/productSizes';
import type { SizeInventoryRow } from '@/lib/data/productSizes';

export const CATALOG_EXPORT_IGNORED_COLUMNS = ['image_url', 'image_urls', 'video_url'] as const;

export type CatalogExportColumnKey =
	| 'id'
	| 'name'
	| 'category'
	| 'price'
	| 'compareAtPrice'
	| 'createdAt'
	| 'kind'
	| 'stock'
	| 'cost'
	| 'basePrice'
	| 'taxApplies'
	| 'taxPercent'
	| 'description'
	| 'productCode'
	| 'minOrderQty'
	| 'maxOrderQty'
	| 'sizeInventory'
	| 'transferPrice'
	| 'finalTransferPrice'
	| 'comboItems'
	| 'color'
	| 'cashDiscountPercent'
	| 'transferDiscountPercent'
	| 'isHidden';

function normalizeHeader(value: unknown): string {
	if (value == null) return '';
	return String(value)
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]/g, '');
}

export function isCatalogExportFormat(headerRow: unknown[]): boolean {
	const headers = new Set(headerRow.map(normalizeHeader));
	return headers.has('name') && headers.has('baseprice') && headers.has('productcode');
}

export function mapCatalogExportHeaders(
	headerRow: unknown[],
): Partial<Record<CatalogExportColumnKey, number>> {
	const indexByField: Partial<Record<CatalogExportColumnKey, number>> = {};

	for (let i = 0; i < headerRow.length; i++) {
		const n = normalizeHeader(headerRow[i]);
		if (!n) continue;
		if (n === 'id') indexByField.id = i;
		if (n === 'name') indexByField.name = i;
		if (n === 'category') indexByField.category = i;
		if (n === 'price') indexByField.price = i;
		if (n === 'compareatprice') indexByField.compareAtPrice = i;
		if (n === 'createdat') indexByField.createdAt = i;
		if (n === 'kind') indexByField.kind = i;
		if (n === 'stock') indexByField.stock = i;
		if (n === 'cost') indexByField.cost = i;
		if (n === 'baseprice') indexByField.basePrice = i;
		if (n === 'taxapplies') indexByField.taxApplies = i;
		if (n === 'taxpercent') indexByField.taxPercent = i;
		if (n === 'description') indexByField.description = i;
		if (n === 'productcode') indexByField.productCode = i;
		if (n === 'minorderqty') indexByField.minOrderQty = i;
		if (n === 'maxorderqty') indexByField.maxOrderQty = i;
		if (n === 'sizeinventory') indexByField.sizeInventory = i;
		if (n === 'transferprice') indexByField.transferPrice = i;
		if (n === 'finaltransferprice') indexByField.finalTransferPrice = i;
		if (n === 'comboitems') indexByField.comboItems = i;
		if (n === 'color') indexByField.color = i;
		if (n === 'cashdiscountpercent') indexByField.cashDiscountPercent = i;
		if (n === 'transferdiscountpercent') indexByField.transferDiscountPercent = i;
		if (n === 'ishidden') indexByField.isHidden = i;
	}

	return indexByField;
}

function num(value: unknown, fallback = 0): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

function numOrNull(value: unknown): number | null {
	const raw = String(value ?? '').trim();
	if (!raw) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}

function parseBool(value: unknown): boolean {
	const raw = String(value ?? '').trim().toLowerCase();
	return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'si';
}

function parseJsonField<T>(value: unknown, fallback: T): T {
	const raw = String(value ?? '').trim();
	if (!raw) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function parseKind(value: unknown): 'producto' | 'combo' | 'ofertas' {
	const raw = String(value ?? '').trim().toLowerCase();
	if (raw === 'combo') return 'combo';
	if (raw === 'ofertas' || raw === 'oferta') return 'ofertas';
	return 'producto';
}

function cell(row: (string | number | null)[], index: number | undefined): string {
	if (index == null) return '';
	return String(row[index] ?? '').trim();
}

export type ParsedCatalogExportRow = {
	id: string;
	rowNum: number;
	doc: Record<string, unknown>;
	categoryPath: string;
};

export function parseCatalogExportRows(
	rows: (string | number | null)[][],
	indexByField: Partial<Record<CatalogExportColumnKey, number>>,
): { parsed: ParsedCatalogExportRow[]; skipped: number; errors: string[] } {
	const parsed: ParsedCatalogExportRow[] = [];
	let skipped = 0;
	const errors: string[] = [];

	for (let i = 1; i < rows.length; i++) {
		const row = rows[i] ?? [];
		const rowNum = i + 1;
		if (row.every((cellValue) => String(cellValue ?? '').trim() === '')) {
			skipped += 1;
			continue;
		}

		const id = cell(row, indexByField.id);
		const name = cell(row, indexByField.name);
		if (!name) {
			skipped += 1;
			continue;
		}
		if (!id) {
			errors.push(`Fila ${rowNum}: falta id.`);
			continue;
		}

		const categoryPath = cell(row, indexByField.category);
		const sizeInventoryRaw = parseJsonField<SizeInventoryRow[]>(
			cell(row, indexByField.sizeInventory),
			[],
		);
		const sizeInventory = normalizeSizeInventoryForDb(parseSizeInventoryFromDb(sizeInventoryRaw));
		const stockFromRow = Math.max(0, Math.floor(num(cell(row, indexByField.stock), 0)));
		const stock =
			sizeInventory.length > 0 ? sumSizeInventoryQty(sizeInventory) : stockFromRow;

		const comboItems = parseJsonField<unknown[]>(cell(row, indexByField.comboItems), []);
		const createdAtRaw = cell(row, indexByField.createdAt);
		const createdAt = createdAtRaw ? new Date(createdAtRaw).toISOString() : new Date().toISOString();

		const doc: Record<string, unknown> = {
			name,
			category: categoryPath || null,
			price: Math.max(0, Math.round(num(cell(row, indexByField.price), 0))),
			compare_at_price: numOrNull(cell(row, indexByField.compareAtPrice)),
			kind: parseKind(cell(row, indexByField.kind)),
			stock,
			cost: numOrNull(cell(row, indexByField.cost)),
			base_price: Math.max(0, Math.round(num(cell(row, indexByField.basePrice), 0))),
			tax_applies: parseBool(cell(row, indexByField.taxApplies)),
			tax_percent: numOrNull(cell(row, indexByField.taxPercent)),
			description: cell(row, indexByField.description) || null,
			product_code: cell(row, indexByField.productCode) || null,
			min_order_qty: numOrNull(cell(row, indexByField.minOrderQty)),
			max_order_qty: numOrNull(cell(row, indexByField.maxOrderQty)),
			size_inventory: sizeInventory,
			transfer_price: numOrNull(cell(row, indexByField.transferPrice)),
			final_transfer_price: numOrNull(cell(row, indexByField.finalTransferPrice)),
			combo_items: Array.isArray(comboItems) ? comboItems : [],
			color: cell(row, indexByField.color) || null,
			cash_discount_percent: num(cell(row, indexByField.cashDiscountPercent), 0),
			transfer_discount_percent: num(cell(row, indexByField.transferDiscountPercent), 0),
			is_hidden: parseBool(cell(row, indexByField.isHidden)),
			image_url: null,
			image_urls: [],
			video_url: null,
			created_at: createdAt,
		};

		parsed.push({ id, rowNum, doc, categoryPath });
	}

	return { parsed, skipped, errors };
}

export function splitCategoryPath(path: string): { category: string; subcategory: string | null } {
	const parts = path
		.split('/')
		.map((p) => p.trim())
		.filter(Boolean);
	if (parts.length === 0) return { category: '', subcategory: null };
	if (parts.length === 1) return { category: parts[0]!, subcategory: null };
	return { category: parts[0]!, subcategory: parts.slice(1).join('/') };
}
