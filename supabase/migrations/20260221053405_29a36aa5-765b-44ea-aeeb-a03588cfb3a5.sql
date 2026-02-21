
-- Create course_ratings table
CREATE TABLE public.course_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Enable RLS
ALTER TABLE public.course_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings (for public display)
CREATE POLICY "Anyone can view course ratings"
  ON public.course_ratings
  FOR SELECT
  USING (true);

-- Enrolled students can insert their own rating
CREATE POLICY "Enrolled students can rate courses"
  ON public.course_ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = course_ratings.course_id
        AND enrollments.user_id = auth.uid()
        AND enrollments.payment_status = 'completed'
    )
  );

-- Users can update their own rating
CREATE POLICY "Users can update their own rating"
  ON public.course_ratings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own rating
CREATE POLICY "Users can delete their own rating"
  ON public.course_ratings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_course_ratings_updated_at
  BEFORE UPDATE ON public.course_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
