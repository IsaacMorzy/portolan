-- G1 (#27): a GitHub App installation belongs to a workspace.
--
-- Why a table and not environment variables: the App is created by the customer's
-- one click in the manifest flow, so its id, client secret and private key are
-- per-workspace data rather than per-deployment configuration. A deployment-level
-- App would mean every customer's repositories flow through one key that nobody
-- can rotate without breaking all of them at once.
--
-- The private key is stored here rather than in a vault because there is no vault
-- in this deployment. That is a limitation worth naming rather than hiding: the
-- Supabase service key already lives in the environment of the same process, so a
-- compromise of the runtime reads both. Rotating means reinstalling the App, which
-- is one click in GitHub's settings and takes the old key out of service.

create table if not exists public.github_apps (
  organization_id text primary key,
  app_id bigint not null,
  slug text not null,
  client_id text not null,
  client_secret text not null,
  -- The PEM as GitHub issued it. Newlines are stored literally; the reader turns
  -- them back into a key.
  private_key text not null,
  webhook_secret text,
  installation_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.github_apps is
  'One GitHub App per workspace, created through the manifest flow. The private key is the credential that reads private repositories.';
comment on column public.github_apps.installation_id is
  'Set when the App is installed; null while it exists but has not been installed on any account.';

-- A workspace can hold one App. The primary key already enforces it; the index is
-- for the lookup every installation token mint starts with.
create index if not exists github_apps_installation_idx
  on public.github_apps (installation_id)
  where installation_id is not null;

-- RLS stays on with no policies, the same posture as every other table: the
-- service-key client is the only reader, so a stolen publishable key reads
-- nothing. The key in this table is the reason that matters here more than usual.
alter table public.github_apps enable row level security;
