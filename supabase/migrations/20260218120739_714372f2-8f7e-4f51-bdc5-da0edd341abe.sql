
-- Create course instructor invitations table
CREATE TABLE public.course_instructor_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'co_instructor' CHECK (role IN ('co_instructor', 'primary')),
  invited_by uuid NOT NULL,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  UNIQUE (course_id, email, status)
);

-- Enable RLS
ALTER TABLE public.course_instructor_invitations ENABLE ROW LEVEL SECURITY;

-- Instructors can create invitations for their own courses
CREATE POLICY "Instructors can create course invitations"
ON public.course_instructor_invitations
FOR INSERT
WITH CHECK (
  auth.uid() = invited_by
  AND (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Instructors can view invitations for their courses
CREATE POLICY "Instructors can view course invitations"
ON public.course_instructor_invitations
FOR SELECT
USING (
  auth.uid() = invited_by
  OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Anyone can view an invitation by token (needed for accept page)
CREATE POLICY "Anyone can view invitation by token"
ON public.course_instructor_invitations
FOR SELECT
USING (true);

-- Instructors can delete (revoke) invitations for their courses
CREATE POLICY "Instructors can revoke course invitations"
ON public.course_instructor_invitations
FOR DELETE
USING (
  auth.uid() = invited_by
  OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Service role can update status
CREATE POLICY "Service can update invitation status"
ON public.course_instructor_invitations
FOR UPDATE
USING (true);
