
-- Add subscription tracking columns to enrollments
ALTER TABLE public.enrollments 
  ADD COLUMN IF NOT EXISTS months_paid integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone;
