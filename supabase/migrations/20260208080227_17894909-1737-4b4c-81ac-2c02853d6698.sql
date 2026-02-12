
-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT false,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coupon usage tracking table
CREATE TABLE public.coupon_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  discount_applied NUMERIC NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- RLS policies for coupons
CREATE POLICY "Admins can manage all coupons"
ON public.coupons FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can manage their course coupons"
ON public.coupons FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = coupons.course_id
    AND courses.instructor_id = auth.uid()
  )
  OR (is_global = false AND created_by = auth.uid())
);

CREATE POLICY "Anyone can view active coupons by code"
ON public.coupons FOR SELECT
USING (is_active = true);

-- RLS policies for coupon usages
CREATE POLICY "Admins can view all coupon usages"
ON public.coupon_usages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own coupon usages"
ON public.coupon_usages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coupon usages"
ON public.coupon_usages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructors can view usages for their course coupons"
ON public.coupon_usages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coupons c
    JOIN courses ON courses.id = c.course_id
    WHERE c.id = coupon_usages.coupon_id
    AND courses.instructor_id = auth.uid()
  )
);

-- Add index for faster lookups
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_course_id ON public.coupons(course_id);
CREATE INDEX idx_coupon_usages_coupon_id ON public.coupon_usages(coupon_id);

-- Add trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
