import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { ensureDbReady, pool } from './db.ts';

const COOKIE_NAME = 'wf_owner_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPasscodeHash(passcode: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

async function getSessionSecret(): Promise<string> {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
    return process.env.SESSION_SECRET.trim();
  }
  await ensureDbReady();
  const res = await pool.query('SELECT session_secret FROM app_settings WHERE id = 1');
  const secret = res.rows[0]?.session_secret;
  if (secret && typeof secret === 'string' && secret.length >= 16) {
    return secret;
  }
  const fallback = crypto.randomBytes(32).toString('hex');
  await pool.query('UPDATE app_settings SET session_secret = $1 WHERE id = 1', [fallback]);
  return fallback;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      out[key] = decodeURIComponent(val);
    }
  }
  return out;
}

export async function createSessionToken(): Promise<string> {
  const secret = await getSessionSecret();
  const payload = Buffer.from(
    JSON.stringify({ role: 'owner', exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const secret = await getSessionSecret();
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return false;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return decoded.role === 'owner' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protoStr = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || '';
  return (
    req.secure ||
    protoStr.split(',')[0].trim().toLowerCase() === 'https' ||
    process.env.NODE_ENV === 'production'
  );
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const useSecureCrossSite =
    isHttpsRequest(req) && process.env.ALLOW_INSECURE_COOKIE !== 'true';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: useSecureCrossSite ? 'none' : 'lax',
    secure: useSecureCrossSite,
    ...(useSecureCrossSite ? { partitioned: true } : {}),
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  const useSecureCrossSite =
    isHttpsRequest(req) && process.env.ALLOW_INSECURE_COOKIE !== 'true';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: useSecureCrossSite ? 'none' : 'lax',
    secure: useSecureCrossSite,
    ...(useSecureCrossSite ? { partitioned: true } : {}),
    path: '/',
  });
}

function extractSessionToken(req: Request): string | undefined {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[COOKIE_NAME]) {
    return cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  return undefined;
}

export async function getAuthState(req: Request): Promise<{
  initialized: boolean;
  authenticated: boolean;
  envPasscodeManaged: boolean;
}> {
  await ensureDbReady();
  const envPasscode = process.env.OWNER_PASSCODE?.trim() || '';
  const dbRes = await pool.query('SELECT passcode_hash FROM owner_auth WHERE id = 1');
  const hasDbPasscode = dbRes.rows.length > 0;
  const initialized = envPasscode.length > 0 || hasDbPasscode;

  const sessionToken = extractSessionToken(req);
  const authenticated = initialized
    ? await verifySessionToken(sessionToken)
    : false;

  return {
    initialized,
    authenticated,
    envPasscodeManaged: envPasscode.length > 0,
  };
}

function timingSafeEqualsString(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function verifyOwnerPasscode(passcode: string): Promise<boolean> {
  const envPasscode = process.env.OWNER_PASSCODE?.trim();
  if (envPasscode && envPasscode.length > 0) {
    if (
      timingSafeEqualsString(passcode, envPasscode) ||
      timingSafeEqualsString(passcode.trim(), envPasscode)
    ) {
      return true;
    }
    return false;
  }
  await ensureDbReady();
  const dbRes = await pool.query('SELECT passcode_hash FROM owner_auth WHERE id = 1');
  if (dbRes.rows.length === 0) return false;
  return (
    verifyPasscodeHash(passcode, dbRes.rows[0].passcode_hash) ||
    verifyPasscodeHash(passcode.trim(), dbRes.rows[0].passcode_hash)
  );
}

export async function requireOwnerAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const state = await getAuthState(req);
    if (!state.authenticated) {
      res.status(401).json({
        error: state.initialized
          ? 'Owner authentication required.'
          : 'Owner passcode must be initialized first.',
      });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
