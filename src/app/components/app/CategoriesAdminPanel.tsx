'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { cn } from '@/app/components/ui/utils';
import { slugifyLabel, type ShopCategoryTree } from '@/lib/data/shopCategories';
import {
	createShopCategoryAction,
	createShopSubcategoryAction,
	deleteShopCategoryAction,
	deleteShopSubcategoryAction,
	listShopCategoryTreeAction,
	updateShopCategoryAction,
	updateShopSubcategoryAction,
} from '@/app/actions/shopCategories';

const sans = 'Montserrat, sans-serif';
const serif = "'Cormorant Garamond', serif";

const card =
	'rounded-lg border border-[#b8956a]/25 bg-white/85 p-5 shadow-sm backdrop-blur-sm';

export function CategoriesAdminPanel() {
	const [tree, setTree] = useState<ShopCategoryTree[]>([]);
	const [loading, setLoading] = useState(true);

	const [newCatName, setNewCatName] = useState('');

	const [subParentId, setSubParentId] = useState('');
	const [newSubName, setNewSubName] = useState('');

	const [editingCatId, setEditingCatId] = useState<string | null>(null);
	const [editCatName, setEditCatName] = useState('');

	const [editingSub, setEditingSub] = useState<{ id: string; categoryId: string } | null>(null);
	const [editSubName, setEditSubName] = useState('');

	const [deleteTarget, setDeleteTarget] = useState<
		{ type: 'category' | 'sub'; id: string; label: string } | null
	>(null);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const data = await listShopCategoryTreeAction();
			setTree(data);
			setSubParentId((prev) => {
				if (!data.length) return '';
				if (prev && data.some((c) => c.id === prev)) return prev;
				return data[0].id;
			});
		} catch {
			toast.error('No se pudo cargar el árbol de categorías.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const onAddCategory = async () => {
		const slugHint = newCatName.trim() ? slugifyLabel(newCatName.trim()) : null;
		const r = await createShopCategoryAction(newCatName, slugHint);
		if (!r.ok) {
			toast.error(r.message);
			return;
		}
		toast.success('Categoría creada.');
		setNewCatName('');
		void refresh();
	};

	const onAddSubcategory = async () => {
		const slugHint = newSubName.trim() ? slugifyLabel(newSubName.trim()) : null;
		const r = await createShopSubcategoryAction(subParentId, newSubName, slugHint);
		if (!r.ok) {
			toast.error(r.message);
			return;
		}
		toast.success('Subcategoría creada.');
		setNewSubName('');
		void refresh();
	};

	const startEditCategory = (c: ShopCategoryTree) => {
		setEditingCatId(c.id);
		setEditCatName(c.name);
		setEditingSub(null);
	};

	const saveCategory = async (id: string) => {
		const slugHint = editCatName.trim() ? slugifyLabel(editCatName.trim()) : null;
		const r = await updateShopCategoryAction(id, editCatName, slugHint);
		if (!r.ok) {
			toast.error(r.message);
			return;
		}
		toast.success('Categoría actualizada.');
		setEditingCatId(null);
		void refresh();
	};

	const startEditSub = (categoryId: string, sub: { id: string; name: string; slug: string }) => {
		setEditingSub({ id: sub.id, categoryId });
		setEditSubName(sub.name);
		setEditingCatId(null);
	};

	const saveSub = async () => {
		if (!editingSub) return;
		const slugHint = editSubName.trim() ? slugifyLabel(editSubName.trim()) : null;
		const r = await updateShopSubcategoryAction(
			editingSub.id,
			editingSub.categoryId,
			editSubName,
			slugHint,
		);
		if (!r.ok) {
			toast.error(r.message);
			return;
		}
		toast.success('Subcategoría actualizada.');
		setEditingSub(null);
		void refresh();
	};

	const confirmDelete = async () => {
		if (!deleteTarget) return;
		if (deleteTarget.type === 'category') {
			const r = await deleteShopCategoryAction(deleteTarget.id);
			if (!r.ok) {
				toast.error(r.message);
				return;
			}
			toast.success('Categoría eliminada.');
		} else {
			const r = await deleteShopSubcategoryAction(deleteTarget.id);
			if (!r.ok) {
				toast.error(r.message);
				return;
			}
			toast.success('Subcategoría eliminada.');
		}
		setDeleteTarget(null);
		if (editingCatId === deleteTarget.id) setEditingCatId(null);
		if (editingSub?.id === deleteTarget.id) setEditingSub(null);
		void refresh();
	};

	return (
		<div className="mx-auto max-w-4xl space-y-8">
			<header>
				<h1
					className="text-2xl font-light text-[#1a1410] sm:text-3xl"
					style={{ fontFamily: serif }}
				>
					Categorías y subcategorías
				</h1>
				<p className="mt-2 text-sm text-[#6b6156]" style={{ fontFamily: sans }}>
					Definí la jerarquía de tu tienda (por ejemplo: Francés → Pantalón). Los cambios se guardan en la
					base de datos.
				</p>
			</header>

			<div className={cn('grid gap-6 md:grid-cols-2', card)}>
				<div>
					<h2 className="text-sm font-medium uppercase tracking-[0.18em] text-[#8b6f47]" style={{ fontFamily: sans }}>
						Nueva categoría
					</h2>
					<div className="mt-4 space-y-3">
						<div>
							<Label htmlFor="nc-name">Nombre</Label>
							<Input
								id="nc-name"
								value={newCatName}
								onChange={(e) => setNewCatName(e.target.value)}
								placeholder="Ej. Francés"
								className="mt-1.5 border-[#b8956a]/30"
							/>
						</div>
						<div>
							<Label htmlFor="nc-slug">Slug (automático)</Label>
							<Input
								id="nc-slug"
								readOnly
								tabIndex={-1}
								value={newCatName.trim() ? slugifyLabel(newCatName.trim()) : ''}
								placeholder="Se completa al escribir el nombre"
								className="mt-1.5 cursor-default border-[#b8956a]/30 bg-[#f5f2ed]/80 text-[#6b6156]"
								aria-readonly="true"
							/>
						</div>
						<Button
							type="button"
							onClick={() => void onAddCategory()}
							className="w-full bg-[#1a1410] text-[#f5f2ed] hover:bg-[#b8956a] sm:w-auto"
							style={{ fontFamily: sans }}
						>
							<Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
							Agregar categoría
						</Button>
					</div>
				</div>

				<div>
					<h2 className="text-sm font-medium uppercase tracking-[0.18em] text-[#8b6f47]" style={{ fontFamily: sans }}>
						Nueva subcategoría
					</h2>
					<div className="mt-4 space-y-3">
						<div>
							<Label htmlFor="ns-parent">Categoría</Label>
							<select
								id="ns-parent"
								value={subParentId}
								onChange={(e) => setSubParentId(e.target.value)}
								className="mt-1.5 flex h-10 w-full rounded-md border border-[#b8956a]/30 bg-white px-3 text-sm text-[#1a1410] outline-none focus:ring-2 focus:ring-[#b8956a]/25"
								style={{ fontFamily: sans }}
							>
								{tree.length === 0 ? (
									<option value="">Creá primero una categoría</option>
								) : null}
								{tree.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<Label htmlFor="ns-name">Nombre</Label>
							<Input
								id="ns-name"
								value={newSubName}
								onChange={(e) => setNewSubName(e.target.value)}
								placeholder="Ej. Pantalón"
								className="mt-1.5 border-[#b8956a]/30"
								disabled={!subParentId}
							/>
						</div>
						<div>
							<Label htmlFor="ns-slug">Slug (automático)</Label>
							<Input
								id="ns-slug"
								readOnly
								tabIndex={-1}
								value={newSubName.trim() ? slugifyLabel(newSubName.trim()) : ''}
								placeholder="Se completa al escribir el nombre"
								className="mt-1.5 cursor-default border-[#b8956a]/30 bg-[#f5f2ed]/80 text-[#6b6156]"
								disabled={!subParentId}
								aria-readonly="true"
							/>
						</div>
						<Button
							type="button"
							onClick={() => void onAddSubcategory()}
							disabled={!subParentId || !newSubName.trim()}
							className="w-full bg-[#1a1410] text-[#f5f2ed] hover:bg-[#b8956a] sm:w-auto"
							style={{ fontFamily: sans }}
						>
							<Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
							Agregar subcategoría
						</Button>
					</div>
				</div>
			</div>

			<div className={cn(card)}>
				<h2 className="text-sm font-medium uppercase tracking-[0.18em] text-[#8b6f47]" style={{ fontFamily: sans }}>
					Listado y edición
				</h2>
				{loading ? (
					<p className="mt-6 text-sm text-[#6b6156]" style={{ fontFamily: sans }}>
						Cargando…
					</p>
				) : tree.length === 0 ? (
					<p className="mt-6 text-sm text-[#6b6156]" style={{ fontFamily: sans }}>
						Aún no hay categorías. Creá la primera arriba.
					</p>
				) : (
					<ul className="mt-6 space-y-6">
						{tree.map((c) => (
							<li
								key={c.id}
								className="rounded-md border border-[#b8956a]/20 bg-[#faf8f5]/90 p-4"
							>
								{editingCatId === c.id ? (
									<div className="space-y-3">
										<div className="flex flex-col gap-3">
											<div>
												<Label htmlFor={`ec-name-${c.id}`}>Nombre</Label>
												<Input
													id={`ec-name-${c.id}`}
													value={editCatName}
													onChange={(e) => setEditCatName(e.target.value)}
													className="mt-1.5 border-[#b8956a]/30"
												/>
											</div>
											<div>
												<Label htmlFor={`ec-slug-${c.id}`}>Slug (automático)</Label>
												<Input
													id={`ec-slug-${c.id}`}
													readOnly
													tabIndex={-1}
													value={editCatName.trim() ? slugifyLabel(editCatName.trim()) : ''}
													className="mt-1.5 cursor-default border-[#b8956a]/30 bg-[#f5f2ed]/80 text-[#6b6156]"
													aria-readonly="true"
												/>
											</div>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												type="button"
												size="sm"
												onClick={() => void saveCategory(c.id)}
												className="bg-[#b8956a] text-[#1a1410] hover:bg-[#a6845f]"
											>
												Guardar
											</Button>
											<Button type="button" size="sm" variant="outline" onClick={() => setEditingCatId(null)}>
												Cancelar
											</Button>
										</div>
									</div>
								) : (
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<p className="text-lg font-medium text-[#1a1410]" style={{ fontFamily: serif }}>
												{c.name}
											</p>
											<p className="text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
												Slug: <code className="rounded bg-[#e8e3db]/80 px-1">{c.slug}</code>
											</p>
										</div>
										<div className="flex gap-1">
											<Button
												type="button"
												size="icon"
												variant="ghost"
												className="text-[#1a1410] hover:bg-[#b8956a]/15"
												aria-label={`Editar categoría ${c.name}`}
												onClick={() => startEditCategory(c)}
											>
												<Pencil className="h-4 w-4" strokeWidth={1.5} />
											</Button>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												className="text-red-700 hover:bg-red-50"
												aria-label={`Eliminar categoría ${c.name}`}
												onClick={() =>
													setDeleteTarget({ type: 'category', id: c.id, label: c.name })
												}
											>
												<Trash2 className="h-4 w-4" strokeWidth={1.5} />
											</Button>
										</div>
									</div>
								)}

								{c.subcategories.length > 0 ? (
									<ul className="mt-4 space-y-3 border-t border-[#b8956a]/15 pt-4">
										{c.subcategories.map((s) => (
											<li
												key={s.id}
												className="flex flex-wrap items-start justify-between gap-2 rounded border border-transparent bg-white/60 px-3 py-2"
											>
												{editingSub?.id === s.id ? (
													<div className="w-full space-y-2">
														<div className="grid gap-2 sm:grid-cols-1">
															<div>
																<Label htmlFor={`es-name-${s.id}`}>Nombre</Label>
																<Input
																	id={`es-name-${s.id}`}
																	value={editSubName}
																	onChange={(e) => setEditSubName(e.target.value)}
																	className="mt-1 border-[#b8956a]/30"
																/>
															</div>
															<div>
																<Label htmlFor={`es-slug-${s.id}`}>Slug (automático)</Label>
																<Input
																	id={`es-slug-${s.id}`}
																	readOnly
																	tabIndex={-1}
																	value={editSubName.trim() ? slugifyLabel(editSubName.trim()) : ''}
																	className="mt-1 cursor-default border-[#b8956a]/30 bg-[#f5f2ed]/80 text-[#6b6156]"
																	aria-readonly="true"
																/>
															</div>
														</div>
														<div className="flex gap-2">
															<Button type="button" size="sm" onClick={() => void saveSub()}>
																Guardar
															</Button>
															<Button type="button" size="sm" variant="outline" onClick={() => setEditingSub(null)}>
																Cancelar
															</Button>
														</div>
													</div>
												) : (
													<>
														<div>
															<p className="text-sm font-medium text-[#1a1410]" style={{ fontFamily: sans }}>
																{s.name}
															</p>
															<p className="text-[11px] text-[#6b6156]">
																<code className="rounded bg-[#e8e3db]/80 px-1">{s.slug}</code>
															</p>
														</div>
														<div className="flex gap-1">
															<Button
																type="button"
																size="icon"
																variant="ghost"
																className="h-8 w-8 text-[#1a1410]"
																aria-label={`Editar ${s.name}`}
																onClick={() => startEditSub(c.id, s)}
															>
																<Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
															</Button>
															<Button
																type="button"
																size="icon"
																variant="ghost"
																className="h-8 w-8 text-red-700 hover:bg-red-50"
																aria-label={`Eliminar ${s.name}`}
																onClick={() =>
																	setDeleteTarget({
																		type: 'sub',
																		id: s.id,
																		label: `${c.name} → ${s.name}`,
																	})
																}
															>
																<Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
															</Button>
														</div>
													</>
												)}
											</li>
										))}
									</ul>
								) : (
									<p className="mt-3 text-xs italic text-[#9c9590]" style={{ fontFamily: sans }}>
										Sin subcategorías todavía.
									</p>
								)}
							</li>
						))}
					</ul>
				)}
			</div>

			<AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
				<AlertDialogContent className="border-[#b8956a]/30">
					<AlertDialogHeader>
						<AlertDialogTitle style={{ fontFamily: serif }}>¿Eliminar?</AlertDialogTitle>
						<AlertDialogDescription style={{ fontFamily: sans }}>
							{deleteTarget
								? `Se eliminará “${deleteTarget.label}”. ${
										deleteTarget.type === 'category'
											? 'Todas sus subcategorías se borrarán también.'
											: ''
									}`
								: ''}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-700 hover:bg-red-800"
							onClick={() => void confirmDelete()}
						>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
