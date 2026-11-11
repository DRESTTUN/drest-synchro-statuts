import { NextResponse } from 'next/server';
import { lireExport } from '../../../lib/imports';
import { enregistrerColis, evaluer, majCommandesBO } from '../../../lib/moteur';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
// Dépôt d'un export transporteur : apprend les codes de colis (et leur statut), puis décide pour les commandes concernées.
export async function POST(req) {
  try {
    const form = await req.formData();
    const res = [];
    for (const f of form.getAll('fichiers')) {
      if (!f || typeof f === 'string') continue;
      try {
        const { type, colis } = lireExport(Buffer.from(await f.arrayBuffer()), f.name);
        const r = await enregistrerColis(colis, `export ${type}`);
        res.push({ fichier: f.name, type, colis: colis.length, nouveaux_ou_changes: r.changes });
      } catch (e) { res.push({ fichier: f.name, erreur: e.message }); }
    }
    const commandes_bo = await majCommandesBO(Date.now() + 15_000).catch((e) => 'erreur : ' + e.message);
    const decisions = await evaluer(Date.now() + 25_000, 3000);
    return NextResponse.json({ fichiers: res, commandes_bo, decisions });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 400 }); }
}
