-- Delete orphaned quiz options (for orphaned quizzes)
DELETE FROM quiz_options WHERE question_id IN (
  SELECT qq.id FROM quiz_questions qq
  JOIN quizzes q ON q.id = qq.quiz_id
  WHERE q.course_id = 'd7be3b2b-1390-4b2b-9529-3af0d8a13635'
  AND (q.section_id IS NULL OR q.section_id NOT IN (
    SELECT id FROM course_sections WHERE course_id = 'd7be3b2b-1390-4b2b-9529-3af0d8a13635'
  ))
);

-- Delete orphaned quiz questions
DELETE FROM quiz_questions WHERE quiz_id IN (
  SELECT id FROM quizzes 
  WHERE course_id = 'd7be3b2b-1390-4b2b-9529-3af0d8a13635'
  AND (section_id IS NULL OR section_id NOT IN (
    SELECT id FROM course_sections WHERE course_id = 'd7be3b2b-1390-4b2b-9529-3af0d8a13635'
  ))
);

-- Delete orphaned quizzes
DELETE FROM quizzes 
WHERE course_id = 'd7be3b2b-1390-4b2b-9529-3af0d8a13635'
AND (section_id IS NULL OR section_id NOT IN (
  SELECT id FROM course_sections WHERE course_id = 'd7be3b2b-1390-4b2b-9529-3af0d8a13635'
));

-- Delete orphaned assignments
DELETE FROM assignments 
WHERE course_id = 'd7be3b2b-1390-4b2b-9529-3af0d8a13635'
AND (section_id IS NULL OR section_id NOT IN (
  SELECT id FROM course_sections WHERE course_id = 'd7be3b2b-1390-4b2b-9529-3af0d8a13635'
));

-- Delete orphaned lessons
DELETE FROM lesson_content 
WHERE course_id = 'd7be3b2b-1390-4b2b-9529-3af0d8a13635'
AND (section_id IS NULL OR section_id NOT IN (
  SELECT id FROM course_sections WHERE course_id = 'd7be3b2b-1390-4b2b-9529-3af0d8a13635'
));