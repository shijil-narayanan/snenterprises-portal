import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * POST /send  — emails a PDF through Brevo.
 *
 * Headers: Authorization: Bearer <Firebase ID token of a signed-in user>
 * Body (JSON): { to: string[], cc?: string[], subject, message, fileName, pdfBase64,
 *                sender: { email, name }, replyTo?: string }
 *
 * Environment:
 *   BREVO_API_KEY         secret — Brevo API key
 *   FIREBASE_PROJECT_ID   only tokens from this Firebase project are accepted
 *   ALLOWED_ORIGINS       comma-separated list of websites allowed to call this
 *   BREVO_API_URL         optional override (testing)
 *   FIREBASE_JWKS_URL     optional override (testing)
 */

const GOOGLE_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;
const MAX_PDF_BASE64 = 8 * 1024 * 1024; // ~6 MB PDF
const MAX_RECIPIENTS = 10;

let jwks; // cached between requests
const keySet = (env) => (jwks ??= createRemoteJWKSet(new URL(env.FIREBASE_JWKS_URL || GOOGLE_JWKS)));

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const headers = { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
  if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return { headers, originAllowed: !origin || allowed.includes(origin) };
}

const json = (status, body, headers) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

/** Verifies the Firebase ID token; returns the user's claims. */
async function verifyUser(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw new HttpError(401, 'Please sign in to send email.');
  try {
    const { payload } = await jwtVerify(token, keySet(env), {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
      algorithms: ['RS256'],
    });
    if (!payload.sub) throw new Error('no subject');
    return payload;
  } catch {
    throw new HttpError(401, 'Your sign-in has expired. Please sign in again.');
  }
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function emailList(value, label, { required }) {
  const list = (Array.isArray(value) ? value : []).map((e) => str(e, 254)).filter(Boolean);
  if (required && !list.length) throw new HttpError(400, `Add at least one ${label} address.`);
  if (list.length > MAX_RECIPIENTS) throw new HttpError(400, `At most ${MAX_RECIPIENTS} ${label} addresses.`);
  const bad = list.find((e) => !EMAIL.test(e));
  if (bad) throw new HttpError(400, `“${bad}” is not a valid email address.`);
  return [...new Set(list.map((e) => e.toLowerCase()))];
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function parseBody(body) {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'Invalid request.');
  const to = emailList(body.to, 'recipient', { required: true });
  const cc = emailList(body.cc, 'CC', { required: false }).filter((e) => !to.includes(e));
  const subject = str(body.subject, 200);
  if (!subject) throw new HttpError(400, 'Add a subject.');
  const message = typeof body.message === 'string' ? body.message.slice(0, 5000) : '';
  const fileName = str(body.fileName, 150);
  if (!/^[\w .,()&-]+\.pdf$/i.test(fileName)) throw new HttpError(400, 'Invalid attachment name.');
  const pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : '';
  if (!pdfBase64.startsWith('JVBER')) throw new HttpError(400, 'The attachment is not a PDF.'); // "%PDF" in base64
  if (pdfBase64.length > MAX_PDF_BASE64) throw new HttpError(413, 'The PDF is too large to email.');
  const senderEmail = str(body.sender?.email, 254);
  if (!EMAIL.test(senderEmail)) throw new HttpError(400, 'Set a valid “send from” email in Settings.');
  const senderName = str(body.sender?.name, 100) || 'SN Enterprises';
  const replyTo = str(body.replyTo, 254);
  if (replyTo && !EMAIL.test(replyTo)) throw new HttpError(400, 'The reply-to address in Settings is not valid.');
  return { to, cc, subject, message, fileName, pdfBase64, senderEmail, senderName, replyTo };
}

async function sendWithBrevo(env, m) {
  if (!env.BREVO_API_KEY) throw new HttpError(500, 'Email is not configured yet (missing Brevo API key).');
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${escapeHtml(m.message).replace(/\n/g, '<br>')}</div>`;
  const res = await fetch(env.BREVO_API_URL || BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: m.senderEmail, name: m.senderName },
      to: m.to.map((email) => ({ email })),
      ...(m.cc.length ? { cc: m.cc.map((email) => ({ email })) } : {}),
      ...(m.replyTo ? { replyTo: { email: m.replyTo } } : {}),
      subject: m.subject,
      htmlContent: html,
      textContent: m.message || ' ',
      attachment: [{ name: m.fileName, content: m.pdfBase64 }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Pass Brevo's reason on (e.g. unverified sender) so the user can act on it
    throw new HttpError(502, `Brevo could not send the email: ${data.message || res.statusText}`);
  }
  return data.messageId || '';
}

export default {
  async fetch(request, env) {
    const { headers, originAllowed } = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: originAllowed ? 204 : 403, headers });
    const url = new URL(request.url);
    if (url.pathname !== '/send' || request.method !== 'POST') return json(404, { error: 'Not found' }, headers);
    if (!originAllowed) return json(403, { error: 'This website is not allowed to send email.' }, headers);
    try {
      const user = await verifyUser(request, env);
      const body = await request.json().catch(() => null);
      const message = parseBody(body);
      const messageId = await sendWithBrevo(env, message);
      return json(200, { ok: true, messageId, to: message.to, cc: message.cc, sentBy: user.email || user.sub }, headers);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      return json(status, { error: e instanceof HttpError ? e.message : 'Something went wrong sending the email.' }, headers);
    }
  },
};
