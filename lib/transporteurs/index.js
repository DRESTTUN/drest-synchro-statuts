// Lecture des statuts chez les transporteurs, par lots de codes connus. Lecture seule : aucun colis créé ni modifié.
import crypto from 'crypto';
import { cibleBigBoss, cibleAfex, cibleAramex } from '../regles';

const UA = { 'User-Agent': 'Drest-Synchro/1.0 (+https://www.drest.tn)', Accept: 'application/json' };
const URL_BB = process.env.BIGBOSS_URL || 'https://my.bigbossexpress.tn';
const URL_AFEX = process.env.AFEX_URL || 'https://apis.afex.tn';
const URL_ARAMEX = process.env.ARAMEX_URL || 'https://ws.aramex.net';
const avecDelai = (ms, p) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('délai dépassé')), ms))]);

// ---------- Big Boss ----------
export const bigboss = {
  nom: 'Big Boss', lot: 50,
  actif: () => !!(process.env.BIGBOSS_UTILISATEUR && process.env.BIGBOSS_PASS),
  async statuts(codes) {
    const r = await avecDelai(20000, fetch(`${URL_BB}/api/rest/StColis/ListColis`, {
      method: 'POST', headers: { ...UA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Utilisateur: process.env.BIGBOSS_UTILISATEUR, Pass: process.env.BIGBOSS_PASS, codeBar: codes.join(';') }) }));
    const js = await r.json();
    if (js.result_type === 'erreur') throw new Error(`Big Boss : ${js.result_code} ${js.result_content || ''}`);
    return (js.result_content?.colis || []).map((c) => ({
      code: String(c.code), commande: c.reference, statut_brut: `${c.etat} (${c.code_etat})`, cible: cibleBigBoss(c.code_etat, c.etat),
      echange: Number(c.echange) === 1, date_creation: c.date_creation ? c.date_creation + 'Z' : null }));
  },
};

// signature des webhooks Big Boss : sha256= HMAC-SHA256(secret, timestamp + "." + corps brut), 300 s max
export function webhookBigBossValide(corpsBrut, horodatage, signature) {
  const secret = process.env.BIGBOSS_WEBHOOK_SECRET;
  if (!secret || !horodatage || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(horodatage)) > 300) return false;
  const attendu = 'sha256=' + crypto.createHmac('sha256', secret).update(`${horodatage}.${corpsBrut}`).digest('hex');
  return attendu.length === signature.length && crypto.timingSafeEqual(Buffer.from(attendu), Buffer.from(signature));
}

// ---------- AFEX ----------
export const afex = {
  nom: 'AFEX', lot: 100,
  actif: () => !!process.env.AFEX_API_KEY,
  async statuts(codes) {
    const r = await avecDelai(20000, fetch(`${URL_AFEX}/v1/shipments/status`, {
      method: 'POST', headers: { ...UA, 'Content-Type': 'application/text', 'X-API-Key': process.env.AFEX_API_KEY },
      body: JSON.stringify({ shipmentIds: codes }) }));
    if (r.status === 401 || r.status === 403) throw new Error(`AFEX : accès refusé (HTTP ${r.status})`);
    const js = await r.json();
    return (js.shipments || []).map((s) => ({
      code: String(s.barcode), statut_brut: `${s.state}${s.delivered_state ? ' / ' + s.delivered_state : ''}${s.motif ? ' — ' + s.motif : ''}`,
      cible: cibleAfex(s.state, s.delivered_state) }));
  },
};

// ---------- Aramex ----------
function dateAramex(s) { const m = /\/Date\((\d+)/.exec(String(s || '')); return m ? new Date(Number(m[1])).toISOString() : null; }
export const aramex = {
  nom: 'Aramex', lot: 50,
  actif: () => !!(process.env.ARAMEX_USERNAME && process.env.ARAMEX_PASSWORD && process.env.ARAMEX_ACCOUNT_PIN),
  async statuts(codes) {
    const corps = {
      ClientInfo: { UserName: process.env.ARAMEX_USERNAME, Password: process.env.ARAMEX_PASSWORD, Version: 'v1',
        AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER, AccountPin: process.env.ARAMEX_ACCOUNT_PIN,
        AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || 'TUN', AccountCountryCode: process.env.ARAMEX_COUNTRY_CODE || 'TN', Source: 24 },
      GetLastTrackingUpdateOnly: true, Shipments: codes,
      Transaction: { Reference1: '', Reference2: '', Reference3: '', Reference4: '', Reference5: '' } };
    const r = await avecDelai(25000, fetch(`${URL_ARAMEX}/ShippingAPI.V2/Tracking/Service_1_0.svc/json/TrackShipments`, {
      method: 'POST', headers: { ...UA, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }));
    const js = await r.json();
    if (js.HasErrors) throw new Error('Aramex : ' + (js.Notifications || []).map((n) => `${n.Code} ${n.Message}`).join(' ; '));
    return (js.TrackingResults || []).map((t) => {
      const u = (t.Value || [])[0] || {};
      return { code: String(t.Key), statut_brut: `${u.UpdateCode} ${u.UpdateDescription}`, cible: cibleAramex(u.UpdateCode, u.UpdateDescription), date_statut: dateAramex(u.UpdateDateTime) };
    });
  },
};

export const TRANSPORTEURS = { 'Big Boss': bigboss, AFEX: afex, Aramex: aramex };
