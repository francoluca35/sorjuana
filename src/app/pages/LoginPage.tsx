'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, type FormEvent } from 'react';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';
import { loginWithUsername } from '@/app/actions/auth';

const serif = "'Cormorant Garamond', serif";
const sans = 'Montserrat, sans-serif';

const LOGIN_VIDEO_URL =
	'https://res.cloudinary.com/dqr1ehkv7/video/upload/q_auto:eco,w_1920,c_limit/v1775777413/login_jmgi0f.mp4';
/** Primer fotograma del video (ligero): en móvil reemplaza el mp4 para fluidez y datos. */
const LOGIN_HERO_POSTER_URL =
	'https://res.cloudinary.com/dqr1ehkv7/video/upload/so_0,q_auto:low,w_1200,c_fill,f_jpg/v1775777413/login_jmgi0f.jpg';
const LOGIN_LOGO_URL =
	'https://res.cloudinary.com/dqr1ehkv7/image/upload/v1775593895/modern-fashion-store/logo-b.png';

const LOGO_SHOW_DELAY_MOBILE_MS = 120;
const LOGO_SHOW_DELAY_DESKTOP_MS = 600;

export function LoginPage() {
  const router = useRouter();
  const [remember, setRemember] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 1023px)');
    const delay = narrow.matches ? LOGO_SHOW_DELAY_MOBILE_MS : LOGO_SHOW_DELAY_DESKTOP_MS;
    const id = window.setTimeout(() => setLogoVisible(true), delay);
    return () => window.clearTimeout(id);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const username = String(fd.get('username') ?? '');
    const password = String(fd.get('password') ?? '');
    setPending(true);
    try {
      const result = await loginWithUsername(username, password);
      if (result.ok) {
        router.refresh();
        router.push('/app/dashboard');
      } else {
        alert(result.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative min-h-dvh">
      <Link
        href="/"
        className="fixed top-5 left-5 z-[60] flex h-11 w-11 items-center justify-center rounded-sm border border-[#f5f2ed]/25 bg-[#1a1410]/50 text-[#f5f2ed] shadow-lg backdrop-blur-sm transition-colors hover:border-[#b8956a]/40 hover:bg-[#1a1410]/70 hover:text-[#e8d5b5]"
        aria-label="Volver al inicio"
      >
        <Home className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </Link>

      <div className="grid min-h-dvh lg:grid-cols-2">
        <div className="relative isolate min-h-[min(42vh,320px)] lg:min-h-dvh">
          {/* Móvil: sin video (ahorra datos, CPU y evita autoplay bloqueado). Desktop: video con poster. */}
          <div className="absolute inset-0 z-0 bg-[#1a1410] lg:hidden">
            <Image
              src={LOGIN_HERO_POSTER_URL}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <video
            className="absolute inset-0 z-0 hidden h-full w-full object-cover lg:block"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={LOGIN_HERO_POSTER_URL}
            aria-hidden
          >
            <source src={LOGIN_VIDEO_URL} type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1a1410]/25 to-transparent lg:bg-gradient-to-r" />
          <div
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center px-6"
            aria-hidden={!logoVisible}
          >
            <div
              className={cn(
                'relative h-[min(7rem,18vh)] w-[min(22rem,88vw)] max-w-[90%] transition-opacity duration-700 ease-out sm:h-[min(8rem,20vh)] sm:w-[min(26rem,80%)]',
                logoVisible ? 'opacity-100' : 'opacity-0',
              )}
            >
              <Image
                src={LOGIN_LOGO_URL}
                alt="Sor Juana Liberté"
                fill
                sizes="(max-width: 2024px) 100vw, 50vw"
                className="object-contain object-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
                priority
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center bg-[#f5f2ed] px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md">
            <h1
              className="text-center text-3xl font-light tracking-[0.35em] text-[#1a1410] uppercase sm:text-4xl"
              style={{ fontFamily: serif }}
            >
              Sor Juana
            </h1>
            <p
              className="mt-3 text-center text-sm font-light tracking-[0.28em] text-[#1a1410] uppercase"
              style={{ fontFamily: serif }}
            >
              Bienvenidos
            </p>

            <form onSubmit={onSubmit} className="mt-12 space-y-8">
              <div className="space-y-2">
                <Label
                  htmlFor="login-username"
                  className="text-[11px] font-normal tracking-widest text-[#6b6156] uppercase"
                  style={{ fontFamily: sans }}
                >
                  Usuario
                </Label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={pending}
                  className={cn(
                    'w-full border-0 border-b border-[#1a1410]/35 bg-transparent py-2.5 text-[#2a2520] outline-none transition-colors',
                    'placeholder:text-[#a89080]/80 focus:border-[#1a1410] disabled:opacity-50',
                  )}
                  style={{ fontFamily: sans }}
                  placeholder=""
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="login-password"
                  className="text-[11px] font-normal tracking-widest text-[#6b6156] uppercase"
                  style={{ fontFamily: sans }}
                >
                  Contraseña
                </Label>
                <div className="relative flex items-center">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    disabled={pending}
                    className={cn(
                      'w-full border-0 border-b border-[#1a1410]/35 bg-transparent py-2.5 pr-11 text-[#2a2520] outline-none transition-colors',
                      'focus:border-[#1a1410] disabled:opacity-50',
                    )}
                    style={{ fontFamily: sans }}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-0 top-1/2 z-10 flex min-h-11 min-w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-sm text-[#6b6156] transition-colors hover:bg-[#1a1410]/5 hover:text-[#1a1410] active:bg-[#1a1410]/10 disabled:opacity-40"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                    )}
                  </button>
                </div>
                <div className="pt-1">
                  <a
                    href="#recuperar"
                    className="text-xs tracking-wide text-[#2a2520] underline underline-offset-4 transition-colors hover:text-[#b8956a]"
                    style={{ fontFamily: sans }}
                    onClick={(ev) => ev.preventDefault()}
                  >
                    Olvidé mi contraseña
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  className="border-[#1a1410]/50 data-[state=checked]:border-[#1a1410] data-[state=checked]:bg-[#1a1410]"
                />
                <Label
                  htmlFor="remember"
                  className="cursor-pointer text-xs font-normal tracking-wide text-[#2a2520] normal-case"
                  style={{ fontFamily: sans }}
                >
                  Mantener sesión iniciada
                </Label>
              </div>

              <Button
                type="submit"
                disabled={pending}
                className="h-12 w-full rounded-none border-0 bg-[#1a1410] text-xs font-medium tracking-[0.35em] text-[#f5f2ed] uppercase shadow-none hover:bg-[#3d3530] disabled:opacity-60"
                style={{ fontFamily: sans }}
              >
                {pending ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
