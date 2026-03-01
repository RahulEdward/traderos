import { NextRequest, NextResponse } from "next/server";

// GET /api/broker/fyers/callback - OAuth redirect callback
// Fyers redirects here with ?auth_code=...&state=tradeos
export async function GET(req: NextRequest) {
  const authCode = req.nextUrl.searchParams.get("auth_code");
  const state = req.nextUrl.searchParams.get("state");

  if (!authCode) {
    return NextResponse.redirect(
      new URL("/integrations?broker=fyers&status=error&message=no_auth_code", req.url)
    );
  }

  // Redirect to the integrations page with the auth code
  // The frontend will handle exchanging it for an access token
  return NextResponse.redirect(
    new URL(
      `/integrations?broker=fyers&status=callback&auth_code=${encodeURIComponent(authCode)}`,
      req.url
    )
  );
}
