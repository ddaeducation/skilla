-- Epic 1: Time Tracking Tables
CREATE TABLE public.lesson_time_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lesson_content(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.lesson_time_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time tracking
CREATE POLICY "Users can view their own time tracking"
ON public.lesson_time_tracking FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time tracking"
ON public.lesson_time_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time tracking"
ON public.lesson_time_tracking FOR UPDATE
USING (auth.uid() = user_id);

-- Epic 5: Digital Badges Tables
CREATE TABLE public.badge_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria_type TEXT NOT NULL DEFAULT 'manual', -- 'course_completion', 'quiz_score', 'time_spent', 'lessons_completed', 'manual'
  criteria_value JSONB, -- e.g., {"course_id": "...", "min_score": 80}
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  awarded_by UUID,
  UNIQUE(user_id, badge_id)
);

-- Epic 4: Announcement Comments
CREATE TABLE public.announcement_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badge definitions
CREATE POLICY "Anyone can view active badges"
ON public.badge_definitions FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage badges"
ON public.badge_definitions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user badges
CREATE POLICY "Users can view all earned badges"
ON public.user_badges FOR SELECT
USING (true);

CREATE POLICY "System can award badges"
ON public.user_badges FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for announcement comments
CREATE POLICY "Authenticated users can view comments"
ON public.announcement_comments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can add comments"
ON public.announcement_comments FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments"
ON public.announcement_comments FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments"
ON public.announcement_comments FOR DELETE
USING (auth.uid() = author_id);

-- Add comments_enabled to announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN NOT NULL DEFAULT true;

-- Triggers for updated_at
CREATE TRIGGER update_lesson_time_tracking_updated_at
BEFORE UPDATE ON public.lesson_time_tracking
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcement_comments_updated_at
BEFORE UPDATE ON public.announcement_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();