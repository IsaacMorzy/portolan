// G1 (#27): read private repositories, without asking anyone for a personal
import { SITE_URL } from "../site.ts";
// access token.
//
// The three ways to get at a private repository are a PAT, an OAuth app, and a
// GitHub App. Only the third survives its own security review:
//
//   PAT          one token, every repository the person can see, no expiry unless
//                they remember, and we would be storing a credential that reads
//                every private repository its owner can reach.
//   OAuth app    the same read-everything scope, plus a refresh dance.
//   GitHub App   installed per repository set, chooses its own permissions, mints
//                an hour-long installation token, and is revoked from GitHub's
//                side. What it can read is visible in the account's settings.
//
// So this file is the whole credential story: build a manifest, exchange the
// one-time code, sign a JWT with the app key, mint an installation token. No
// dependency — the JWT is RSA-SHA256 over a string, which Node can already do.
//
// The manifest flow matters for a second reason: it means the *user* creates the
// App by clicking one button. Nobody generates a key pair by hand and pastes a
// PEM into a form, which is the step where this kind of setup usually goes wrong.

import { createSign } from "node:crypto";

/** Where GitHub sends the browser back after the App is created. */
export type ManifestTarget = {
  /** Absolute URL GitHub returns to, carrying `code` and `state`. */
  redirectUrl: string;
  /** Absolute URL GitHub opens after install, carrying `installation_id`. */
  setupUrl: string;
};

export function appManifest(target: ManifestTarget, name: string) {
  return {
    name,
    url: SITE_URL,
    // No webhook endpoint yet. Declaring one that does not exist means GitHub
    // retries a failing delivery forever, so the permission is asked for when the
    // endpoint exists — see #27.
    hook_attributes: { active: false },
    redirect_url: target.redirectUrl,
    setup_url: target.setupUrl,
    // Read-only, and only what the map needs. `contents` is the repository files;
    // `metadata` is mandatory for every App and is what listing installations uses.
    default_permissions: {
      contents: "read" as const,
      metadata: "read" as const,
    },
    // Installation on one account at a time: a customer installs it on the
    // organization whose repositories they want mapped, not on everything.
    public: false,
    request_oauth_on_install: false,
    setup_on_update: false,
  };
}

export type AppCredentials = {
  id: number;
  slug: string;
  clientId: string;
  clientSecret: string;
  pem: string;
  webhookSecret: string | null;
};

/**
 * Step two of the manifest flow: GitHub hands back a one-time `code`, which is
 * exchanged for the App's credentials. The code is valid for one hour and once.
 *
 * Errors are returned rather than thrown so the route can tell the browser what
 * GitHub said — the usual cause is a state mismatch, and "it did not work" is
 * the message that makes someone give up.
 */
export async function exchangeManifestCode(code: string): Promise<
  { ok: true; credentials: AppCredentials } | { ok: false; status: number; message: string }
> {
  const response = await fetch(
    `https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "portolan",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    return { ok: false, status: response.status, message: (await response.text()).slice(0, 300) };
  }

  const body = (await response.json()) as {
    id: number;
    slug: string;
    client_id: string;
    client_secret: string;
    pem: string;
    webhook_secret?: string | null;
  };

  return {
    ok: true,
    credentials: {
      id: body.id,
      slug: body.slug,
      clientId: body.client_id,
      clientSecret: body.client_secret,
      pem: body.pem,
      webhookSecret: body.webhook_secret ?? null,
    },
  };
}

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * The JWT GitHub accepts in place of the App's password.
 *
 * `iat` is set a minute in the past because GitHub compares against its own clock
 * and rejects a token from the future; `exp` is the maximum ten minutes, and the
 * token is only used to mint one installation token that lasts an hour.
 */
export function appJwt(appId: number | string, pem: string, now = Math.floor(Date.now() / 1000)): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }));
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(pem);
  return `${header}.${payload}.${base64url(signature)}`;
}

export type InstallationToken = { token: string; expiresAt: string };

/**
 * Mint an installation token. This is the credential that reads a private
 * repository, and it dies within the hour — which is the entire point of using an
 * App instead of a PAT: the thing we hold is short-lived and narrow.
 */
export async function installationToken(
  appId: number | string,
  pem: string,
  installationId: number | string,
): Promise<InstallationToken | { error: string }> {
  const response = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(String(installationId))}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${appJwt(appId, pem)}`,
        "User-Agent": "portolan",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    return { error: `github ${response.status}: ${(await response.text()).slice(0, 200)}` };
  }

  const body = (await response.json()) as { token: string; expires_at: string };
  return { token: body.token, expiresAt: body.expires_at };
}

/**
 * Which repositories this installation can actually read. The map is built from
 * the repository the caller names, so this is the check that stops a valid
 * installation id from being pointed at a repository it was never granted.
 */
export async function installationRepositories(token: string): Promise<string[] | { error: string }> {
  const response = await fetch("https://api.github.com/installation/repositories?per_page=100", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "portolan",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    return { error: `github ${response.status}` };
  }

  const body = (await response.json()) as { repositories: { full_name: string }[] };
  return body.repositories.map((repository) => repository.full_name);
}

/**
 * The install URL a customer is sent to. `state` carries the workspace so the
 * callback knows whose installation this is without trusting the query string.
 */
export function installUrl(slug: string, state: string): string {
  return `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(state)}`;
}

/** Is the App configured at all? Read from env so a self-hosted copy can skip G1. */
export function appConfigured(): boolean {
  return Boolean(process.env.GITHUB_APP_ID?.trim() && process.env.GITHUB_APP_PRIVATE_KEY?.trim());
}

/**
 * The App id and key, when configured. Deliberately not part of `lib/env.ts`'s
 * REQUIRED list: G1 is optional, and a self-hosted copy that only maps public
 * repositories should not refuse to boot because a GitHub App was never created.
 */
export function appFromEnv(): { id: string; pem: string } | null {
  const id = process.env.GITHUB_APP_ID?.trim();
  // Vercel environment variables cannot hold newlines comfortably, so the key is
  // stored with literal backslash-n sequences and turned back into a PEM here.
  const pem = process.env.GITHUB_APP_PRIVATE_KEY?.trim().replace(/\\n/g, "\n");
  if (!id || !pem) return null;
  return { id, pem };
}
