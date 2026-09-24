import {
  VpsAuthError,
  authenticateVpsAccount,
  createVpsSession,
  getAppOrigin,
  isSameOriginRequest,
  safeReturnPath,
  sessionCookieHeader,
} from "@/lib/vps-auth";

function redirectToLogin(request: Request, returnTo: string, error: string) {
  const target = new URL("/login", getAppOrigin(request));
  target.searchParams.set("return_to", returnTo);
  target.searchParams.set("error", error);
  return new Response(null, {
    status: 303,
    headers: {
      Location: target.toString(),
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  let returnTo = "/admin";
  try {
    if (!isSameOriginRequest(request)) {
      return redirectToLogin(request, returnTo, "origin");
    }

    const form = await request.formData();
    returnTo = safeReturnPath(String(form.get("return_to") || "/admin"));
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    const identity = await authenticateVpsAccount(request, email, password);
    const session = await createVpsSession(identity.email);
    const destination = identity.mustChangePassword
      ? `/account/password?return_to=${encodeURIComponent(returnTo)}`
      : returnTo;

    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL(destination, getAppOrigin(request)).toString(),
        "Set-Cookie": sessionCookieHeader(session.token, session.expiresAt, request),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof VpsAuthError) {
      return redirectToLogin(request, returnTo, error.code);
    }
    console.error("Login gagal karena konfigurasi", error);
    return redirectToLogin(request, returnTo, "config");
  }
}
