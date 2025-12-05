import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User as AppUser } from '../types';

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(session);

        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (!mounted) return;

        setSession(session);

        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchUserProfile(authUser: User) {
    try {
      // First, try to fetch the profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        // If it's a 404 or the profile doesn't exist, try to create it
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          await createUserProfile(authUser);
        }
        return;
      }

      if (data) {
        setUser(data);
        return;
      }

      // If profile doesn't exist (data is null), create it
      // This can happen if the database trigger didn't fire or failed
      await createUserProfile(authUser);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      // Try to create profile as last resort
      try {
        await createUserProfile(authUser);
      } catch (createError) {
        console.error('Failed to create profile after error:', createError);
      }
    }
  }

  async function createUserProfile(authUser: User) {
    try {
      console.log('Creating profile for user:', authUser.id);
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email || 'User',
          role: 'user',
          is_active: true
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        
        // If it's a conflict error, the profile might have been created by another process
        // Try fetching it again
        if (createError.code === '23505' || createError.message?.includes('duplicate')) {
          console.log('Profile already exists, fetching again...');
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
          
          if (existingProfile) {
            setUser(existingProfile);
            return;
          }
        }
        
        // If RLS policy error, log it clearly
        if (createError.message?.includes('row-level security') || createError.code === '42501') {
          console.error('RLS policy error - profile creation blocked. Check database policies.');
        }
        
        return;
      }

      if (newProfile) {
        console.log('Profile created successfully:', newProfile.id);
        setUser(newProfile);
      }
    } catch (error) {
      console.error('Exception in createUserProfile:', error);
      throw error;
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      throw error;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
