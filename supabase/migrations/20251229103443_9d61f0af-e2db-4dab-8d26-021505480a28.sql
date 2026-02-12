-- Fix RLS policy to prevent payment bypass
-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own enrollments" ON public.enrollments;

-- Create new INSERT policy that only allows pending status
CREATE POLICY "Users can insert pending enrollments"
  ON public.enrollments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND payment_status = 'pending'
  );

-- Ensure only backend/admins can update enrollments to completed status
-- The existing admin update policy handles this, but let's make sure it exists
DROP POLICY IF EXISTS "Admins can update enrollments" ON public.enrollments;

CREATE POLICY "Admins can update enrollments"
  ON public.enrollments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Add explicit deny for anonymous access to profiles
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Add explicit deny for anonymous access to activity_logs
DROP POLICY IF EXISTS "Deny anonymous access to activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;

CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);