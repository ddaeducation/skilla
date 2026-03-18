
ALTER TABLE public.assignments ADD COLUMN max_submissions integer DEFAULT NULL;
ALTER TABLE public.assignment_submissions ADD COLUMN submission_count integer NOT NULL DEFAULT 1;
