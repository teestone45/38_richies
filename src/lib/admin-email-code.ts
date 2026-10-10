import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getSanityAdminClient } from "@/lib/sanity-admin";

const codeLifetimeMs = 10 * 60 * 1000;
const resendCooldownMs = 60 * 1000;
const sendWindowMs = 60 * 60 * 1000;
const maxSendsPerWindow = 5;
const maxVerificationAttempts = 5;

type AdminCodeChallenge = {
  _id: string;
  _rev: string;
  emailHash: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sendWindowStartedAt: number;
  sendCount: number;
  consumedAt?: number;
};

type ChallengeResult = { ok: true } | { ok: false; status: number; error: string };

function getChallengeId(email: string, request: Request) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const digest = createHmac("sha256", secret).update(`${email.toLowerCase()}:${ip}`).digest("hex").slice(0, 40);
  return `admin-login-${digest}`;
}

function hashCode(email: string, challengeId: string, code: string) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET ?? "")
    .update(`${email.toLowerCase()}:${challengeId}:${code}`)
    .digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function sendAdminEmailCode(email: string, request: Request): Promise<ChallengeResult> {
  const client = getSanityAdminClient();
  const challengeId = getChallengeId(email, request);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_EMAIL_FROM;
  if (!client || !challengeId || !apiKey || !from) {
    return { ok: false, status: 503, error: "Email verification is not configured. Add Resend, a verified sender, and Sanity write access." };
  }

  const now = Date.now();
  const existing = await client.fetch<AdminCodeChallenge | null>(`*[_id == $id][0]{_id, _rev, emailHash, codeHash, expiresAt, attempts, lastSentAt, sendWindowStartedAt, sendCount, consumedAt}`, { id: challengeId });
  if (existing && now - existing.lastSentAt < resendCooldownMs) {
    return { ok: false, status: 429, error: "Wait a minute before requesting another sign-in code." };
  }
  const activeWindow = Boolean(existing && now - existing.sendWindowStartedAt < sendWindowMs);
  if (activeWindow && existing!.sendCount >= maxSendsPerWindow) {
    return { ok: false, status: 429, error: "Too many sign-in codes requested. Try again in an hour." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const sendWindowStartedAt = activeWindow ? existing!.sendWindowStartedAt : now;
  const sendCount = activeWindow ? existing!.sendCount + 1 : 1;
  const challenge = {
    _type: "adminLoginChallenge",
    emailHash: createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(email.toLowerCase()).digest("hex"),
    codeHash: hashCode(email, challengeId, code),
    expiresAt: now + codeLifetimeMs,
    attempts: 0,
    lastSentAt: now,
    sendWindowStartedAt,
    sendCount,
    consumedAt: null,
  };

  try {
    if (existing) {
      await client.patch(challengeId).ifRevisionId(existing._rev).set(challenge).commit();
    } else {
      await client.create({ _id: challengeId, ...challenge });
    }
  } catch {
    return { ok: false, status: 429, error: "A sign-in code request is already in progress. Please try again shortly." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your 38 RICHES admin sign-in code",
      text: `Your 38 RICHES admin sign-in code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    console.error("Resend admin sign-in email failed", response?.status ?? "network error");
    await client.patch(challengeId).set({ codeHash: "", expiresAt: now, consumedAt: now }).commit().catch(() => undefined);
    return { ok: false, status: 502, error: "Could not send the sign-in code. Check the verified sender and try again." };
  }

  return { ok: true };
}

export async function verifyAdminEmailCode(email: string, request: Request, code: string): Promise<ChallengeResult> {
  const client = getSanityAdminClient();
  const challengeId = getChallengeId(email, request);
  if (!client || !challengeId || !/^\d{6}$/.test(code)) {
    return { ok: false, status: 400, error: "That sign-in code is invalid or expired." };
  }

  const challenge = await client.fetch<AdminCodeChallenge | null>(`*[_id == $id][0]{_id, _rev, emailHash, codeHash, expiresAt, attempts, lastSentAt, sendWindowStartedAt, sendCount, consumedAt}`, { id: challengeId });
  const now = Date.now();
  if (!challenge || challenge.consumedAt || challenge.expiresAt <= now) {
    return { ok: false, status: 400, error: "That sign-in code is invalid or expired. Request a new one." };
  }
  if (challenge.attempts >= maxVerificationAttempts) {
    return { ok: false, status: 429, error: "Too many incorrect codes. Request a new sign-in code." };
  }

  const suppliedHash = hashCode(email, challengeId, code);
  if (!safeEqual(suppliedHash, challenge.codeHash)) {
    await client.patch(challengeId).ifRevisionId(challenge._rev).inc({ attempts: 1 }).commit().catch(() => undefined);
    return { ok: false, status: 401, error: "That sign-in code is incorrect." };
  }

  try {
    await client.patch(challengeId).ifRevisionId(challenge._rev).set({ consumedAt: now, codeHash: "", expiresAt: now }).commit();
  } catch {
    return { ok: false, status: 400, error: "That sign-in code has already been used. Request a new one." };
  }
  return { ok: true };
}