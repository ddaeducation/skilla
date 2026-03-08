
-- Table for admin-managed promotional popups/announcements
CREATE TABLE public.promotional_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  popup_type text NOT NULL DEFAULT 'announcement',
  image_url text,
  cta_text text,
  cta_link text,
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promotional_popups ENABLE ROW LEVEL SECURITY;

-- Anyone can view active popups (public-facing)
CREATE POLICY "Anyone can view active popups"
  ON public.promotional_popups FOR SELECT
  USING (is_active = true);

-- Admins can manage all popups
CREATE POLICY "Admins can manage all popups"
  ON public.promotional_popups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
