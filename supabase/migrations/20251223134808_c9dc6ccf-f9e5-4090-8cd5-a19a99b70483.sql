-- Add admin policies for courses management
CREATE POLICY "Admins can insert courses" 
ON public.courses 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update courses" 
ON public.courses 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete courses" 
ON public.courses 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Add admin policies for course_materials management
CREATE POLICY "Admins can insert course_materials" 
ON public.course_materials 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update course_materials" 
ON public.course_materials 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete course_materials" 
ON public.course_materials 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all course_materials" 
ON public.course_materials 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Add admin policies for enrollments management
CREATE POLICY "Admins can view all enrollments" 
ON public.enrollments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update enrollments" 
ON public.enrollments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete enrollments" 
ON public.enrollments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Add admin policies for profiles viewing
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));