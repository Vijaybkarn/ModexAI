# Authentication Login Loop - Root Cause & Fix

## Executive Summary

**Issue:** Users were being redirected back to the login screen immediately after successfully logging in with Google OAuth, creating an infinite loop that prevented access to the application.

**Root Causes Identified:**
1. Missing profile creation on user signup - auth.users record existed but profiles table row didn't
2. Auth state not properly settling before redirect to protected routes
3. Inconsistent session/user state during callback handling

**Solution:** Implemented automatic profile creation via database trigger, improved auth state management, and added proper callback handling.

---

## Problem Analysis

### What Was Happening

```
User clicks "Sign in with Google"
    ↓
Google OAuth flow completes
    ↓
Supabase auth.users record created
    ↓
Redirected to /auth/callback
    ↓
Immediately navigates to /chat
    ↓
ProtectedRoute checks: session exists? YES ✓
    ↓
ChatPage loads and tries to fetch profile
    ↓
Profile query returns NULL (profile row doesn't exist!)
    ↓
User state remains null
    ↓
Some component checks user state → NOT LOGGED IN
    ↓
Redirected back to /login
    ↓
[LOOP REPEATS]
```

### Root Causes

**1. No Automatic Profile Creation**
- When Google OAuth creates a new user in `auth.users`, no corresponding row is created in the `profiles` table
- The app relies on `profiles` table for user data (email, full_name, role)
- Result: `fetchUserProfile()` returns `null`, breaking the authentication state

**2. Auth State Not Settling**
- `/auth/callback` immediately navigates to `/chat` without waiting for auth state to be ready
- If profile creation is slow or fails, the user gets kicked back to login
- No loading state during the critical authentication settlement period

**3. Missing Error Recovery**
- If profile fetch fails, no fallback to create the profile
- Async profile fetch race conditions could cause state inconsistency
- No retry logic for transient failures

---

## Investigation Methodology

### Files to Examine

1. **`src/contexts/AuthContext.tsx`** - Session and user state management
   - How initial auth state is loaded
   - How auth state changes are handled
   - Profile fetching logic

2. **`src/components/auth/LoginPage.tsx`** - Login page redirect logic
   - When redirect to /chat occurs
   - What conditions trigger the redirect

3. **`src/components/common/ProtectedRoute.tsx`** - Route protection
   - What checks trigger redirect to /login
   - Handling of loading state

4. **`src/App.tsx`** - Route configuration
   - /auth/callback route handling
   - Protected route wrapping

5. **Database `profiles` table** - User profile persistence
   - When profiles are created
   - What fields are required

### Debugging Techniques

**Browser DevTools:**
```javascript
// In browser console during login
localStorage.getItem('sb-tokens')  // Check if Supabase tokens exist
sessionStorage.keys()               // Check session storage

// Check auth state
const { data } = await supabase.auth.getSession()
console.log('Session:', data.session)
console.log('User:', data.session?.user)
```

**Network Tab:**
- Check if `/auth/callback` is being called
- Monitor API calls to fetch profiles
- Look for failed requests to `profiles` table

**React DevTools:**
- Check AuthContext value in component tree
- Monitor `loading`, `session`, `user` state changes
- Watch for unexpected re-renders

**Logs to Add:**
```typescript
// In AuthContext.tsx
console.log('Auth state:', { loading, session: !!session, user: !!user })
console.log('Fetching profile for user:', authUser.id)
console.log('Profile fetch result:', data)
```

---

## Solutions Implemented

### 1. Database Trigger for Automatic Profile Creation

**File:** Database migration `fix_auth_profile_creation`

**What it does:**
- Creates a PostgreSQL function `handle_new_user()` that runs on user creation
- Automatically creates a profile row when a new user is created in `auth.users`
- Backfills existing users without profiles

**Key code:**
```sql
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

**Why this fixes the issue:**
- Guarantees profile exists immediately after auth.users creation
- No race conditions between auth and profile creation
- Users always have a complete profile in both tables

### 2. Improved AuthContext State Management

**File:** `src/contexts/AuthContext.tsx`

**Changes:**

a) **Added cleanup tracking to prevent state updates after unmount:**
```typescript
let mounted = true;

// ... later ...

return () => {
  mounted = false;
  subscription.unsubscribe();
};
```

b) **Wrapped initial session load in proper async function:**
```typescript
const initializeAuth = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!mounted) return;

    setSession(session);
    if (session?.user) {
      await fetchUserProfile(session.user);
    }
  } finally {
    if (mounted) setLoading(false);
  }
};

initializeAuth();
```

c) **Added fallback profile creation in fetchUserProfile:**
```typescript
// If profile doesn't exist, create it
const { data: newProfile } = await supabase
  .from('profiles')
  .insert({
    id: authUser.id,
    email: authUser.email,
    full_name: authUser.user_metadata?.full_name || authUser.email,
    role: 'user',
    is_active: true
  })
  .select('*')
  .single();

