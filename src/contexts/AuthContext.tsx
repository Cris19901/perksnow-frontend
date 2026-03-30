import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { signIn, signUp, signOut as authSignOut, SignInData, SignUpData } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  pending2FA: boolean;
  signIn: (data: SignInData) => Promise<{ requires2FA: boolean }>;
  signUp: (data: SignUpData) => Promise<any>;
  signOut: () => Promise<void>;
  complete2FA: () => void;
  cancel2FA: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending2FA, setPending2FA] = useState(false);
  const [pending2FAUser, setPending2FAUser] = useState<User | null>(null);
  const pending2FARef = useRef(false);

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
        // Don't set user during 2FA pending state (user hasn't verified yet)
        if (!pending2FARef.current) {
          setUser(session?.user ?? null);
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('AuthContext: Token refreshed successfully');
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setPending2FA(false);
          setPending2FAUser(null);
          pending2FARef.current = false;
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (data: SignInData) => {
    const result = await signIn(data);
    if (result.requires2FA && result.user) {
      // User needs 2FA - hold the user object but don't expose it yet
      pending2FARef.current = true;
      setPending2FAUser(result.user);
      setPending2FA(true);
      return { requires2FA: true };
    } else {
      setUser(result.user);
      return { requires2FA: false };
    }
  };

  const complete2FA = () => {
    if (pending2FAUser) {
      pending2FARef.current = false;
      setUser(pending2FAUser);
      setPending2FA(false);
      setPending2FAUser(null);
    }
  };

  const cancel2FA = async () => {
    pending2FARef.current = false;
    setPending2FA(false);
    setPending2FAUser(null);
    await authSignOut();
  };

  const handleSignUp = async (data: SignUpData) => {
    const result = await signUp(data);
    setUser(result.user);
    return result;
  };

  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    pending2FA,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    complete2FA,
    cancel2FA,
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
