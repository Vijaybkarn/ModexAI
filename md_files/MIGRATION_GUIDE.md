# Supabase Database Migration Guide

## Quick Migration

To apply all database changes to your Supabase project:

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
   - Visit: https://app.supabase.com/project/_/sql/new

2. **Open the migration file**
   - Open `supabase/migrations/000_APPLY_ALL_MIGRATIONS.sql` in your editor
   - Copy the entire contents

3. **Paste and run in SQL Editor**
   - Paste the SQL into the Supabase SQL Editor
   - Click "Run" to execute

4. **Verify migration**
   - Check that all tables were created successfully
   - You should see a success message at the end

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push
```

### Option 3: Apply Migrations Individually

If you prefer to apply migrations one by one (in order):

1. `20251115185922_create_profiles_table.sql`
2. `20251115182226_fix_auth_profile_creation.sql`
3. `20251115185950_create_ollama_models_schema.sql`
4. `20251115192221_fix_profiles_rls_recursion.sql`
5. `20251115192323_add_profile_creation_trigger.sql`
6. `20251115192555_fix_security_issues_part1_indexes.sql`
7. `20251115192621_fix_security_issues_part2_rls_optimization.sql`
8. `20251115192642_fix_security_issues_part3_function_search_paths.sql`
9. `20251115192709_fix_security_issues_part4_consolidate_policies.sql`
10. `20251115193355_add_profiles_insert_policy.sql`

## What Gets Created

### Tables
- ✅ `profiles` - User profile information
- ✅ `ollama_endpoints` - Ollama API endpoints configuration
- ✅ `models` - Available AI models
- ✅ `conversations` - User chat sessions
- ✅ `messages` - Chat messages
- ✅ `usage_logs` - Usage tracking
- ✅ `audit_logs` - Admin action audit trail

### Functions
- ✅ `handle_new_user()` - Auto-creates profile when user signs up
- ✅ `update_updated_at_column()` - Auto-updates timestamps

### Triggers
- ✅ `on_auth_user_created` - Creates profile on user signup
- ✅ `update_*_updated_at` - Updates timestamps on table changes

### Policies (RLS)
- ✅ Row Level Security enabled on all tables
- ✅ Users can only access their own data
- ✅ Admins can manage endpoints and models
- ✅ Proper security policies for all operations

### Default Data
- ✅ Default "Gosetle AI" endpoint inserted
- ✅ Existing users backfilled with profiles

## Verification

After running the migration, verify everything is set up:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'ollama_endpoints', 'models', 'conversations', 'messages', 'usage_logs', 'audit_logs');

-- Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
OR event_object_schema = 'auth';

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'update_updated_at_column');

-- Check profiles for existing users
SELECT COUNT(*) as user_count, 
       (SELECT COUNT(*) FROM profiles) as profile_count
FROM auth.users;
```

## Troubleshooting

### Error: "relation already exists"
- Some tables might already exist. The migration uses `CREATE TABLE IF NOT EXISTS`, so this should be safe.
- If you get this error, the table already exists and you can continue.

### Error: "policy already exists"
- Policies might already exist. The migration drops and recreates them, so this should be handled.
- If you get this error, try running the DROP statements first.

### Error: "function already exists"
- Functions are recreated with `CREATE OR REPLACE`, so this should be safe.
- If you get errors, the function might have dependencies. Check the error message.

### RLS Policy Errors
- If you see RLS policy errors, make sure you're running the migration as a database admin or using the service role key.
- The migration should handle all policy creation automatically.

## Post-Migration Steps

1. **Verify your profile exists**
   ```sql
   SELECT * FROM profiles WHERE id = auth.uid();
   ```

2. **Check default endpoint**
   ```sql
   SELECT * FROM ollama_endpoints WHERE name = 'Gosetle AI';
   ```

3. **Test profile creation**
   - Sign up a new user
   - Verify their profile is automatically created

4. **Set yourself as admin** (if needed)
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

## Need Help?

If you encounter any issues:
1. Check the error message in the SQL Editor
2. Verify your Supabase project is active
3. Make sure you have the necessary permissions
4. Check the Supabase logs for detailed error messages

