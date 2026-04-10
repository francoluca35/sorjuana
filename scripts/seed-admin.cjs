/**
 * Crea el usuario admin en Auth y el registro en public.profiles.
 * Definí en .env.local (no subas este archivo a git):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_SEED_EMAIL
 *   SUPABASE_SEED_USERNAME
 *   SUPABASE_SEED_PASSWORD
 * Ejecutá: npm run seed:admin
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SUPABASE_SEED_EMAIL;
  const username = process.env.SUPABASE_SEED_USERNAME;
  const password = process.env.SUPABASE_SEED_PASSWORD;
  const role = process.env.SUPABASE_SEED_ROLE || 'admin';

  if (!url || !service || !email || !username || !password) {
    console.error(
      'Faltan variables. Necesitás NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SEED_EMAIL, SUPABASE_SEED_USERNAME, SUPABASE_SEED_PASSWORD en .env.local',
    );
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const uLower = String(username).trim().toLowerCase();

  async function findUserByEmail(em) {
    let page = 1;
    while (page <= 25) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const u = data.users.find((x) => x.email?.toLowerCase() === em.toLowerCase());
      if (u) return u;
      if (data.users.length < 200) break;
      page += 1;
    }
    return null;
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: uLower, role },
  });

  let userId;

  if (createErr) {
    const dup =
      createErr.message?.toLowerCase().includes('registered') ||
      createErr.message?.toLowerCase().includes('already') ||
      createErr.status === 422;
    if (dup) {
      const existing = await findUserByEmail(email);
      if (!existing) {
        console.error(createErr);
        process.exit(1);
      }
      userId = existing.id;
      console.log('El email ya existía en Auth; sincronizando contraseña y perfil…');
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (updErr) {
        console.warn('No se pudo actualizar la contraseña (podés cambiarla en el panel de Supabase):', updErr.message);
      }
    } else {
      console.error(createErr);
      process.exit(1);
    }
  } else {
    userId = created.user.id;
    console.log('Usuario creado en Auth.');
  }

  const { error: upErr } = await admin.from('profiles').upsert(
    { id: userId, username: uLower, role, email: String(email).trim().toLowerCase() },
    { onConflict: 'id' },
  );

  if (upErr) {
    console.error(upErr);
    process.exit(1);
  }

  console.log('Listo. Perfil:', uLower, 'rol:', role);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
