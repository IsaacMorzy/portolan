// G1 (#27): the credential the pipeline needs, and the permission check that
// stops it being pointed somewhere it was never granted.
//
// The App is registered per workspace (see the manifest flow in `app.ts`), so the
// installation token is derived from the *organization*, never from the request.
// That ordering is the point: a caller cannot bring their own installation id, so
// there is no field for one to arrive in.
//
// Nothing here is called yet. The pipeline still fetches unauthenticated, and
// wiring it is the remaining half of #27 — kept separate because a token that
// starts being sent is a change worth making on its own rather than mixed into a
// parser change.

import { installationRepositories, installationToken } from "./app.ts";
import { createAdminSupabase } from "../supabase/admin.ts";

export type Credential = {
  token: string;
  /** The repositories this installation may read, as `owner/name`. */
  repositories: string[];
  expiresAt: string;
};

/**
 * Why the null cases are distinguished rather than collapsed into "no token":
 * they need different answers. `no-app` means the workspace never registered one;
 * `no-install` means it registered but never installed it on an account;
 * `failed` means GitHub refused. One message for all three tells a customer to do
 * a thing they have already done.
 */
export type CredentialResult =
  | { ok: true; credential: Credential }
  | { ok: false; reason: "no-app" | "no-install" | "failed"; detail: string };

export async function installationCredential(orgId: string): Promise<CredentialResult> {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("github_apps")
    .select("app_id, private_key, installation_id")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) return { ok: false, reason: "failed", detail: error.message };
  if (!data) return { ok: false, reason: "no-app", detail: "no GitHub App for this workspace" };
  if (!data.installation_id?.valueOf()) {
    return { ok: false, reason: "no-install", detail: "the App exists but is not installed" };
  }

  const minted = await installationToken(data.app_id, data.private_key, data.installation_id);
  if ("error" in minted) return { ok: false, reason: "failed", detail: minted.error };

  // Asked once per mint rather than trusted from the caller: an installation id
  // that is valid proves the App is installed, not that this repository is in the
  // set it was granted, and reading a repository outside the grant fails with the
  // same 404 a nonexistent one does.
  const repositories = await installationRepositories(minted.token);
  if ("error" in repositories) return { ok: false, reason: "failed", detail: repositories.error };

  return {
    ok: true,
    credential: { token: minted.token, expiresAt: minted.expiresAt, repositories },
  };
}

/** Whether `owner/name` is inside what this installation may read. */
export function mayRead(credential: Credential, owner: string, name: string): boolean {
  return credential.repositories.some((full) => full.toLowerCase() === `${owner}/${name}`.toLowerCase());
}
