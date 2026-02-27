
CREATE TABLE public.collaboration_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company_website TEXT,
  collaboration_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a collaboration request
CREATE POLICY "Anyone can submit collaboration requests"
ON public.collaboration_requests
FOR INSERT
WITH CHECK (true);

-- Admins can manage all requests
CREATE POLICY "Admins can manage all collaboration requests"
ON public.collaboration_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_collaboration_requests_updated_at
BEFORE UPDATE ON public.collaboration_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
