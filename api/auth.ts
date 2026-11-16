import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours (also cleared when browser tab closes)
const MAX_ATTEMPTS = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

interface AttemptRecord {
  count: number;
  resetAt: number;
}

const failedAttempts = new Map<string, AttemptRecord>();

// Precomputed SHA-256 hash of the default access password (no plaintext password stored in source)
const DEFAULT_PASSWORD_SHA256 =
  '95bd4955ae31f6b0dc4ba5c79725bda801f34ec0ce29f1cf9bf74d5bc3fc461d';

function getExpectedPasswordHashHex(): string {
  if (process.env.APP_PASSWORD && process.env.APP_PASSWORD.length > 0) {
    return createHash('sha256').update(process.env.APP_PASSWORD, 'utf8').digest('hex');
  }
  return DEFAULT_PASSWORD_SHA256;
}

function getSigningSecret(): string {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim().length > 0) {
    return process.env.AUTH_SECRET.trim();
  }
  return createHash('sha256')
    .update(`assurep6-hmac-key::${getExpectedPasswordHashHex()}`)
    .digest('hex');
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function sha256Buffer(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

function constantTimeEquals(a: string, b: string): boolean {
  return timingSafeEqual(sha256Buffer(a), sha256Buffer(b));
}

function verifyPassword(inputPassword: string): boolean {
  const inputHashBuffer = Buffer.from(sha256Hex(inputPassword), 'hex');
  const expectedHashBuffer = Buffer.from(getExpectedPasswordHashHex(), 'hex');
  if (inputHashBuffer.length !== expectedHashBuffer.length) return false;
  return timingSafeEqual(inputHashBuffer, expectedHashBuffer);
}

function signToken(expiresAtMs: number): string {
  const payload = String(expiresAtMs);
  const sig = createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return false;
  }
  const expectedSig = createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
  return constantTimeEquals(sig, expectedSig);
}

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

async function readJsonBody(req: IncomingMessage & { body?: unknown }): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += String(chunk);
      if (raw.length > 32768) {
        resolve({});
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: Record<string, unknown>): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'GET') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (verifyToken(token)) {
      sendJson(res, 200, { authenticated: true });
      return;
    }
    sendJson(res, 401, { authenticated: false });
    return;
  }

  if (method === 'POST') {
    const ip = getClientIp(req);
    const now = Date.now();
    const record = failedAttempts.get(ip);

    if (record && now < record.resetAt && record.count >= MAX_ATTEMPTS) {
      const retryMins = Math.ceil((record.resetAt - now) / 60000);
      sendJson(res, 429, {
        authenticated: false,
        error: `Too many failed attempts. Try again in ${retryMins} minute(s).`,
      });
      return;
    }

    const body = await readJsonBody(req);
    const password = typeof body.password === 'string' ? body.password : '';

    if (!password) {
      sendJson(res, 400, { authenticated: false, error: 'Password is required.' });
      return;
    }

    if (verifyPassword(password)) {
      failedAttempts.delete(ip);
      const token = signToken(now + TOKEN_TTL_MS);
      sendJson(res, 200, { authenticated: true, token });
      return;
    }

    const nextRecord: AttemptRecord =
      record && now < record.resetAt
        ? { count: record.count + 1, resetAt: record.resetAt }
        : { count: 1, resetAt: now + LOCKOUT_WINDOW_MS };
    failedAttempts.set(ip, nextRecord);

    sendJson(res, 401, { authenticated: false, error: 'Incorrect access password.' });
    return;
  }

  if (method === 'DELETE') {
    sendJson(res, 200, { authenticated: false });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}
