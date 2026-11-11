import { NextResponse } from 'next/server';
import { webhookBigBossValide } from '../../../../lib/transporteurs';
import { cibleBigBoss, numeros } from '../../../../lib/regles';
import { q, q1 } from '../../../../lib/db';
import { enregistrerColis } from '../../../../lib/moteur';
export const dynamic = 'force-dynamic';

// Big Boss prévient à chaque changement d'un colis. Signature vérifiée, réponse en < 10 s, doublons ignorés.
export async function POST(req) {
  const brut = await req.text();
  if (!webhookBigBossValide(brut, req.headers.get('x-webhook-timestamp'), req.headers.get('x-webhook-signature'))) {
    return NextResponse.json({ erreur: 'signature invalide' }, { status: 401 });
  }
  let e; try { e = JSON.parse(brut); } catch (x) { return NextResponse.json({ erreur: 'JSON invalide' }, { status: 400 }); }
  if (e.evenement === 'webhook.test') return NextResponse.json({ ok: true, test: true });
  const deja = await q1('SELECT 1 FROM webhooks_recus WHERE id = $1', [e.id]);
  if (deja) return NextResponse.json({ ok: true, doublon: true });
  await q('INSERT INTO webhooks_recus (id, evenement, corps) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [e.id, e.evenement, brut]);
  await q("DELETE FROM webhooks_recus WHERE recu_le < now() - interval '30 days'");
  const c = e.colis || {};
  if (c.code && c.etat && c.etat.code != null) {
    // un événement plus ancien que le dernier état connu ne le remplace pas (les envois peuvent arriver dans le désordre)
    const connu = await q1("SELECT max(date_statut) date_statut FROM colis WHERE transporteur = 'Big Boss' AND code = $1", [String(c.code)]);
    if (!connu || !connu.date_statut || new Date(e.date) >= new Date(connu.date_statut)) {
      const refs = numeros(c.reference);
      if (refs.length) await enregistrerColis(refs.map((n) => ({ transporteur: 'Big Boss', code: String(c.code), commande: n,
        statut_brut: `${c.etat.libelle} (${c.etat.code})`, cible: cibleBigBoss(c.etat.code, c.etat.libelle),
        echange: /^echange\./.test(e.evenement || ''), date_statut: e.date })), 'webhook');
    }
  }
  return NextResponse.json({ ok: true });
}
