
-- Referral codes per user
CREATE TABLE public.referral_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral code" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral code" ON public.referral_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referrals tracking
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'signed_up',
  points_awarded_signup boolean NOT NULL DEFAULT false,
  points_awarded_enrollment boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_referred_unique UNIQUE (referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Admins can manage all referrals" ON public.referrals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert referrals" ON public.referrals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update referrals" ON public.referrals
  FOR UPDATE USING (true);

-- Points ledger
CREATE TABLE public.referral_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  points integer NOT NULL,
  dollar_value numeric NOT NULL DEFAULT 0,
  reason text NOT NULL,
  referral_id uuid REFERENCES public.referrals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points" ON public.referral_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all points" ON public.referral_points
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert points" ON public.referral_points
  FOR INSERT WITH CHECK (true);

-- Add referral_code column to profiles for tracking who referred them
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_code text;

-- Function to generate a unique referral code from user id
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Generate code from first 8 chars of uuid + random suffix
  LOOP
    v_code := upper(substring(replace(p_user_id::text, '-', '') from 1 for 4) || 
              substring(encode(gen_random_bytes(3), 'hex') from 1 for 4));
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, v_code);
  RETURN v_code;
END;
$$;

-- Function to award referral points on signup
CREATE OR REPLACE FUNCTION public.award_referral_signup_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_id uuid;
BEGIN
  -- Check if new user was referred
  IF NEW.referred_by_code IS NOT NULL AND NEW.referred_by_code != '' THEN
    SELECT rc.user_id INTO v_referrer_id
    FROM referral_codes rc WHERE rc.code = NEW.referred_by_code;
    
    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      -- Create referral record
      INSERT INTO referrals (referrer_id, referred_id, status, points_awarded_signup)
      VALUES (v_referrer_id, NEW.id, 'signed_up', true)
      ON CONFLICT (referred_id) DO NOTHING
      RETURNING id INTO v_referral_id;
      
      IF v_referral_id IS NOT NULL THEN
        -- Award 100 points ($2) to referrer
        INSERT INTO referral_points (user_id, points, dollar_value, reason, referral_id)
        VALUES (v_referrer_id, 100, 2.00, 'Referral signup bonus', v_referral_id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_referral_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.award_referral_signup_points();

-- Function to award referral points on enrollment
CREATE OR REPLACE FUNCTION public.award_referral_enrollment_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral record;
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD IS NULL OR OLD.payment_status != 'completed') THEN
    SELECT * INTO v_referral FROM referrals 
    WHERE referred_id = NEW.user_id AND points_awarded_enrollment = false
    LIMIT 1;
    
    IF v_referral IS NOT NULL THEN
      UPDATE referrals SET 
        points_awarded_enrollment = true, 
        status = 'enrolled',
        updated_at = now()
      WHERE id = v_referral.id;
      
      INSERT INTO referral_points (user_id, points, dollar_value, reason, referral_id)
      VALUES (v_referral.referrer_id, 250, 5.00, 'Referred user enrolled in course', v_referral.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_enrollment_referral_bonus
  AFTER INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.award_referral_enrollment_points();
