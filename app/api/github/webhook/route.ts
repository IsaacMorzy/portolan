import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { appJwt, installationToken } from "@/lib/github/app.ts";
import { createAdminSupabase } from "@/lib/supabase/admin.ts";
import { reviewAnalysis } from "@/app/api/review/route.ts";

// T2 — GitHub App webhook ingestion.
//
// A real PR webhook triggers a review: GitHub POSTs here, we verify the
// HMAC-SHA256 signature using the workspace's webhook_secret, find the
// organization by the webhook's installation_id, fetch the PR diff through a
// short-lived installation token, and hand it to the review layer.
//
// Webhook guard: instead of Clerk's resolveOrganization (which needs a session),
// GitHub signs every delivery with the workspace's webhook_secret. Verifying the
// signature authenticates the calling installation, and installation_id maps to
// the organization in github_apps. This is the webhook's answer to "who is
// calling?" — resolveOrganization for a sessionless entry point. A wrong
// signature is a 401, and nothing is acted on until it passes.
//
// GitHub expects a 2xx response quickly; heavy work (model calls) is deferred
// by answering 202 once the review is accepted, not by waiting for it.

export const dynamic = "force-dynamic";

type WebhookPayload = {
  installation: { id: number };
  pull_request?: { number: number; head: { repo: { full_name: string } } };
  repository?: { full_name: string };
  action?: string;
  sender: { login: string };
};

const GITHUB_API = "https://api.github.com";

/** Verify the HMAC-SHA256 signature GitHub sends on every webhook delivery. */
function verifySignature(secret: string, payload: Buffer, signature: string | null): boolean {
  if (!signature) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** Mint a short-lived installation token for the app. */
async function getInstallationToken(appId: number | string, pem: string, installationId: number): Promise<string> {
  const token = await installationToken(appId, pem, installationId);
  if ("error" in token) throw new Error(token.error);
  return token.token;
}

/** Fetch the unified diff of a pull request from GitHub. */
async function getPullDiff(
  token: string,
  fullName: string,
  pullNumber: number,
): Promise<string> {
  const [owner, repo] = fullName.split("/");
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${pullNumber}`, {
    headers: {
      Accept: "application/vnd.github.diff",
      Authorization: `Bearer ${token}`,
      "User-Agent": "portolan",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`github diff ${response.status}`);
  return (await response.text()).slice(0, 120_000);
}

/** Fetch the in-repo rule config (.portolan/rules.json) from GitHub. */
async function getRepoRules(
  token: string,
  fullName: string,
): Promise<unknown> {
  const [owner, repo] = fullName.split("/");
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/.portolan/rules.json`, {
    headers: {
      Accept: "application/vnd.github.raw",
      Authorization: `Bearer ${token}`,
      "User-Agent": "portolan",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) return null; // No rule config — that is fine, rules are optional.
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null; // Malformed JSON — reviewAnalysis will report it.
  }
}

/** Find the latest complete analysis for this org's repo, project-first. */
async function findLatestAnalysisByRepo(
  db: ReturnType<typeof createAdminSupabase>,
  orgId: string,
  repoOwner: string,
  repoName: string,
): Promise<string | null> {
  const { data: projects } = await db
    .from("projects")
    .select("id")
    .eq("organization_id", orgId)
    .eq("repo_owner", repoOwner)
    .eq("repo_name", repoName)
    .maybeSingle();
  if (!projects) return null;

  const { data: analyses } = await db
    .from("analyses")
    .select("id")
    .eq("project_id", projects.id)
    .eq("organization_id", orgId)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1);
  return analyses?.[0]?.id ?? null;
}

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");

  // Only pull request events are handled; everything else is acknowledged.
  if (event !== "pull_request") {
    return NextResponse.json({ accepted: false, reason: `unhandled event ${event ?? "none"}` }, { status: 202 });
  }

  const payload = Buffer.from(await request.arrayBuffer());

  // Parse once to learn which installation sent this, so we can load its secret.
  let parsed: WebhookPayload;
  try {
    parsed = JSON.parse(payload.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  const installationId = parsed.installation?.id;
  if (!installationId) {
    return NextResponse.json({ error: "no installation in payload" }, { status: 400 });
  }

  const db = await createAdminSupabase();

  // Load this installation's app credentials from the workspace that installed it.
  const { data: app, error: appError } = await db
    .from("github_apps")
    .select("organization_id, app_id, slug, private_key, webhook_secret")
    .eq("installation_id", installationId)
    .maybeSingle();
  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });
  if (!app) {
    return NextResponse.json({ error: "no app for this installation" }, { status: 404 });
  }

  // Verify the signature before acting on anything.
  if (!verifySignature(app.webhook_secret ?? "", payload, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const action = parsed.action;
  const pull = parsed.pull_request;
  if (!action || !pull) {
    return NextResponse.json({ accepted: false, reason: "no pull request action" }, { status: 202 });
  }

  // Only review when something changed: opened, reopened, or new commits pushed.
  if (!["opened", "reopened", "synchronize"].includes(action)) {
    return NextResponse.json({ accepted: false, reason: `ignored action ${action}` }, { status: 202 });
  }

  const fullName = pull.head.repo.full_name;
  const [repoOwner, repoName] = fullName.split("/");
  const prNumber = pull.number;

  // Find the latest complete analysis for this org's repo.
  const analysisId = await findLatestAnalysisByRepo(db, app.organization_id, repoOwner, repoName);
  if (!analysisId) {
    return NextResponse.json(
      { accepted: false, reason: `no complete analysis for ${fullName}` },
      { status: 202 },
    );
  }

  // Mint an installation token and fetch the PR diff.
  const token = await getInstallationToken(app.app_id, app.private_key, installationId);
  const diff = await getPullDiff(token, fullName, prNumber);
  const rules = await getRepoRules(token, fullName);

  // Trigger the review — same core logic as the manual API route.
  const result = await reviewAnalysis(db, app.organization_id, analysisId, diff, prNumber, rules);

  return NextResponse.json({
    accepted: true,
    deliveryId,
    reviewId: result.reviewId,
    commentCount: result.commentCount,
    comments: result.comments,
  });
}
