
-- Create peer_reviews table for anonymous peer grading
CREATE TABLE public.peer_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  score integer,
  feedback text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(submission_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;

-- Students can view their assigned reviews (reviewer sees the review task, but NOT the author identity)
CREATE POLICY "Students can view their assigned reviews"
ON public.peer_reviews
FOR SELECT
USING (auth.uid() = reviewer_id);

-- Students can update (grade) their assigned reviews
CREATE POLICY "Students can update their assigned reviews"
ON public.peer_reviews
FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Students can view reviews OF their own submissions (anonymous - they won't see reviewer_id in the app)
CREATE POLICY "Students can view reviews of their submissions"
ON public.peer_reviews
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM assignment_submissions
  WHERE assignment_submissions.id = peer_reviews.submission_id
  AND assignment_submissions.user_id = auth.uid()
));

-- Admins can manage all peer reviews
CREATE POLICY "Admins can manage all peer reviews"
ON public.peer_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Instructors can view peer reviews for their courses
CREATE POLICY "Instructors can view peer reviews for their courses"
ON public.peer_reviews
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = peer_reviews.course_id
  AND courses.instructor_id = auth.uid()
));

-- Service/system can insert peer reviews (assigned programmatically)
CREATE POLICY "Authenticated users can insert peer reviews"
ON public.peer_reviews
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_peer_reviews_updated_at
BEFORE UPDATE ON public.peer_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_peer_reviews_reviewer ON public.peer_reviews(reviewer_id);
CREATE INDEX idx_peer_reviews_assignment ON public.peer_reviews(assignment_id);
CREATE INDEX idx_peer_reviews_submission ON public.peer_reviews(submission_id);
