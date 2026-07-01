'use client';

import { useCallback } from 'react';
import { getSiteHomeConfigAction, saveReturnPolicyAction } from '@/app/actions/siteHomeConfig';
import { MapaPaginaLegalPageEditor } from '@/app/components/app/MapaPaginaLegalPageEditor';
import { DEFAULT_RETURN_POLICY } from '@/lib/returnPolicyConfig';

export function MapaPaginaReturnPolicyPanel() {
	const loadConfig = useCallback(async () => {
		try {
			const cfg = await getSiteHomeConfigAction();
			return cfg.returnPolicy;
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'No se pudo cargar la política desde Firestore.';
			throw new Error(msg);
		}
	}, []);

	return (
		<MapaPaginaLegalPageEditor
			heading="Política de cambios y devoluciones"
			description="Editá el contenido publicado en Firestore para"
			publicPath="/politica-cambios-devoluciones"
			defaultConfig={DEFAULT_RETURN_POLICY}
			loadConfig={loadConfig}
			saveConfig={saveReturnPolicyAction}
			saveSuccessMessage="Política guardada en Firestore y publicada en el sitio."
			firestoreField="site_home_config.return_policy"
		/>
	);
}
