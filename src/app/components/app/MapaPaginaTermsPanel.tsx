'use client';

import { useCallback } from 'react';
import { getSiteHomeConfigAction, saveTermsConditionsAction } from '@/app/actions/siteHomeConfig';
import { MapaPaginaLegalPageEditor } from '@/app/components/app/MapaPaginaLegalPageEditor';
import { DEFAULT_TERMS_CONDITIONS } from '@/lib/termsConditionsConfig';

export function MapaPaginaTermsPanel() {
	const loadConfig = useCallback(async () => {
		try {
			const cfg = await getSiteHomeConfigAction();
			return cfg.termsConditions;
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'No se pudieron cargar los términos desde Firestore.';
			throw new Error(msg);
		}
	}, []);

	return (
		<MapaPaginaLegalPageEditor
			heading="Términos y condiciones"
			description="Editá el contenido publicado en Firestore para"
			publicPath="/terminos-y-condiciones"
			defaultConfig={DEFAULT_TERMS_CONDITIONS}
			loadConfig={loadConfig}
			saveConfig={saveTermsConditionsAction}
			saveSuccessMessage="Términos guardados en Firestore y publicados en el sitio."
			firestoreField="site_home_config.terms_conditions"
		/>
	);
}
