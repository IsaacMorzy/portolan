-- Make project_id nullable in analyses table
ALTER TABLE public.analyses ALTER COLUMN project_id DROP NOT NULL;
