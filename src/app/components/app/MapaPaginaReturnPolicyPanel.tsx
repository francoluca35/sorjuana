'use client';

import { useCallback } from 'react';
import { getSiteHomeConfigAction, saveReturnPolicyAction } from '@/app/actions/siteHomeConfig';
import { MapaPaginaLegalPageEditor } from '@/app/components/app/MapaPaginaLegalPageEditor';
import { DEFAULT_RETURN_POLICY } from '@/lib/returnPolicyConfig';

export function MapaPaginaReturnPolicyPanel() {
	const loadConfig = useCallback(async () => {
		const cfg = await getSiteHomeConfigAction();
		return cfg.returnPolicy;
	}, []);

	return (
		<MapaPaginaLegalPageEditor
			heading="Política de cambios y devoluciones"
			description="Editá el contenido de"
			publicPath="/politica-cambios-devoluciones"
			defaultConfig={DEFAULT_RETURN_POLICY}
			loadConfig={loadConfig}
			saveConfig={saveReturnPolicyAction}
		/>
	);
}
