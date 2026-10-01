import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "38richies_admin";
const sessionDurationSeconds = 60 * 60 * 8;

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET;
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && getSessionSecret());
}

export function credentialsMatch(email: string, password: string) {
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const emailMatches = Boolean(expectedEmail && constantTimeEqual(email.trim().toLowerCase(), expectedEmail));
  const passwordMatches = Boolean(expectedPassword && constantTimeEqual(password, expectedPassword));
  return emailMatches && passwordMatches;
}

export function createAdminSession() {
  const secret = getSessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  const expiresAt = String(Math.floor(Date.now() / 1000) + sessionDurationSeconds);
  const signature = createHmac("sha256", secret).update(expiresAt).digest("base64url");
  return `${expiresAt}.${signature}`;
}

export function hasAdminSession(request: Request) {
  const secret = getSessionSecret();
  if (!secret) return false;
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  const token = cookie?.slice(cookieName.length + 1);
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature || !/^\d+$/.test(expiresAt) || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", secret).update(expiresAt).digest("base64url");
  return constantTimeEqual(signature, expected);
}

export function sessionCookie(value: string, maxAge = sessionDurationSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}