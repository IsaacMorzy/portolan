import { auth } from "@clerk/nextjs/server";
import { SITE_URL } from "@/lib/site";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveOrganization } from "@/app/start/actions.ts";
import { appManifest } from "@/lib/github/app.ts";
import { LIMITS, rateLimit } from "@/lib/ratelimit.ts";

/**
 * G1 (#27), step one: hand GitHub a manifest and get an App back.
 *
 * The manifest flow exists so that nobody has to generate a key pair by hand and
 * paste a PEM into a form — which is the step where this setup usually goes
 * wrong, and the step where a key ends up in a chat transcript. The customer
 * clicks one button on GitHub, and GitHub posts the finished credential back to
 * us already generated.
 *
 * The response is HTML rather than JSON on purpose: it is a form POST to github.com
 * that has to happen in the browser, so the page submits itself and there is
 * nothing to share as a URL.
 *
 * `state` is a nonce in an httpOnly cookie, compared in the callback. Without it
 * a stranger could complete a manifest exchange into somebody else's workspace.
 */
export async function GET() {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "no active organization" }, { status: 401 });
  }
  // The App is created under the workspace that asked for it, so the workspace
  // has to exist rather than be taken from the session token alone.
  if ((await resolveOrganization()) !== orgId) {
    return NextResponse.json({ error: "unknown organization" }, { status: 403 });
  }

  // Creating an App is rare and permanent. Nobody hits this twice by accident, so
  // the limit only exists to stop a loop from registering hundreds of them.
  const limit = rateLimit(`github-app:${orgId}`, LIMITS.explain);
  if (!limit.ok) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }

  const nonce = crypto.randomUUID();
  const jar = await cookies();
  jar.set("github_app_state", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const origin = SITE_URL;
  const manifest = appManifest(
    { redirectUrl: `${origin}/api/github/app/callback`, setupUrl: `${origin}/dashboard?installed=1` },
    "portolan",
  );

  // The name is only a suggestion: GitHub requires uniqueness per account, so a
  // second workspace gets portolan-2 and nobody has to pick it.
  const action = `https://github.com/settings/apps/new?state=${encodeURIComponent(nonce)}`;

  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Creating the GitHub App…</title>
<form id="f" method="post" action="${action}">
${Object.entries(manifest)
  .map(
    ([key, value]) =>
      `<input type="hidden" name="${key}" value="${String(
        typeof value === "object" ? JSON.stringify(value) : value,
      ).replace(/"/g, "&quot;")}">`,
  )
  .join("\n")}
</form>
<p>Redirecting to GitHub to create the App…</p>
<script>document.getElementById("f").submit()</script>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}
