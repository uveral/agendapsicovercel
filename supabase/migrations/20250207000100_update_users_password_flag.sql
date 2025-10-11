-- Ensure the users table stores the must_change_password flag and keep the
-- auth trigger in sync so new Supabase accounts populate the column.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing rows that may have been inserted before the column existed.
UPDATE public.users
SET must_change_password = COALESCE(must_change_password, false)
WHERE must_change_password IS DISTINCT FROM false;

-- Refresh the trigger helper so it includes the password flag and performs an
-- upsert to avoid duplicate key errors when the trigger fires multiple times.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_role user_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client');
  new_first_name text := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  new_last_name text := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  new_must_change boolean := COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false);
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    role,
    must_change_password
  )
  VALUES (
    NEW.id,
    NEW.email,
    new_first_name,
    new_last_name,
    new_role,
    new_must_change
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    must_change_password = EXCLUDED.must_change_password,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
