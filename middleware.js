import { NextResponse } from 'next/server';
import { COOKIE, jetonSession } from './lib/session';

// L'écran et ses actions demandent le mot de passe ; les appels automatiques et le webhook ont leur propre contrôle.
export async function middleware(req) {
  const p = req.nextUrl.pathname;
  if (p.startsWith('/login') || p.startsWith('/api/login') || p.startsWith('/api/sync') || p.startsWith('/api/webhooks') || p.startsWith('/_next') || p === '/favicon.ico') return NextResponse.next();
  if (!process.env.ADMIN_PASSWORD) return new NextResponse('ADMIN_PASSWORD manquant dans les variables Vercel', { status: 500 });
  if (req.cookies.get(COOKIE)?.value === (await jetonSession())) return NextResponse.next();
  if (p.startsWith('/api/')) return NextResponse.json({ erreur: 'non connecté' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
