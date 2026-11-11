import { NextResponse } from 'next/server';
import { appelCronAutorise } from '../../../../lib/session';
import { envoi } from '../../../../lib/moteur';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
// Appelée chaque minute par cron-job.org : applique au plus 11 changements de statut (700 / heure), espacés de ~5 s.
async function go(req) {
  if (!appelCronAutorise(req)) return NextResponse.json({ erreur: 'clé absente ou fausse' }, { status: 401 });
  try { return NextResponse.json(await envoi()); }
  catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
export const GET = go; export const POST = go;
