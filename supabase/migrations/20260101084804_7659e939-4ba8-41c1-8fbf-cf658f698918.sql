-- Add unique constraint for student progress upsert
ALTER TABLE public.student_progress 
ADD CONSTRAINT student_progress_user_course_lesson_unique 
UNIQUE (user_id, course_id, lesson_id);