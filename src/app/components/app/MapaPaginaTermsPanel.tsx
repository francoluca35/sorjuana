'use client';

import { useCallback } from 'react';
import { getSiteHomeConfigAction, saveTermsConditionsAction } from '@/app/actions/siteHomeConfig';
import { MapaPaginaLegalPageEditor } from '@/app/components/app/MapaPaginaLegalPageEditor';
import { DEFAULT_TERMS_CONDITIONS } from '@/lib/termsConditionsConfig';

export function MapaPaginaTermsPanel() {
	const loadConfig = useCallback(async () => {
		const cfg = await getSiteHomeConfigAction();
		return cfg.termsConditions;
	}, []);

	return (
		<MapaPaginaLegalPageEditor
			heading="Términos y condiciones"
			description="Editá el contenido de"
			publicPath="/terminos-y-condiciones"
			defaultConfig={DEFAULT_TERMS_CONDITIONS}
			loadConfig={loadConfig}
			saveConfig={saveTermsConditionsAction}
		/>
	);
}
