'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSiteHomeConfigAction, saveReturnPolicyAction } from '@/app/actions/siteHomeConfig';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { ReturnPolicyContent } from '@/app/components/ReturnPolicyContent';
import {
	DEFAULT_RETURN_POLICY,
	RETURN_POLICY_SECTION_MAX,
	type ReturnPolicyConfig,
	type ReturnPolicySection,
} from '@/lib/returnPolicyConfig';
import { cn } from '@/app/components/ui/utils';

const sans = 'Montserrat, sans-serif';
const serif = "'Cormorant Garamond', serif";

function linesToArray(value: string): string[] {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

function arrayToLines(value: string[] | undefined): string {
	return value?.join('\n') ?? '';
}

function blankSection(): ReturnPolicySection {
	return {
		title: 'Nueva sección',
		paragraphs: ['Escribí el contenido de esta sección.'],
	};
}

export function MapaPaginaReturnPolicyPanel() {
	const [policy, setPolicy] = useState<ReturnPolicyConfig>(DEFAULT_RETURN_POLICY);
	const [activeIdx, setActiveIdx] = useState(0);

	useEffect(() => {
		void getSiteHomeConfigAction().then((cfg) => {
			if (cfg.returnPolicy) setPolicy(cfg.returnPolicy);
		});
	}, []);

	const updatePolicy = useCallback((partial: Partial<ReturnPolicyConfig>) => {
		setPolicy((prev) => ({ ...prev, ...partial }));
	}, []);

	const updateSection = useCallback((index: number, partial: Partial<ReturnPolicySection>) => {
		setPolicy((prev) => ({
			...prev,
			sections: prev.sections.map((section, i) => (i === index ? { ...section, ...partial } : section)),
		}));
	}, []);

	const addSection = useCallback(() => {
		setPolicy((prev) => {
			if (prev.sections.length >= RETURN_POLICY_SECTION_MAX) {
				toast.message(`Podés agregar hasta ${RETURN_POLICY_SECTION_MAX} secciones.`);
				return prev;
			}
			const next = [...prev.sections, blankSection()];
			setActiveIdx(next.length - 1);
			return { ...prev, sections: next };
		});
	}, []);

	const removeSection = useCallback((index: number) => {
		setPolicy((prev) => {
			if (prev.sections.length <= 1) {
				toast.error('La política debe tener al menos una sección.');
				return prev;
			}
			const next = prev.sections.filter((_, i) => i !== index);
			setActiveIdx((current) => Math.min(current, Math.max(0, next.length - 1)));
			return { ...prev, sections: next };
		});
	}, []);

	const save = useCallback(() => {
		void saveReturnPolicyAction(policy).then((res) => {
			if (!res.ok) {
				toast.error(res.message ?? 'No se pudo guardar.');
				return;
			}
			toast.success('Política publicada en el sitio.');
		});
	}, [policy]);

	const resetDefaults = useCallback(() => {
		setPolicy(DEFAULT_RETURN_POLICY);
		setActiveIdx(0);
		void saveReturnPolicyAction(DEFAULT_RETURN_POLICY).then((res) => {
			if (!res.ok) {
				toast.error(res.message ?? 'No se pudo restaurar.');
				return;
			}
			toast.success('Se restauró el texto original y se publicó.');
		});
	}, []);

	const activeSection = policy.sections[activeIdx];

	return (
		<div className="space-y-6">
			<div className="rounded-xl border border-[#b8956a]/25 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h2 className="mb-1 text-lg font-light text-[#1a1410] sm:text-xl" style={{ fontFamily: serif }}>
							Política de cambios y devoluciones
						</h2>
						<p className="max-w-2xl text-sm text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
							Editá el contenido de{' '}
							<Link
								href="/politica-cambios-devoluciones"
								target="_blank"
								className="inline-flex items-center gap-1 text-[#8b6f47] underline decoration-[#b8956a]/50 underline-offset-2 hover:text-[#1a1410]"
							>
								/politica-cambios-devoluciones
								<ExternalLink className="h-3.5 w-3.5" />
							</Link>
							. En los párrafos podés usar <code className="text-xs">{'{whatsapp}'}</code> para insertar el
							enlace y <code className="text-xs">**texto**</code> para negrita.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							className="bg-[#1a1410] text-[#f5f2ed] hover:bg-[#2a221c]"
							onClick={save}
						>
							<Save className="mr-2 h-4 w-4" />
							Publicar cambios
						</Button>
						<Button type="button" variant="outline" size="sm" className="border-[#b8956a]/40" onClick={resetDefaults}>
							<RotateCcw className="mr-2 h-4 w-4" />
							Restaurar original
						</Button>
					</div>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<div className="space-y-4 rounded-xl border border-[#b8956a]/20 bg-[#faf8f7]/90 p-4 sm:p-5">
					<div className="space-y-2">
						<Label htmlFor="return-policy-title" style={{ fontFamily: sans }}>
							Título de la página
						</Label>
						<Input
							id="return-policy-title"
							value={policy.pageTitle}
							onChange={(e) => updatePolicy({ pageTitle: e.target.value })}
							className="border-[#b8956a]/30 bg-white/90"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="return-policy-intro" style={{ fontFamily: sans }}>
							Introducción
						</Label>
						<Textarea
							id="return-policy-intro"
							value={policy.intro}
							onChange={(e) => updatePolicy({ intro: e.target.value })}
							rows={4}
							className="border-[#b8956a]/30 bg-white/90"
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="return-policy-wa-href" style={{ fontFamily: sans }}>
								Enlace WhatsApp
							</Label>
							<Input
								id="return-policy-wa-href"
								value={policy.whatsappHref}
								onChange={(e) => updatePolicy({ whatsappHref: e.target.value })}
								className="border-[#b8956a]/30 bg-white/90"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="return-policy-wa-label" style={{ fontFamily: sans }}>
								Texto visible del WhatsApp
							</Label>
							<Input
								id="return-policy-wa-label"
								value={policy.whatsappLabel}
								onChange={(e) => updatePolicy({ whatsappLabel: e.target.value })}
								className="border-[#b8956a]/30 bg-white/90"
							/>
						</div>
					</div>

					<div className="space-y-3 border-t border-[#b8956a]/15 pt-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6b6156]" style={{ fontFamily: sans }}>
								Secciones
							</p>
							<Button type="button" variant="outline" size="sm" className="border-[#b8956a]/40" onClick={addSection}>
								<Plus className="mr-2 h-4 w-4" />
								Agregar sección
							</Button>
						</div>

						<div className="flex flex-wrap gap-2">
							{policy.sections.map((section, index) => (
								<button
									key={`section-tab-${index}`}
									type="button"
									onClick={() => setActiveIdx(index)}
									className={cn(
										'rounded-lg border px-3 py-2 text-left text-xs transition',
										activeIdx === index
											? 'border-[#1a1410] bg-[#1a1410] text-[#f5f2ed]'
											: 'border-[#b8956a]/30 bg-white/80 text-[#6b6156] hover:bg-white',
									)}
									style={{ fontFamily: sans }}
								>
									{index + 1}. {section.title || 'Sin título'}
								</button>
							))}
						</div>

						{activeSection ? (
							<div className="space-y-3 rounded-lg border border-[#b8956a]/20 bg-white/80 p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 flex-1 space-y-2">
										<Label htmlFor="return-policy-section-title" style={{ fontFamily: sans }}>
											Título de la sección
										</Label>
										<Input
											id="return-policy-section-title"
											value={activeSection.title}
											onChange={(e) => updateSection(activeIdx, { title: e.target.value })}
											className="border-[#b8956a]/30 bg-white/90"
										/>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="mt-7 shrink-0 text-red-800/80 hover:bg-red-50 hover:text-red-900"
										onClick={() => removeSection(activeIdx)}
										aria-label="Eliminar sección"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>

								<div className="space-y-2">
									<Label htmlFor="return-policy-section-paragraphs" style={{ fontFamily: sans }}>
										Párrafos (uno por línea)
									</Label>
									<Textarea
										id="return-policy-section-paragraphs"
										value={arrayToLines(activeSection.paragraphs)}
										onChange={(e) => updateSection(activeIdx, { paragraphs: linesToArray(e.target.value) })}
										rows={5}
										className="border-[#b8956a]/30 bg-white/90 font-mono text-xs"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="return-policy-section-items" style={{ fontFamily: sans }}>
										Lista con viñetas (opcional, una por línea)
									</Label>
									<Textarea
										id="return-policy-section-items"
										value={arrayToLines(activeSection.items)}
										onChange={(e) => {
											const items = linesToArray(e.target.value);
											updateSection(activeIdx, { items: items.length ? items : undefined });
										}}
										rows={4}
										className="border-[#b8956a]/30 bg-white/90 font-mono text-xs"
									/>
								</div>
							</div>
						) : null}
					</div>
				</div>

				<div className="rounded-xl border border-[#b8956a]/20 bg-[#f5f2ed] p-4 sm:p-6">
					<p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[#6b6156]" style={{ fontFamily: sans }}>
						Vista previa
					</p>
					<h3
						className="mb-6 border-b border-[#b8956a]/40 pb-4 text-center text-2xl font-light tracking-wide text-[#1a1410]"
						style={{ fontFamily: serif }}
					>
						{policy.pageTitle}
					</h3>
					<ReturnPolicyContent policy={policy} />
				</div>
			</div>
		</div>
	);
}
