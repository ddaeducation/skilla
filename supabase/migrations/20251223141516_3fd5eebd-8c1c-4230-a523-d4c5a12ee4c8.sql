-- Create admin_invitations table
CREATE TABLE public.admin_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can view all invitations"
ON public.admin_invitations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create invitations"
ON public.admin_invitations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invitations"
ON public.admin_invitations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can view their own invitation by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
ON public.admin_invitations
FOR SELECT
USING (true);

-- Add index for token lookups
CREATE INDEX idx_admin_invitations_token ON public.admin_invitations(token);
CREATE INDEX idx_admin_invitations_email ON public.admin_invitations(email);