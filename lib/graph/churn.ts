/**
 * G4 (#26): how much has this file moved?
 *
 * The ticket was blocked on a schema question — churn as columns or as a
 * table — because the plan was to compute it for every file during the run.
 * That is the expensive part, not the storage: it is one GitHub request per
 * file, and a thousand-file repository would spend a fifth of the hourly limit
 * on a column most readers never look at.
 *
 * The caller only ever asks about one file at a time, so it is computed for
 * one file at a time, on demand, and stored nowhere. The schema question
 * disappears rather than being answered.
 *
 * One request, not a paginated walk: `per_page=1` plus the `Link` header's
 * `rel="last"` page number gives the total commit count, so a repository with
 * 400 commits costs the same as one with 4.
 *
 * No Clerk here on purpose — the route owns the organization check, and this
 * file owns the arithmetic, so the arithmetic can be tested without a session.
 */

const GITHUB = "https://api.github.com";

export function totalCommits(linkHeader: string | null): number | null {
  if (!linkHeader) return null;
  const last = linkHeader.split(",").find((part) => part.includes('rel="last"'));
  if (!last) return null;
  const page = last.match(/[?&]page=(\d+)/)?.[1];
  return page ? Number(page) : null;
}

export async function countChurn(
  repository: { owner: string; name: string },
  path: string,
): Promise<{ commits: number; lastTouched: string | null } | { error: string; status: number }> {
  const url = `${GITHUB}/repos/${repository.owner}/${repository.name}/commits?path=${encodeURIComponent(path)}&per_page=1`;
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "portolan",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { headers, cache: "no-store" });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), status: 502 };
  }

  if (response.status === 404) return { error: "No such repository, or no history for that path", status: 404 };
  if (response.status === 403 || response.status === 429) {
    return { error: "GitHub rate limit reached for this path", status: 429 };
  }
  if (!response.ok) return { error: `GitHub answered ${response.status}`, status: 502 };

  const commits = (await response.json()) as unknown;
  if (!Array.isArray(commits) || commits.length === 0) {
    // A file the analysis knows about but the default branch does not: usually
    // a rename between the analysed commit and now. Zero is the honest answer.
    return { commits: 0, lastTouched: null };
  }
  const first = commits[0] as { commit?: { committer?: { date?: string } } };
  // Without a Link header the repository is short enough to fit one page.
  return { commits: totalCommits(response.headers.get("link")) ?? 1, lastTouched: first.commit?.committer?.date ?? null };
}
