// middleware.js — BuilderK intranet staff gate (Vercel Edge Middleware, dependency-free)
//
// Gates the staff "operating system" pages behind a shared password while leaving
// the public site and the campaign pages (/intranet/camp, /calendar, /camp-calendar)
// completely open. Uses an HMAC-signed cookie (Web Crypto, no dependencies).
//
// Required env vars (Vercel → Project Settings → Environment Variables, Prod + Preview):
//   INTRANET_PASSWORD       the shared staff password
//   INTRANET_COOKIE_SECRET  long random string, e.g. `openssl rand -hex 32`
// The gate FAILS CLOSED if either is missing (everyone is redirected to login).
export const config = {
  // cleanUrls is on, so paths arrive without ".html".
  matcher: ['/intranet', '/intranet/:path*'],
};

const PROTECTED = new Set([
  '/intranet',
  '/intranet/start', '/intranet/precon', '/intranet/codes', '/intranet/safety',
  '/intranet/operations', '/intranet/people', '/intranet/finance', '/intranet/growth',
  '/intranet/buildshare', '/intranet/closeout', '/intranet/quality', '/intranet/wbs',
]);

const COOKIE = 'bk_intranet';
const LOGIN_PATH = '/intranet/login';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days, seconds
const enc = new TextEncoder();

export default async function middleware(req) {
  const url = new URL(req.url);
  let path = url.pathname.replace(/\.html$/i, '');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  // 1) Login endpoint — always reachable. POST verifies the password; GET serves login.html.
  if (path === LOGIN_PATH) {
    if (req.method === 'POST') return handleLogin(req, url);
    return undefined;
  }
  // 2) Anything not explicitly protected (campaign pages, assets, etc.) passes through.
  if (!PROTECTED.has(path)) return undefined;

  // 3) Protected page: a valid signed cookie passes through to the static file
  //    (noindex for these paths is stamped by vercel.json's X-Robots-Tag rule).
  const token = readCookie(req, COOKIE);
  if (await isValidToken(token)) return undefined;

  // 4) No/invalid cookie -> branded login, remembering the destination.
  const dest = encodeURIComponent(url.pathname + url.search);
  return Response.redirect(`${url.origin}${LOGIN_PATH}?next=${dest}`, 307);
}

async function handleLogin(req, url) {
  const form = await req.formData();
  const password = String(form.get('password') || '');
  let next = String(form.get('next') || '/intranet');
  if (!next.startsWith('/')) next = '/intranet'; // internal redirects only
  const expected = process.env.INTRANET_PASSWORD || '';
  if (!expected || !timingSafeEqual(password, expected)) {
    return Response.redirect(`${url.origin}${LOGIN_PATH}?next=${encodeURIComponent(next)}&e=1`, 303);
  }
  const cookie = await mintToken();
  return new Response(null, {
    status: 303,
    headers: {
      location: `${url.origin}${next}`,
      'set-cookie': `${COOKIE}=${cookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`,
    },
  });
}

async function getKey() {
  const secret = process.env.INTRANET_COOKIE_SECRET || '';
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
function b64url(bytes) {
  let s = '';
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sign(msg) {
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return b64url(sig);
}
async function mintToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${await sign(`${COOKIE}:${exp}`)}`;
}
async function isValidToken(token) {
  if (!token || !process.env.INTRANET_COOKIE_SECRET) return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp)) return false;
  if (Date.now() > Number(exp)) return false;
  return timingSafeEqual(sig, await sign(`${COOKIE}:${exp}`));
}
function readCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
