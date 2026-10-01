import { createAdminSession, credentialsMatch, hasAdminSession, isAdminConfigured, isSameOriginRequest, sessionCookie } from "@/lib/admin-auth";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json({ authenticated: false, error: "Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET to enable the admin dashboard." }, { status: 503 });
  }
  return Response.json({ authenticated: hasAdminSession(request) });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!isAdminConfigured()) {
    return Response.json({ error: "Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET to enable admin sign-in." }, { status: 503 });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json() as { email?: unknown; password?: unknown };
  } catch {
    return Response.json({ error: "Invalid sign-in request." }, { status: 400 });
  }
  if (!body || typeof body.email !== "string" || typeof body.password !== "string" || !credentialsMatch(body.email, body.password)) {
    return Response.json({ error: "The email or password is incorrect." }, { status: 401 });
  }

  return Response.json({ authenticated: true }, {
    headers: { "Set-Cookie": sessionCookie(createAdminSession()) },
  });
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  return Response.json({ authenticated: false }, {
    headers: { "Set-Cookie": sessionCookie("", 0) },
  });
}