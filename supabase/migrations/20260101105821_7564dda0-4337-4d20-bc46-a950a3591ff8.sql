-- Add approval_status to courses table for instructor-created courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Create instructor_applications table for users who want to become instructors
CREATE TABLE IF NOT EXISTS public.instructor_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    bio text,
    expertise text,
    experience text,
    status text NOT NULL DEFAULT 'pending',
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instructor_applications
CREATE POLICY "Users can view their own applications"
ON public.instructor_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications"
ON public.instructor_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all applications"
ON public.instructor_applications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update existing courses to be approved
UPDATE public.courses SET approval_status = 'approved' WHERE approval_status IS NULL;