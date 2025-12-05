# Profile Creation Fix

## Issue
The user profile doesn't exist in the database, causing a 404 error when trying to fetch it.

## Solution Applied

### 1. Improved Error Handling
- Better detection of missing profiles
- Automatic profile creation when missing
- Better error messages for debugging

### 2. Manual Profile Creation (If Needed)

If the automatic creation still fails, you can manually create the profile in Supabase:

#### Option A: Via Supabase Dashboard SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run this query (replace the user ID with your actual user ID):

```sql
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'user',
  true
FROM auth.users u
WHERE u.id = 'YOUR_USER_ID_HERE'
ON CONFLICT (id) DO NOTHING;
```

#### Option B: Create Profile for All Missing Users

```sql
-- Backfill all users without profiles
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'user',
  true
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
```

### 3. Verify Database Trigger

Make sure the trigger exists to auto-create profiles:

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If it doesn't exist, create it:
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 4. Verify RLS Policies

Make sure the INSERT policy exists:

```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- If INSERT policy is missing:
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));
```

## Debugging

1. **Check browser console** for detailed error messages
2. **Check Supabase logs** in the dashboard
3. **Verify environment variables** - Make sure `VITE_SUPABASE_URL` matches your project
4. **Check RLS policies** - The user must be authenticated to create their profile

## Common Issues

1. **RLS Policy Error**: The INSERT policy might be missing or incorrect
2. **Trigger Not Firing**: The database trigger might not exist or be disabled
3. **Wrong Supabase Project**: Check that your environment variables point to the correct project

