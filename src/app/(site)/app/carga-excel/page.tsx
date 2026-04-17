import type { Metadata } from 'next';
import { AppPanel } from '@/app/components/app/AppPanel';
import ExcelImportPanel from '@/app/components/app/ExcelImportPanel';
import { cn } from '@/app/components/ui/utils';

export const metadata: Metadata = {
	title: 'Carga de excel — Sor Juana',
};

const shellBleed = cn(
	'-mx-4 -my-4 w-[calc(100%+2rem)] min-w-0 max-w-none sm:-mx-6 sm:-my-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-8 lg:w-[calc(100%+4rem)]',
	'min-h-dvh bg-[#f0ebe4]',
);

export default function Page() {
	return (
		<div className={shellBleed}>
			<AppPanel
				className={cn(
					'w-full max-w-none rounded-none border-0 bg-transparent shadow-none backdrop-blur-none sm:rounded-none',
					'px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10 xl:px-16 xl:py-11',
				)}
			>
				<ExcelImportPanel />
			</AppPanel>
		</div>
	);
}