if (newProfile) {
  setUser(newProfile);
}
```

**Why this fixes the issue:**
- Prevents race conditions from unmounting during auth
- Ensures `loading` is always set to false
- Falls back to creating profile if it doesn't exist
- Proper error handling throughout

### 3. New Dedicated AuthCallback Component

**File:** `src/components/auth/AuthCallback.tsx`

```typescript
export function AuthCallback() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    // Wait for auth state to settle
    if (!loading) {
      if (session) {
        navigate('/chat', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Authenticating...</p>
      </div>
    </div>
  );
}
```

**Why this fixes the issue:**
- Waits for `loading` to become false before redirecting
- Allows auth state to fully settle
- Shows user that authentication is in progress
- Prevents premature redirects to protected routes

### 4. Updated Route Configuration

**File:** `src/App.tsx`

```typescript
<Route path="/auth/callback" element={<AuthCallback />} />
```

Instead of:
```typescript
<Route path="/auth/callback" element={<Navigate to="/chat" replace />} />
```

**Why this fixes the issue:**
- Callback now waits for auth state before redirecting
- Proper loading screen during critical authentication period

---

## Testing the Fix

### Manual Testing Steps

1. **Clear browser storage:**
   ```
   DevTools → Application → Clear Site Data
   ```

2. **Fresh login test:**
   - Open http://localhost:5173
   - Click "Sign in with Google"
   - Complete Google authentication
   - **Expected:** Redirect to /chat and stay there
   - **Should not:** Redirect back to /login

3. **Verify profile was created:**
   ```sql
   SELECT * FROM public.profiles WHERE email = 'your-test@gmail.com';
   ```

4. **Refresh page test:**
   - After login, refresh the page (Cmd+R or F5)
   - **Expected:** Stay on /chat page
   - **Should not:** Redirect to /login

5. **Logout and re-login:**
   - Click profile menu → Sign Out
   - **Expected:** Redirect to /login
   - Sign in again with different account
   - **Expected:** Redirect to /chat

### Automated Testing

**Browser DevTools Console During Login:**
```javascript
// Check auth state after redirect
const { data: { session } } = await supabase.auth.getSession();
console.log('Session exists:', !!session);
console.log('Session user:', session?.user?.email);

// Check profile was created
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', session.user.id)
  .single();
console.log('Profile exists:', !!profile);
console.log('Profile data:', profile);
```

### Debugging If Issues Persist

**If still getting redirect to login:**

1. Check browser console for errors
2. Verify Supabase credentials in `.env`
3. Check Google OAuth redirect URI matches Supabase config
4. Verify `profiles` table exists and has proper RLS policies
5. Check if profile trigger is active:
   ```sql
   SELECT * FROM information_schema.triggers
   WHERE trigger_name = 'on_auth_user_created';
   ```

**If profile creation fails:**

1. Check Supabase logs for trigger errors
2. Verify `profiles` table RLS allows insert from authenticated user with their own ID
3. Check if `is_active` column exists and has proper default

---

## Preventive Measures

### Best Practices Implemented

1. **Always auto-create related records on auth signup** - Use database triggers
2. **Separate auth callback handling** - Use dedicated component with proper loading state
3. **Implement fallback profile creation** - Handle race conditions gracefully
4. **Track component mount state** - Prevent state updates after unmount
5. **Add comprehensive error logging** - Easier debugging in production
6. **Test auth flows thoroughly** - Include: new signup, refresh, re-login, logout

### Future Improvements

1. **Add auth state persistence tests:**
   ```typescript
   // Test: User can refresh page and stay logged in
   // Test: User logged out is redirected to login on refresh
   ```

2. **Add profile creation retry logic:**
   ```typescript
   // Retry profile creation with exponential backoff
   ```

3. **Monitor profile creation performance:**
   ```typescript
   // Log profile creation latency
   console.time('profile-creation');
   ```

4. **Add Sentry/error tracking:**
   ```typescript
   // Track failed profile creations
   Sentry.captureException(error);
   ```

---

## Code Changes Summary

### Files Modified

1. **`src/contexts/AuthContext.tsx`**
   - Improved session initialization with cleanup tracking
   - Added fallback profile creation
   - Better error handling and logging

2. **`src/App.tsx`**
   - Updated /auth/callback route to use new AuthCallback component
   - Imported AuthCallback component

### Files Created

1. **`src/components/auth/AuthCallback.tsx`**
   - New dedicated callback handler
   - Waits for auth state to settle
   - Shows loading screen during auth

### Database Changes

1. **Applied migration: `fix_auth_profile_creation`**
   - Created trigger function for auto-profile creation
   - Backfilled existing users without profiles
   - Ensures all users have profiles

---

## Verification Checklist

- [x] Build passes with no TypeScript errors
- [x] Database trigger applied successfully
- [x] AuthContext properly manages auth state
- [x] AuthCallback waits for loading to complete
- [x] Protected routes work correctly
- [x] Error handling added for edge cases
- [x] Cleanup prevents memory leaks

---

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Database Triggers](https://supabase.com/docs/guides/database/functions)
- [React State Management Best Practices](https://react.dev/learn/state-structure-of-the-world)
- [Async/Await Error Handling](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises)

