-- Add payout_schedule to instructor_payout_preferences
ALTER TABLE public.instructor_payout_preferences
ADD COLUMN IF NOT EXISTS payout_schedule TEXT DEFAULT 'manual' CHECK (payout_schedule IN ('manual', 'monthly'));

-- Create instructor_withdrawal_requests table for self-service payouts
CREATE TABLE IF NOT EXISTS public.instructor_withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID NOT NULL,
  amount_usd NUMERIC NOT NULL,
  amount_local NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payout_method TEXT NOT NULL,
  payout_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instructor_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Instructors can view their own withdrawal requests
CREATE POLICY "Instructors can view their own withdrawals"
ON public.instructor_withdrawal_requests
FOR SELECT
USING (auth.uid() = instructor_id);

-- Instructors can create their own withdrawal requests
CREATE POLICY "Instructors can create their own withdrawals"
ON public.instructor_withdrawal_requests
FOR INSERT
WITH CHECK (auth.uid() = instructor_id);

-- Instructors can cancel their pending withdrawals
CREATE POLICY "Instructors can update their pending withdrawals"
ON public.instructor_withdrawal_requests
FOR UPDATE
USING (auth.uid() = instructor_id AND status = 'pending');

-- Admins can view and update all withdrawal requests
CREATE POLICY "Admins can view all withdrawals"
ON public.instructor_withdrawal_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all withdrawals"
ON public.instructor_withdrawal_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_instructor_withdrawal_requests_updated_at
BEFORE UPDATE ON public.instructor_withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();