#!/usr/bin/env node
/**
 * Borra la carpeta `.next` (caché de compilación).
 * Si falla, casi siempre es porque `next dev` sigue corriendo y bloquea `.next/trace`.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '.next');

function sleepSync(ms) {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		/* busy-wait breve entre reintentos */
	}
}

if (!fs.existsSync(dir)) {
	console.log('No hay carpeta .next; nada que limpiar.');
	process.exit(0);
}

for (let attempt = 1; attempt <= 10; attempt++) {
	try {
		fs.rmSync(dir, { recursive: true, force: true });
		console.log('Listo: se eliminó .next');
		process.exit(0);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.warn(`Intento ${attempt}/10: ${msg}`);
		sleepSync(400);
	}
}

console.error('');
console.error('No se pudo borrar .next (archivos en uso).');
console.error('1) Detené el servidor: en la terminal del proyecto presioná Ctrl+C.');
console.error('2) Ejecutá de nuevo: npm run clean');
console.error('3) Arrancá de nuevo: npm run dev');
console.error('');
process.exit(1);
