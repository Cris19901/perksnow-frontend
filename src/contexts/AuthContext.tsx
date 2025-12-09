import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { signIn, signUp, signOut as authSignOut, SignInData, SignUpData } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (data: SignInData) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔍 AuthContext: Initializing auth...');

        // First, check if there's an existing session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ AuthContext: Error getting session:', error);
        }

        if (session?.user) {
          console.log('✅ AuthContext: Found existing session for user:', session.user.id);
          if (mounted) {
            setUser(session.user);
          }
        } else {
          console.log('🔍 AuthContext: No existing session found');
        }
      } catch (err) {
        console.error('❌ AuthContext: Exception during init:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for changes on auth state (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔍 AuthContext: Auth state changed:', event, session?.user?.id || 'no user');

      if (mounted) {
        setUser(session?.user ?? null);

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ AuthContext: Token refreshed successfully');
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          console.log('🔍 AuthContext: User signed out');
          setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (data: SignInData) => {
    const { user: signedInUser } = await signIn(data);
    setUser(signedInUser);
  };

  const handleSignUp = async (data: SignUpData) => {
    const { user: signedUpUser } = await signUp(data);
    setUser(signedUpUser);
  };

  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
