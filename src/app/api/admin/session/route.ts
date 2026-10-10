import { createAdminSession, credentialsMatch, hasAdminSession, isAdminConfigured, isAdminEmailCodeConfigured, isAdminEmailCodeEnabled, adminEmailMatches, isSameOriginRequest, sessionCookie } from "@/lib/admin-auth";
import { sendAdminEmailCode, verifyAdminEmailCode } from "@/lib/admin-email-code";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json({ authenticated: false, error: "Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET to enable the admin dashboard." }, { status: 503 });
  }
  const authenticated = hasAdminSession(request);
  const emailCodeRequired = isAdminEmailCodeEnabled();
  if (!authenticated && emailCodeRequired && !isAdminEmailCodeConfigured()) {
    return Response.json({ authenticated: false, emailCodeRequired, error: "Email-code sign-in is required but Resend and a verified sender are not configured." }, { status: 503 });
  }
  return Response.json({ authenticated, emailCodeRequired });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!isAdminConfigured()) {
    return Response.json({ error: "Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET to enable admin sign-in." }, { status: 503 });
  }

  if (Number(request.headers.get("content-length") ?? 0) > 2048) return Response.json({ error: "Sign-in request is too large." }, { status: 413 });

  let body: { phase?: unknown; email?: unknown; identifier?: unknown; password?: unknown; code?: unknown };
  try {
    body = await request.json() as { phase?: unknown; email?: unknown; identifier?: unknown; password?: unknown; code?: unknown };
  } catch {
    return Response.json({ error: "Invalid sign-in request." }, { status: 400 });
  }

  const phase = typeof body.phase === "string" ? body.phase : "password";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : typeof body.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
  const emailCodeRequired = isAdminEmailCodeEnabled();
  if (!emailCodeRequired) {
    if (phase !== "password" || typeof body.password !== "string" || !credentialsMatch(email, body.password)) {
      return Response.json({ error: "The email or password is incorrect." }, { status: 401 });
    }
    return Response.json({ authenticated: true }, {
      headers: { "Set-Cookie": sessionCookie(createAdminSession()) },
    });
  }

  if (!isAdminEmailCodeConfigured()) return Response.json({ error: "Email-code sign-in requires Resend, a verified sender, and Sanity write access." }, { status: 503 });
  if (!adminEmailMatches(email)) return Response.json({ error: "The email or password is incorrect." }, { status: 401 });

  if (phase === "password") {
    if (typeof body.password !== "string" || !credentialsMatch(email, body.password)) {
      return Response.json({ error: "The email or password is incorrect." }, { status: 401 });
    }
    const result = await sendAdminEmailCode(email, request);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ codeRequired: true });
  }

  if (phase === "resend") {
    const result = await sendAdminEmailCode(email, request);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ codeRequired: true });
  }

  if (phase === "verify") {
    if (typeof body.code !== "string") return Response.json({ error: "Enter the six-digit email code." }, { status: 400 });
    const result = await verifyAdminEmailCode(email, request, body.code);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ authenticated: true }, {
      headers: { "Set-Cookie": sessionCookie(createAdminSession()) },
    });
  }

  return Response.json({ error: "Invalid sign-in step." }, { status: 400 });
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  return Response.json({ authenticated: false }, {
    headers: { "Set-Cookie": sessionCookie("", 0) },
  });
}