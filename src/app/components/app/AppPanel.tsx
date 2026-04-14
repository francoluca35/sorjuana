import { cn } from '@/app/components/ui/utils';

export function AppPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-none border border-[#b8956a]/35 bg-[#f5f2ed]/93 p-6 shadow-xl backdrop-blur-md sm:rounded-sm sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  );
}
