// Session de l'écran d'administration : un cookie dérivé du mot de passe (aucun compte, aucune donnée stockée).
export const COOKIE = 'drest_synchro';
export async function jetonSession() {
  const data = new TextEncoder().encode(`drest-synchro:${process.env.ADMIN_PASSWORD || ''}:${process.env.CRON_SECRET || ''}`);
  const h = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
// appels automatiques (cron-job.org) : en-tête « Authorization: Bearer <CRON_SECRET> » ou ?cle=<CRON_SECRET>
export function appelCronAutorise(req) {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  const h = req.headers.get('authorization') || '';
  const cle = new URL(req.url).searchParams.get('cle');
  return h === `Bearer ${s}` || cle === s;
}
