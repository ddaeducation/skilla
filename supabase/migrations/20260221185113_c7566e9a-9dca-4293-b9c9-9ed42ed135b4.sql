
-- Create corporate admin invitations table
CREATE TABLE public.corporate_admin_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  company_phone TEXT,
  max_seats INTEGER NOT NULL DEFAULT 10,
  invited_by UUID NOT NULL,
  token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.corporate_admin_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations
CREATE POLICY "Admins can manage corporate admin invitations"
ON public.corporate_admin_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view by token (for acceptance)
CREATE POLICY "Anyone can view invitation by token"
ON public.corporate_admin_invitations
FOR SELECT
USING (true);
