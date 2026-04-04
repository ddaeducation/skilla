
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Add unique constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Update handle_new_user to store username
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone, country, education_level, year_of_birth, gender, employment_status, linkedin_profile, hear_about, referred_by_code, has_disability, student_residence, student_id, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '')), ''),
      NEW.email
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'education_level',
    (NEW.raw_user_meta_data->>'year_of_birth')::integer,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'employment_status',
    NEW.raw_user_meta_data->>'linkedin_profile',
    NEW.raw_user_meta_data->>'hear_about',
    NEW.raw_user_meta_data->>'referred_by_code',
    COALESCE((NEW.raw_user_meta_data->>'has_disability')::boolean, false),
    NEW.raw_user_meta_data->>'student_residence',
    generate_student_id(),
    NEW.raw_user_meta_data->>'username'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(TRIM(profiles.full_name), ''), EXCLUDED.full_name),
    username = COALESCE(profiles.username, EXCLUDED.username);
  RETURN NEW;
END;
$function$;

-- Create function to look up email by username (for login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM public.profiles WHERE lower(username) = lower(p_username) LIMIT 1;
$$;
