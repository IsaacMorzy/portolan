import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeManifestCode } from "@/lib/github/app.ts";
import { createAdminSupabase } from "@/lib/supabase/admin.ts";

/**
 * G1 (#27), step two: GitHub sends the browser back with a one-time code, and the
 * code becomes the App's credentials.
 *
 * Two things are being protected here, and they are different:
 *
 *   - The cookie nonce proves this browser started the flow. Without it, anyone
 *     holding a valid code could land the App in a workspace they do not own.
 *   - `auth().orgId` proves which workspace it is, so the row is written under the
 *     session rather than under anything in the query string.
 *
 * Failures redirect to the dashboard with a short reason instead of returning
 * JSON: the user is in a browser at this point, and a 500 would leave them on a
 * white page wondering which of the two places to go back to.
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  const jar = await cookies();

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/dashboard?github_app=${reason}`, request.url), { status: 303 });

  if (!orgId) return fail("signed-out");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = jar.get("github_app_state")?.value;

  if (!code) return fail("cancelled");
  // A state that does not match the cookie is either a stale tab or a forged
  // callback, and the two are indistinguishable — so neither is accepted.
  if (!state || !expected || state !== expected) return fail("state-mismatch");

  jar.delete("github_app_state");

  const exchanged = await exchangeManifestCode(code);
  if (!exchanged.ok) {
    return fail(`exchange-${exchanged.status}`);
  }

  const { credentials } = exchanged;
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("github_apps").upsert(
    {
      organization_id: orgId,
      app_id: credentials.id,
      slug: credentials.slug,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      private_key: credentials.pem,
      webhook_secret: credentials.webhookSecret,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  // The credential is already valid at GitHub even if this write fails, so the
  // message says which half worked rather than claiming nothing happened.
  if (error) return fail("store-failed");

  return NextResponse.redirect(
    new URL(`/dashboard?github_app=created&slug=${encodeURIComponent(credentials.slug)}`, request.url),
    { status: 303 },
  );
}
