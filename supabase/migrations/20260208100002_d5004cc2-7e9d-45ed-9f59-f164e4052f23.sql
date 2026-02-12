-- Add currency column to enrollments table
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD';

-- Add currency columns to instructor_earnings to store original and USD amounts
ALTER TABLE public.instructor_earnings ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD';
ALTER TABLE public.instructor_earnings ADD COLUMN IF NOT EXISTS amount_usd NUMERIC DEFAULT 0;
ALTER TABLE public.instructor_earnings ADD COLUMN IF NOT EXISTS platform_fee_usd NUMERIC DEFAULT 0;
ALTER TABLE public.instructor_earnings ADD COLUMN IF NOT EXISTS instructor_share_usd NUMERIC DEFAULT 0;

-- Create instructor payout preferences table
CREATE TABLE IF NOT EXISTS public.instructor_payout_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL UNIQUE,
  payout_method TEXT NOT NULL DEFAULT 'momo' CHECK (payout_method IN ('momo', 'card', 'bank_transfer')),
  momo_provider TEXT, -- MTN, Airtel, etc.
  momo_phone TEXT,
  card_holder_name TEXT,
  card_last_four TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  preferred_currency TEXT DEFAULT 'RWF' CHECK (preferred_currency IN ('USD', 'RWF')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on payout preferences
ALTER TABLE public.instructor_payout_preferences ENABLE ROW LEVEL SECURITY;

-- Instructors can view and update their own payout preferences
CREATE POLICY "Instructors can view own payout preferences"
ON public.instructor_payout_preferences
FOR SELECT
TO authenticated
USING (instructor_id = auth.uid());

CREATE POLICY "Instructors can insert own payout preferences"
ON public.instructor_payout_preferences
FOR INSERT
TO authenticated
WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Instructors can update own payout preferences"
ON public.instructor_payout_preferences
FOR UPDATE
TO authenticated
USING (instructor_id = auth.uid());

-- Admins can view all payout preferences
CREATE POLICY "Admins can view all payout preferences"
ON public.instructor_payout_preferences
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_instructor_payout_preferences_updated_at
BEFORE UPDATE ON public.instructor_payout_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();