import { redirect } from 'next/navigation';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { DollarSign, Package, Percent, ShoppingCart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppPanel } from '@/app/components/app/AppPanel';
import { cn } from '@/app/components/ui/utils';

const serif = "'Cormorant Garamond', serif";
const sans = 'Montserrat, sans-serif';

const glassCard =
  'rounded-[1.35rem] border border-white/55 bg-white/25 shadow-[0_12px_48px_rgba(26,20,16,0.12)] backdrop-blur-xl';

/** Mini línea dorada (sparkline) */
function SparklineGold({ points, gradId }: { points: number[]; gradId: string }) {
  const w = 120;
  const h = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const pad = 4;
  const norm = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  let pathLine = '';
  points.forEach((v, i) => {
    const x = i * step;
    const y = norm(v);
    pathLine += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });
  const areaPath = `${pathLine} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-auto block text-[#b8956a]" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4a574" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#c4a574" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} className="opacity-95" />
      <path
        d={pathLine}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function StatGlassCard({
  title,
  value,
  badge,
  icon: Icon,
  spark,
  gradId,
  showDot,
}: {
  title: string;
  value: string;
  badge: string;
  icon: LucideIcon;
  spark: number[];
  gradId: string;
  showDot?: boolean;
}) {
  return (
    <div className={cn('relative flex min-h-[11.5rem] flex-col items-center p-5 text-center sm:p-6', glassCard)}>
      {showDot ? (
        <span className="absolute right-4 top-4 z-10 h-2 w-2 rounded-full bg-[#e85d5d] shadow-sm ring-2 ring-white/80" aria-hidden />
      ) : null}
      <div className="flex items-center justify-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#b8956a]/35 bg-[#fffdfb]/40">
          <Icon className="h-[18px] w-[18px] text-[#8b6f47]" strokeWidth={1.35} aria-hidden />
        </div>
        <span
          className="rounded-full border border-white/60 bg-white/35 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#2a2624]"
          style={{ fontFamily: sans }}
        >
          {badge}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-[#1a1410] sm:text-[1.65rem]" style={{ fontFamily: sans }}>
        {value}
      </p>
      <p
        className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#5c5349]/80"
        style={{ fontFamily: sans }}
      >
        {title}
      </p>
      <div className="mt-3 w-full shrink-0">
        <SparklineGold points={spark} gradId={gradId} />
      </div>
    </div>
  );
}

function WeeklyGlassChart() {
  const maxY = 250;
  const values = [105, 145, 90, 180, 120, 220, 160];
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const n = values.length;
  const chartW = 560;
  const chartH = 200;
  const padL = 44;
  const padR = 16;
  const padT = 28;
  const padB = 52;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const barGap = 10;
  const barW = (innerW - barGap * (n - 1)) / n;
  const xAt = (i: number) => padL + i * (barW + barGap) + barW / 2;
  const yAt = (v: number) => padT + innerH - (v / maxY) * innerH;

  const linePts = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  let lineD = `M ${linePts[0]?.x} ${linePts[0]?.y}`;
  for (let i = 0; i < linePts.length - 1; i++) {
    const p0 = linePts[i];
    const p1 = linePts[i + 1];
    if (!p0 || !p1) continue;
    const mx = (p0.x + p1.x) / 2;
    lineD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const yTicks = [0, 50, 100, 150, 200, 250];

  return (
    <div className={cn('relative overflow-hidden p-5 text-center sm:p-8', glassCard)}>
      <div className="mb-6 flex flex-col items-center gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#6b6156]" style={{ fontFamily: sans }}>
            Semana
          </p>
          <h2 className="mt-2 text-2xl font-light tracking-wide text-[#1a1410] sm:text-3xl" style={{ fontFamily: serif }}>
            Ritmo suave
          </h2>
          <p className="mt-1.5 text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
            Vista previa · datos de ejemplo
          </p>
        </div>
        <p className="text-sm font-medium text-[#8b6f47]" style={{ fontFamily: sans }}>
          +18% <span className="font-normal text-[#6b6156]">vs. semana anterior</span>
        </p>
      </div>

      <div className="relative flex w-full justify-center overflow-x-auto">
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="h-[220px] w-full min-w-[520px] text-[#b8956a]" preserveAspectRatio="xMidYMid meet" aria-hidden>
          <defs>
            <linearGradient id="barGradWeekly" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#c4a574" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#e8d9c4" stopOpacity="0.85" />
            </linearGradient>
            <filter id="softGlowWeekly" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {yTicks.map((t) => {
            const y = yAt(t);
            return (
              <g key={t}>
                <line x1={padL - 6} y1={y} x2={chartW - padR} y2={y} stroke="rgba(42,38,36,0.06)" strokeWidth={1} />
                <text x={padL - 10} y={y + 4} textAnchor="end" className="fill-[#9c9590] text-[9px]" style={{ fontFamily: sans }}>
                  {t}
                </text>
              </g>
            );
          })}

          {values.map((v, i) => {
            const x = padL + i * (barW + barGap);
            const y = yAt(v);
            const h = padT + innerH - y;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={10}
                fill="url(#barGradWeekly)"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={1}
              />
            );
          })}

          <path
            d={lineD}
            fill="none"
            stroke="#a67c3a"
            strokeWidth={2.25}
            strokeLinecap="round"
            filter="url(#softGlowWeekly)"
            opacity={0.95}
          />

          {linePts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#fffdf9" stroke="#8b6f47" strokeWidth={1.5} />
          ))}

          {/* Miércoles — punto de interés */}
          <circle cx={xAt(2)} cy={yAt(values[2] ?? 0) - 14} r={4} fill="#e85d5d" className="drop-shadow-sm" />
        </svg>

        <div className="pointer-events-none absolute bottom-[3.25rem] right-2 z-10 max-w-[9.5rem] rounded-xl border border-white/70 bg-white/55 px-3 py-2 text-center shadow-lg backdrop-blur-md sm:right-6">
          <p className="text-[9px] font-bold uppercase leading-tight tracking-wide text-[#8b6f47]" style={{ fontFamily: sans }}>
            Pico de la semana
          </p>
          <p className="mt-0.5 text-xs font-semibold text-[#1a1410]" style={{ fontFamily: sans }}>
            (+18%)
          </p>
        </div>
      </div>

      <div className="mx-auto mt-2 grid min-w-[520px] max-w-[560px] grid-cols-7 gap-1 px-2 text-[9px] font-medium uppercase tracking-wide text-[#6b6156] sm:px-4">
        {days.map((d) => (
          <span key={d} className="text-center" style={{ fontFamily: sans }}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

export async function DashboardHome() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  ) {
    redirect('/login');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .maybeSingle();

  const displayName = profile?.username ?? user.email?.split('@')[0] ?? 'Usuario';
  const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=f5f0eb`;

  return (
    <AppPanel className="mx-auto max-w-6xl min-w-0 border-0 bg-transparent p-0 shadow-none backdrop-blur-none sm:rounded-none sm:p-0">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center space-y-8 text-center sm:space-y-10">
        <header className="flex w-full max-w-2xl flex-col items-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#6b6156]" style={{ fontFamily: sans }}>
            Sor Juana
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <h1
              className="text-[1.85rem] font-light leading-tight tracking-wide text-[#1a1410] sm:text-[2.35rem]"
              style={{ fontFamily: serif }}
            >
              Hola,{' '}
              <span className="font-normal capitalize">{displayName}</span>
            </h1>
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white/80 bg-[#f5f0eb] shadow-md ring-2 ring-[#b8956a]/25">
              <Image src={avatarSrc} alt="" fill className="object-cover" sizes="44px" unoptimized />
            </div>
          </div>
          <p className="mt-3 max-w-lg text-sm text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 400 }}>
            Tu boutique, en un vistazo. Sesión iniciada correctamente.
          </p>
        </header>

        <section className="grid w-full max-w-5xl grid-cols-1 justify-items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <StatGlassCard
            title="Totales"
            value="$1.240"
            badge="+12%"
            icon={DollarSign}
            spark={[12, 18, 14, 22, 19, 24, 20]}
            gradId="spark-grad-totales"
          />
          <StatGlassCard
            title="Pedidos"
            value="45"
            badge="+5%"
            icon={ShoppingCart}
            spark={[8, 12, 10, 15, 11, 14, 13]}
            gradId="spark-grad-pedidos"
          />
          <StatGlassCard
            title="Stock"
            value="1.200"
            badge="="
            icon={Package}
            spark={[18, 18, 19, 17, 18, 18, 19]}
            gradId="spark-grad-stock"
          />
          <StatGlassCard
            title="Conversión"
            value="3,4 %"
            badge="+2%"
            icon={Percent}
            spark={[10, 14, 12, 18, 15, 20, 17]}
            gradId="spark-grad-conv"
            showDot
          />
        </section>

        <div className="w-full max-w-5xl">
          <WeeklyGlassChart />
        </div>

        <div className={cn('w-full max-w-xl divide-y divide-white/40', glassCard)}>
          <div className="flex flex-col items-center gap-1 px-5 py-4 sm:px-6">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6b6156]" style={{ fontFamily: sans }}>
              Perfil
            </span>
            <span className="text-lg font-light capitalize text-[#1a1410]" style={{ fontFamily: serif }}>
              {displayName}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 px-5 py-4 sm:px-6">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6b6156]" style={{ fontFamily: sans }}>
              Rol
            </span>
            <span className="text-lg font-light capitalize text-[#1a1410]" style={{ fontFamily: serif }}>
              {profile?.role ?? '—'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 px-5 py-4 sm:px-6">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6b6156]" style={{ fontFamily: sans }}>
              Email
            </span>
            <span className="break-all text-center text-sm text-[#2a2520]" style={{ fontFamily: sans }}>
              {user.email ?? '—'}
            </span>
          </div>
        </div>
      </div>
    </AppPanel>
  );
}
