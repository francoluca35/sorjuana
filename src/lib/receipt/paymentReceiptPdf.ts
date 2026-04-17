import { jsPDF } from 'jspdf';
import { storeReceiptConfig } from '@/app/config/storeReceipt';
import type { SalesOrderRow } from '@/lib/data/salesOrders';

type SnapshotItem = {
	product_code?: string;
	name?: string;
	size?: string;
	qty?: number;
	line_total?: number;
};

function parseItems(raw: unknown): SnapshotItem[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((x) => x && typeof x === 'object') as SnapshotItem[];
}

function formatMoneyArs(n: number): string {
	return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type LogoFetch = { dataUrl: string; format: 'PNG' | 'JPEG' };

async function fetchLogoForPdf(path: string): Promise<LogoFetch | null> {
	if (typeof window === 'undefined') return null;
	try {
		const url = `${window.location.origin}${path}`;
		const res = await fetch(url);
		if (!res.ok) return null;
		const blob = await res.blob();
		const format: 'PNG' | 'JPEG' = blob.type === 'image/jpeg' || blob.type === 'image/jpg' ? 'JPEG' : 'PNG';
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const r = new FileReader();
			r.onload = () => resolve(r.result as string);
			r.onerror = reject;
			r.readAsDataURL(blob);
		});
		return { dataUrl, format };
	} catch {
		return null;
	}
}

const INK: [number, number, number] = [26, 20, 16];
const GOLD: [number, number, number] = [184, 149, 106];
const MUTED: [number, number, number] = [95, 88, 80];
const PAGE_W = 210;
const M = 16;
const BOTTOM_SAFE = 28;

function lineHeight(doc: jsPDF, size: number) {
	return size * 0.45;
}

export async function downloadPaymentReceiptPdf(order: SalesOrderRow): Promise<void> {
	if (order.status !== 'paid') {
		throw new Error('Solo pedidos pagados admiten comprobante.');
	}

	const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
	const items = parseItems(order.items);
	const paidAt = new Date(order.created_at);
	const paidLabel = paidAt.toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });

	// Franja superior
	doc.setFillColor(...GOLD);
	doc.rect(0, 0, PAGE_W, 2.2, 'F');

	let y = 10;
	const logoFetched = await fetchLogoForPdf(storeReceiptConfig.logoPath);
	const logoW = 26;
	const logoH = 26;

	if (logoFetched) {
		try {
			doc.addImage(logoFetched.dataUrl, logoFetched.format, M, y, logoW, logoH);
		} catch {
			try {
				const alt: 'PNG' | 'JPEG' = logoFetched.format === 'PNG' ? 'JPEG' : 'PNG';
				doc.addImage(logoFetched.dataUrl, alt, M, y, logoW, logoH);
			} catch {
				// sin logo si el archivo no es válido
			}
		}
	}

	const headLeft = M + (logoFetched ? logoW + 5 : 0);

	doc.setTextColor(...INK);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.text(storeReceiptConfig.legalName, headLeft, y + 7);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8.5);
	doc.setTextColor(...MUTED);
	doc.text(storeReceiptConfig.tagline, headLeft, y + 13);
	doc.text(storeReceiptConfig.subtitle, headLeft, y + 18);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.setTextColor(...INK);
	doc.text('COMPROBANTE DE PAGO', PAGE_W - M, y + 7, { align: 'right' });
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(...MUTED);
	doc.text(`Pedido ${order.id}`, PAGE_W - M, y + 12, { align: 'right' });
	doc.text(paidLabel, PAGE_W - M, y + 16.5, { align: 'right' });

	y = 42;
	doc.setDrawColor(...GOLD);
	doc.setLineWidth(0.35);
	doc.line(M, y, PAGE_W - M, y);
	y += 7;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.setTextColor(...INK);
	doc.text('Datos del comercio', M, y);
	y += 5;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...MUTED);
	for (const line of storeReceiptConfig.addressLines) {
		doc.text(line, M, y);
		y += lineHeight(doc, 8);
	}
	doc.text(`Tel. ${storeReceiptConfig.phoneDisplay}`, M, y);
	y += lineHeight(doc, 8);
	doc.text(storeReceiptConfig.emails.join(' · '), M, y);
	y += lineHeight(doc, 8);
	doc.text(storeReceiptConfig.hours, M, y);
	y += lineHeight(doc, 8);
	y += 3;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.setTextColor(...INK);
	doc.text('Cliente y entrega', M, y);
	y += 5;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8.5);
	doc.text(order.customer_name, M, y);
	y += lineHeight(doc, 8.5);
	doc.text(`Tel. ${order.customer_phone}`, M, y);
	y += lineHeight(doc, 8.5);
	const addr = `${order.customer_locality} — ${order.customer_address}`;
	const addrLines = doc.splitTextToSize(addr, PAGE_W - 2 * M);
	doc.text(addrLines, M, y);
	y += addrLines.length * lineHeight(doc, 8.5) + 4;

	doc.setDrawColor(230, 226, 218);
	doc.line(M, y, PAGE_W - M, y);
	y += 6;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.setTextColor(...INK);
	doc.text('Detalle', M, y);
	y += 6;

	const colDesc = M;
	const colQty = 132;
	const colAmt = PAGE_W - M;
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(7.5);
	doc.text('Producto', colDesc, y);
	doc.text('Cant.', colQty, y);
	doc.text('Importe', colAmt, y, { align: 'right' });
	y += 4;
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...MUTED);
	doc.setDrawColor(...GOLD);
	doc.line(M, y, PAGE_W - M, y);
	y += 5;

	const rowGap = 4.2;
	for (const line of items) {
		if (y > 297 - BOTTOM_SAFE) {
			doc.addPage();
			y = 18;
		}
		const code = line.product_code?.trim() ? `[${line.product_code}] ` : '';
		const size = line.size?.trim() ? ` · Talle ${line.size}` : '';
		const label = `${code}${line.name ?? '—'}${size}`;
		const wrapped = doc.splitTextToSize(label, colQty - colDesc - 6);
		const lineCount = Array.isArray(wrapped) ? wrapped.length : 1;
		doc.setTextColor(...INK);
		doc.setFontSize(8);
		doc.text(wrapped, colDesc, y);
		doc.text(String(line.qty ?? 0), colQty, y);
		doc.text(formatMoneyArs(Number(line.line_total) || 0), colAmt, y, { align: 'right' });
		y += lineCount * rowGap + 1;
	}

	if (y > 297 - BOTTOM_SAFE - 20) {
		doc.addPage();
		y = 18;
	}

	y += 4;
	doc.setDrawColor(...GOLD);
	doc.line(M, y, PAGE_W - M, y);
	y += 8;
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(12);
	doc.setTextColor(...INK);
	doc.text('Total abonado', M, y);
	doc.text(formatMoneyArs(Number(order.total_amount) || 0), colAmt, y, { align: 'right' });

	const pageH = doc.internal.pageSize.getHeight();
	const footY = pageH - 14;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7);
	doc.setTextColor(130, 125, 118);
	doc.text(
		'Documento informativo de pago registrado. No válido como factura fiscal.',
		PAGE_W / 2,
		footY,
		{ align: 'center', maxWidth: PAGE_W - 2 * M },
	);
	doc.text(
		`© ${storeReceiptConfig.since} ${storeReceiptConfig.legalName}`,
		PAGE_W / 2,
		footY + 4,
		{ align: 'center', maxWidth: PAGE_W - 2 * M },
	);

	const safeId = order.id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12);
	doc.save(`comprobante-${safeId}.pdf`);
}
