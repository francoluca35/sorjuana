import Link from 'next/link';
import type { LegalPageConfig } from '@/lib/legalPageConfig';

const serif = "'Cormorant Garamond', serif";
const sans = 'Montserrat, sans-serif';

function renderInlineText(text: string, whatsappHref: string, whatsappLabel: string) {
	const parts = text.split(/(\*\*[^*]+\*\*|\{whatsapp\})/g);
	return parts.map((part, index) => {
		if (part.startsWith('**') && part.endsWith('**')) {
			return (
				<strong key={index} className="font-medium text-[#2a2520]">
					{part.slice(2, -2)}
				</strong>
			);
		}
		if (part === '{whatsapp}') {
			return (
				<Link
					key={index}
					href={whatsappHref}
					target="_blank"
					rel="noopener noreferrer"
					className="font-medium text-[#8b6f47] underline decoration-[#b8956a]/60 underline-offset-4 transition-colors hover:text-[#1a1410]"
				>
					{whatsappLabel}
				</Link>
			);
		}
		return part;
	});
}

export function ReturnPolicyContent({ policy }: { policy: LegalPageConfig }) {
	return (
		<div className="space-y-10 text-[0.95rem] leading-relaxed sm:text-base" style={{ fontFamily: sans, fontWeight: 300 }}>
			<p className="text-[#2a2520]">{policy.intro}</p>

			{policy.sections.map((section) => (
				<section key={section.title}>
					<h2 className="mb-3 text-lg font-medium tracking-wide text-[#1a1410]" style={{ fontFamily: serif }}>
						{section.title}
					</h2>
					{section.paragraphs.map((paragraph, index) => (
						<p key={`${section.title}-p-${index}`} className={index > 0 ? 'mt-3 text-[#6b6156]' : 'text-[#6b6156]'}>
							{renderInlineText(paragraph, policy.whatsappHref, policy.whatsappLabel)}
						</p>
					))}
					{section.items?.length ? (
						<ul className="mt-3 list-inside list-disc space-y-2 text-[#6b6156] marker:text-[#b8956a]">
							{section.items.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					) : null}
				</section>
			))}
		</div>
	);
}
