import Link from 'next/link';
import { Home } from 'lucide-react';
import { ReturnPolicyContent } from '@/app/components/ReturnPolicyContent';
import type { ReturnPolicyConfig } from '@/lib/returnPolicyConfig';

const serif = "'Cormorant Garamond', serif";

export function PoliticaCambiosDevolucionesPage({ policy }: { policy: ReturnPolicyConfig }) {
	return (
		<main className="relative min-h-dvh bg-[#f5f2ed] pb-20 pt-12 text-[#2a2520] sm:pt-14">
			<Link
				href="/"
				className="fixed top-5 left-5 z-[60] flex h-11 w-11 items-center justify-center rounded-sm border border-[#1a1410]/20 bg-white/90 text-[#1a1410] shadow-md backdrop-blur-sm transition-colors hover:border-[#b8956a]/50 hover:bg-[#f5f2ed]"
				aria-label="Volver al inicio"
			>
				<Home className="h-5 w-5" strokeWidth={1.5} aria-hidden />
			</Link>

			<div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
				<h1
					className="mb-10 border-b border-[#b8956a]/40 pb-6 text-center text-3xl font-light tracking-wide text-[#1a1410] sm:text-4xl"
					style={{ fontFamily: serif }}
				>
					{policy.pageTitle}
				</h1>

				<ReturnPolicyContent policy={policy} />
			</div>
		</main>
	);
}
