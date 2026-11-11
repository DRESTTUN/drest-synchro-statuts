import { NextResponse } from 'next/server';
import { COOKIE, jetonSession } from '../../../lib/session';
export async function POST(req) {
  const f = await req.formData();
  if (!process.env.ADMIN_PASSWORD || f.get('mot_de_passe') !== process.env.ADMIN_PASSWORD) return NextResponse.redirect(new URL('/login?erreur=1', req.url), 303);
  const r = NextResponse.redirect(new URL('/', req.url), 303);
  r.cookies.set(COOKIE, await jetonSession(), { httpOnly: true, secure: new URL(req.url).protocol === 'https:', sameSite: 'lax', maxAge: 30 * 24 * 3600, path: '/' });
  return r;
}
