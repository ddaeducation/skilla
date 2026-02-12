-- Add monthly_price column to courses table
ALTER TABLE public.courses 
ADD COLUMN monthly_price numeric DEFAULT 0;