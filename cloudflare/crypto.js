// ============================================================================
// أدوات تشفير تعمل على Web Crypto (Cloudflare Workers) بلا أي اعتماد على Node.
// نفس منطق backend/src/auth.js حتى تبقى الجلسات متوافقة بين المنصّتين.
// ============================================================================

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToBin(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return bin;
}

export function bytesToBase64url(bytes) {
  return btoa(bytesToBin(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function utf8ToBase64url(str) {
  return bytesToBase64url(enc.encode(str));
}

export function base64urlToUtf8(s) {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm.length % 4 ? '='.repeat(4 - (norm.length % 4)) : '';
  const bin = atob(norm + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return dec.decode(bytes);
}

export function bytesToHex(bytes) {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

/** HMAC-SHA256: keyBytes مفتاح، message نص أو بايتات. */
export async function hmacSha256(keyBytes, message) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const data = typeof message === 'string' ? enc.encode(message) : message;
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

export async function hmacSha256Hex(keyBytes, message) {
  return bytesToHex(await hmacSha256(keyBytes, message));
}

export async function hmacSha256Base64url(keyBytes, message) {
  return bytesToBase64url(await hmacSha256(keyBytes, message));
}

export async function sha256Hex(str) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(str))));
}

/** مقارنة ثابتة الزمن بين نصّين (تمنع تسريب التوقيت). */
export function timingSafeEqualStr(a, b) {
  const ba = enc.encode(String(a ?? ''));
  const bb = enc.encode(String(b ?? ''));
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

export function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}
