export const SESSION_COOKIE_NAME = 'myprompt_session';

const PASSWORD_SALT = 'myprompt-auth-salt-v1:';
const DEFAULT_USERNAME = 'victorzhangwowo';
// Salted SHA-256 hex digest of password (never stored in plaintext)
const DEFAULT_PASSWORD_HASH =
  'b7d6a9b9f0d10a1d4c25f161e3d6351e1bdb328b2da55f6897e2c670e80f2763';
const DEFAULT_SESSION_SECRET =
  'myprompt-edge-hmac-secret-v1-9c84f2a7b1e3d054';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getAuthConfig() {
  return {
    username: process.env.AUTH_USERNAME || DEFAULT_USERNAME,
    passwordHash: process.env.AUTH_PASSWORD_HASH || DEFAULT_PASSWORD_HASH,
    secret: process.env.AUTH_SECRET || DEFAULT_SESSION_SECRET,
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPassword(password: string): Promise<string> {
  return sha256Hex(`${PASSWORD_SALT}${password}`);
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const cfg = getAuthConfig();
  const inputHash = await hashPassword(password);
  const userMatch = timingSafeEqual(username.trim(), cfg.username);
  const passMatch = timingSafeEqual(inputHash, cfg.passwordHash);
  return userMatch && passMatch;
}

async function signHmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return bytesToBase64Url(new Uint8Array(sig));
}

export async function createSessionToken(username: string): Promise<string> {
  const cfg = getAuthConfig();
  const payload = {
    u: username,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const sig = await signHmac(payloadB64, cfg.secret);
  return `${payloadB64}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ username: string; exp: number } | null> {
  if (!token || !token.includes('.')) return null;
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;

    const cfg = getAuthConfig();
    const expectedSig = await signHmac(payloadB64, cfg.secret);
    if (!timingSafeEqual(sig, expectedSig)) return null;

    const payloadBytes = base64UrlToBytes(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      u: string;
      exp: number;
    };

    if (!payload.u || !payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return { username: payload.u, exp: payload.exp };
  } catch {
    return null;
  }
}
