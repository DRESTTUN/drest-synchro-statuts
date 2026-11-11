import { NextResponse } from 'next/server';
import { appelCronAutorise } from '../../../../lib/session';
import { collecte } from '../../../../lib/moteur';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
// Appelée toutes les 30 min par cron-job.org : relit le BO et les transporteurs, décide, remplit la file. Ne modifie rien dans le BO.
async function go(req) {
  if (!appelCronAutorise(req)) return NextResponse.json({ erreur: 'clé absente ou fausse' }, { status: 401 });
  try { return NextResponse.json(await collecte()); }
  catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
export const GET = go; export const POST = go;
