'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Home } from 'lucide-react';
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
  'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775777413/login_jmgi0f.mp4';
const LOGIN_LOGO_URL =
  'https://res.cloudinary.com/dqr1ehkv7/image/upload/v1775593895/modern-fashion-store/logo-b.png';

const LOGO_SHOW_DELAY_MS = 1000;

export function LoginPage() {
  const router = useRouter();
  const [remember, setRemember] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setLogoVisible(true), LOGO_SHOW_DELAY_MS);
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
        router.push('/dashboard');
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
          <video
            className="absolute inset-0 z-0 h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
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
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={pending}
                  className={cn(
                    'w-full border-0 border-b border-[#1a1410]/35 bg-transparent py-2.5 text-[#2a2520] outline-none transition-colors',
                    'focus:border-[#1a1410] disabled:opacity-50',
                  )}
                  style={{ fontFamily: sans }}
                />
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
