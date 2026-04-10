'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type LoginResult =
  | { ok: true }
  | { ok: false; message: string };

export async function loginWithUsername(
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    const admin = serviceClient();
    if (!admin) {
      return { ok: false, message: 'Configuración del servidor incompleta (Supabase).' };
    }

    const normalized = username.trim().toLowerCase();
    if (!normalized || !password) {
      return { ok: false, message: 'Completá usuario y contraseña.' };
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email')
      .eq('username', normalized)
      .maybeSingle();

    if (profileError || !profile?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[login] perfil no encontrado o error:', profileError?.message ?? profileError);
      }
      return { ok: false, message: 'Usuario o contraseña incorrectos.' };
    }

    // Siempre el email canónico de Auth (profiles.email puede estar desactualizado)
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(profile.id);
    const emailFromAuth = authUser?.user?.email?.trim();
    const emailFromProfile = profile.email?.trim();
    const email = emailFromAuth ?? emailFromProfile;

    if (!email) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[login] sin email:', authErr?.message ?? authErr);
      }
      return {
        ok: false,
        message:
          'No se pudo resolver el email del usuario. Revisá el usuario en Supabase Auth o volvé a ejecutar el seed.',
      };
    }

    const supabase = await createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (signError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[login] signInWithPassword:', signError.message, signError.code);
      }
      return { ok: false, message: 'Usuario o contraseña incorrectos.' };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: 'No se pudo iniciar sesión. Revisá la configuración.' };
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
