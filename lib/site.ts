/**
 * The one place the deploy origin is written down.
 *
 * It was hardcoded in four files — metadata, JSON-LD, the GitHub App manifest and
 * the App's own setup URLs — which is why moving the domain would have been a
 * grep-and-hope instead of a config change. Clerk's publishable key embeds this
 * host, so a move is still a migration (proxy + key + env), but the code should
 * not be the part that resists it.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://codegraph-navy.vercel.app").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "Portolan";
