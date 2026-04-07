
-- Fix 1: Remove public SELECT on admin_invitations, replace with authenticated-only
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.admin_invitations;
CREATE POLICY "Authenticated users can view invitation by token"
ON public.admin_invitations FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Remove public SELECT on instructor_invitations, replace with authenticated-only
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.instructor_invitations;
CREATE POLICY "Authenticated users can view invitation by token"
ON public.instructor_invitations FOR SELECT
TO authenticated
USING (true);

-- Fix 3: Remove public SELECT on course_instructor_invitations, replace with authenticated-only
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.course_instructor_invitations;
CREATE POLICY "Authenticated users can view invitation by token"
ON public.course_instructor_invitations FOR SELECT
TO authenticated
USING (true);

-- Fix 4: Remove public SELECT on corporate_admin_invitations, replace with authenticated-only
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.corporate_admin_invitations;
CREATE POLICY "Authenticated users can view invitation by token"
ON public.corporate_admin_invitations FOR SELECT
TO authenticated
USING (true);

-- Fix 5: Restrict referrals INSERT to require auth and ownership
DROP POLICY IF EXISTS "Service can insert referrals" ON public.referrals;
CREATE POLICY "Authenticated users can insert own referrals"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = referrer_id);

-- Fix 6: Restrict referrals UPDATE to admins only (triggers handle automated updates)
DROP POLICY IF EXISTS "Service can update referrals" ON public.referrals;
CREATE POLICY "Admins can update referrals"
ON public.referrals FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 7: Restrict peer_reviews INSERT to prevent self-review
DROP POLICY IF EXISTS "Authenticated users can insert peer reviews" ON public.peer_reviews;
CREATE POLICY "Authenticated users can insert peer reviews no self-review"
ON public.peer_reviews FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND reviewer_id != (SELECT user_id FROM assignment_submissions WHERE id = submission_id)
);

-- Fix 8: Restrict referral_points INSERT to admins only (triggers handle automated inserts)
DROP POLICY IF EXISTS "Service can insert points" ON public.referral_points;
CREATE POLICY "Admins can insert referral points"
ON public.referral_points FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
