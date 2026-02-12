-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discussion forums table
CREATE TABLE public.discussion_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discussion replies table
CREATE TABLE public.discussion_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.discussion_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live sessions table
CREATE TABLE public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  session_url TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create direct messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Announcements policies
CREATE POLICY "Admins can manage all announcements"
ON public.announcements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can manage their course announcements"
ON public.announcements FOR ALL
USING (
  auth.uid() = author_id AND 
  (course_id IS NULL OR EXISTS (
    SELECT 1 FROM courses WHERE courses.id = announcements.course_id AND courses.instructor_id = auth.uid()
  ))
);

CREATE POLICY "Users can view global announcements"
ON public.announcements FOR SELECT
USING (is_global = true);

CREATE POLICY "Enrolled students can view course announcements"
ON public.announcements FOR SELECT
USING (
  course_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.course_id = announcements.course_id 
    AND enrollments.user_id = auth.uid() 
    AND enrollments.payment_status = 'completed'
  )
);

-- Discussion threads policies
CREATE POLICY "Admins can manage all threads"
ON public.discussion_threads FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can manage threads in their courses"
ON public.discussion_threads FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = discussion_threads.course_id 
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Enrolled students can view threads"
ON public.discussion_threads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.course_id = discussion_threads.course_id 
    AND enrollments.user_id = auth.uid() 
    AND enrollments.payment_status = 'completed'
  )
);

CREATE POLICY "Enrolled students can create threads"
ON public.discussion_threads FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.course_id = discussion_threads.course_id 
    AND enrollments.user_id = auth.uid() 
    AND enrollments.payment_status = 'completed'
  )
);

CREATE POLICY "Authors can update their threads"
ON public.discussion_threads FOR UPDATE
USING (auth.uid() = author_id);

-- Discussion replies policies
CREATE POLICY "Admins can manage all replies"
ON public.discussion_replies FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can manage replies in their courses"
ON public.discussion_replies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM discussion_threads
    JOIN courses ON courses.id = discussion_threads.course_id
    WHERE discussion_threads.id = discussion_replies.thread_id
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Enrolled students can view replies"
ON public.discussion_replies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM discussion_threads
    JOIN enrollments ON enrollments.course_id = discussion_threads.course_id
    WHERE discussion_threads.id = discussion_replies.thread_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.payment_status = 'completed'
  )
);

CREATE POLICY "Enrolled students can create replies"
ON public.discussion_replies FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM discussion_threads
    JOIN enrollments ON enrollments.course_id = discussion_threads.course_id
    WHERE discussion_threads.id = discussion_replies.thread_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.payment_status = 'completed'
  )
);

CREATE POLICY "Authors can update their replies"
ON public.discussion_replies FOR UPDATE
USING (auth.uid() = author_id);

-- Live sessions policies
CREATE POLICY "Admins can manage all live sessions"
ON public.live_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can manage their course sessions"
ON public.live_sessions FOR ALL
USING (
  auth.uid() = host_id AND
  (course_id IS NULL OR EXISTS (
    SELECT 1 FROM courses WHERE courses.id = live_sessions.course_id AND courses.instructor_id = auth.uid()
  ))
);

CREATE POLICY "Users can view global sessions"
ON public.live_sessions FOR SELECT
USING (is_global = true);

CREATE POLICY "Enrolled students can view course sessions"
ON public.live_sessions FOR SELECT
USING (
  course_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.course_id = live_sessions.course_id 
    AND enrollments.user_id = auth.uid() 
    AND enrollments.payment_status = 'completed'
  )
);

-- Messages policies
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Authenticated users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update message read status"
ON public.messages FOR UPDATE
USING (auth.uid() = recipient_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_replies;