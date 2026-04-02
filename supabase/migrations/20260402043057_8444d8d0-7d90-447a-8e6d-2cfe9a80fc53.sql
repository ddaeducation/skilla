
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone, country, education_level, year_of_birth, gender, employment_status, linkedin_profile, hear_about, referred_by_code, has_disability, student_residence, student_id)
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
    generate_student_id()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(TRIM(profiles.full_name), ''), EXCLUDED.full_name);
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing profiles with missing names
UPDATE public.profiles p
SET full_name = COALESCE(
  u.raw_user_meta_data->>'full_name',
  NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(u.raw_user_meta_data->>'last_name', '')), ''),
  u.email
)
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR BTRIM(p.full_name) = '');
