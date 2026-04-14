import { redirect } from 'next/navigation';

/** Ruta histórica: el panel vive bajo /app */
export default function DashboardLegacyRedirect() {
  redirect('/app/dashboard');
}
