
-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS employment_status text,
ADD COLUMN IF NOT EXISTS linkedin_profile text,
ADD COLUMN IF NOT EXISTS hear_about text;

-- Update the trigger function to capture all new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, country, education_level, year_of_birth, gender, employment_status, linkedin_profile, hear_about)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'education_level',
    (NEW.raw_user_meta_data->>'year_of_birth')::integer,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'employment_status',
    NEW.raw_user_meta_data->>'linkedin_profile',
    NEW.raw_user_meta_data->>'hear_about'
  );
  RETURN NEW;
END;
$$;
