-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add instructor_id to courses table
ALTER TABLE public.courses 
ADD COLUMN instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create instructor_earnings table to track earnings
CREATE TABLE public.instructor_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  instructor_share numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create lesson_content table for various content types
CREATE TABLE public.lesson_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'text',
  content_url text,
  content_text text,
  order_index integer NOT NULL DEFAULT 0,
  duration_minutes integer,
  is_free_preview boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lesson_content(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  passing_score integer NOT NULL DEFAULT 70,
  time_limit_minutes integer,
  max_attempts integer,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  points integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL DEFAULT 0,
  explanation text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create quiz_options table for multiple choice answers
CREATE TABLE public.quiz_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0
);

-- Create assignments table
CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lesson_content(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  instructions text,
  max_score integer NOT NULL DEFAULT 100,
  due_date timestamp with time zone,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create student_progress table
CREATE TABLE public.student_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lesson_content(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  time_spent_seconds integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score integer,
  max_score integer,
  passed boolean DEFAULT false,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Create quiz_answers table for storing user answers
CREATE TABLE public.quiz_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES public.quiz_options(id) ON DELETE SET NULL,
  text_answer text,
  is_correct boolean,
  points_earned integer DEFAULT 0
);

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_text text,
  file_url text,
  score integer,
  feedback text,
  graded_by uuid REFERENCES auth.users(id),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  graded_at timestamp with time zone
);

-- Create instructor_invitations table
CREATE TABLE public.instructor_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create instructor_payouts table
CREATE TABLE public.instructor_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text,
  payment_reference text,
  notes text,
  paid_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.instructor_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instructor_earnings
CREATE POLICY "Admins can manage all earnings" ON public.instructor_earnings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can view their own earnings" ON public.instructor_earnings FOR SELECT USING (auth.uid() = instructor_id);

-- RLS Policies for lesson_content
CREATE POLICY "Admins can manage all lessons" ON public.lesson_content FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can manage their course lessons" ON public.lesson_content FOR ALL USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = lesson_content.course_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "Enrolled students can view lessons" ON public.lesson_content FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = lesson_content.course_id AND enrollments.user_id = auth.uid() AND enrollments.payment_status = 'completed')
);
CREATE POLICY "Anyone can view free preview lessons" ON public.lesson_content FOR SELECT USING (is_free_preview = true);

-- RLS Policies for quizzes
CREATE POLICY "Admins can manage all quizzes" ON public.quizzes FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can manage their course quizzes" ON public.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = quizzes.course_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "Enrolled students can view quizzes" ON public.quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = quizzes.course_id AND enrollments.user_id = auth.uid() AND enrollments.payment_status = 'completed')
);

-- RLS Policies for quiz_questions
CREATE POLICY "Admins can manage all questions" ON public.quiz_questions FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can manage their quiz questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM quizzes JOIN courses ON courses.id = quizzes.course_id WHERE quizzes.id = quiz_questions.quiz_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "Enrolled students can view questions" ON public.quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes JOIN enrollments ON enrollments.course_id = quizzes.course_id WHERE quizzes.id = quiz_questions.quiz_id AND enrollments.user_id = auth.uid() AND enrollments.payment_status = 'completed')
);

-- RLS Policies for quiz_options
CREATE POLICY "Admins can manage all options" ON public.quiz_options FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can manage their quiz options" ON public.quiz_options FOR ALL USING (
  EXISTS (SELECT 1 FROM quiz_questions JOIN quizzes ON quizzes.id = quiz_questions.quiz_id JOIN courses ON courses.id = quizzes.course_id WHERE quiz_questions.id = quiz_options.question_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "Enrolled students can view options" ON public.quiz_options FOR SELECT USING (
  EXISTS (SELECT 1 FROM quiz_questions JOIN quizzes ON quizzes.id = quiz_questions.quiz_id JOIN enrollments ON enrollments.course_id = quizzes.course_id WHERE quiz_questions.id = quiz_options.question_id AND enrollments.user_id = auth.uid() AND enrollments.payment_status = 'completed')
);

-- RLS Policies for assignments
CREATE POLICY "Admins can manage all assignments" ON public.assignments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can manage their course assignments" ON public.assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = assignments.course_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "Enrolled students can view assignments" ON public.assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = assignments.course_id AND enrollments.user_id = auth.uid() AND enrollments.payment_status = 'completed')
);

-- RLS Policies for student_progress
CREATE POLICY "Admins can view all progress" ON public.student_progress FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can view progress for their courses" ON public.student_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = student_progress.course_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "Students can manage their own progress" ON public.student_progress FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for quiz_attempts
CREATE POLICY "Admins can view all attempts" ON public.quiz_attempts FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can view attempts for their quizzes" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes JOIN courses ON courses.id = quizzes.course_id WHERE quizzes.id = quiz_attempts.quiz_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "Students can manage their own attempts" ON public.quiz_attempts FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for quiz_answers
CREATE POLICY "Admins can view all answers" ON public.quiz_answers FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can view answers for their quizzes" ON public.quiz_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM quiz_attempts JOIN quizzes ON quizzes.id = quiz_attempts.quiz_id JOIN courses ON courses.id = quizzes.course_id WHERE quiz_attempts.id = quiz_answers.attempt_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "Students can manage their own answers" ON public.quiz_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM quiz_attempts WHERE quiz_attempts.id = quiz_answers.attempt_id AND quiz_attempts.user_id = auth.uid())
);

-- RLS Policies for assignment_submissions
CREATE POLICY "Admins can manage all submissions" ON public.assignment_submissions FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can view and grade submissions" ON public.assignment_submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM assignments JOIN courses ON courses.id = assignments.course_id WHERE assignments.id = assignment_submissions.assignment_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "Students can manage their own submissions" ON public.assignment_submissions FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for instructor_invitations
CREATE POLICY "Admins can manage invitations" ON public.instructor_invitations FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view invitation by token" ON public.instructor_invitations FOR SELECT USING (true);

-- RLS Policies for instructor_payouts
CREATE POLICY "Admins can manage payouts" ON public.instructor_payouts FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can view their payouts" ON public.instructor_payouts FOR SELECT USING (auth.uid() = instructor_id);

-- Add instructors policy to courses
CREATE POLICY "Instructors can manage their own courses" ON public.courses FOR ALL USING (auth.uid() = instructor_id);

-- Create trigger for lesson_content
CREATE TRIGGER update_lesson_content_updated_at
BEFORE UPDATE ON public.lesson_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();