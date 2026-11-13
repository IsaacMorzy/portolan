-- R2 (#52): review state for the CodeRabbit-style PR reviewer.
--
-- A review belongs to one analysis (a parsed repo snapshot) and one PR.
-- Review comments annotate specific files/lines within that review. Both
-- tables carry organization_id so RLS can scope a review to the org that owns
-- the repo — a workspace never sees another workspace's reviews.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  pr_number integer not null,
  repo_owner text not null,
  repo_name text not null,
  status public.analysis_status not null default 'queued',
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (id, organization_id),
  unique (organization_id, pr_number),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade,
  check ((status = 'failed') = (error is not null)),
  check ((status in ('complete', 'failed')) = (finished_at is not null))
);

comment on table public.reviews is
  'One AI review of one pull request, tied to the analysis it reviewed.';
comment on column public.reviews.pr_number is
  'The pull request number this review comments on.';
comment on column public.reviews.status is
  'Queued while the AI is reviewing, complete or failed when done.';

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  review_id uuid not null,
  file_path text not null,
  line_number integer,
  body text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (review_id, organization_id)
    references public.reviews (id, organization_id) on delete cascade
);

comment on table public.review_comments is
  'One AI comment on one file and optional line within a review.';
comment on column public.review_comments.line_number is
  'Null when the comment is about the file as a whole rather than a line.';

-- Only the pipeline's writer calls these. RLS stays on with no policies:
-- the service-key client is the only reader, so a stolen publishable key
-- reads nothing. A workspace never sees another workspace's reviews.
alter table public.reviews enable row level security;
alter table public.review_comments enable row level security;

-- A review and its comments are written together as one unit of work; an
-- index on review_id keeps fetching a review's comments cheap.
create index if not exists review_comments_review_idx
  on public.review_comments (review_id);
