import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signInAnonymously, getCurrentUser, signOut } from '@/lib/supabase';

interface User {
  id: string;
  email?: string | null;
  created_at?: string;
}

interface AuthSession {
  access_token: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  isSupabaseAuth: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseAuth, setIsSupabaseAuth] = useState(false);

  // Automatically sign in user when component mounts
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First try to get existing session
        const currentAuth = await getCurrentUser();
        
        if (currentAuth.user) {
          setUser(currentAuth.user);
          setSession(currentAuth.session);
          setIsSupabaseAuth(currentAuth.isSupabaseAuth);
        } else {
          // If no existing session, sign in anonymously
          const authResult = await signInAnonymously();
          setUser(authResult.user);
          setSession(authResult.session);
          setIsSupabaseAuth(authResult.isSupabaseAuth);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Fallback to anonymous auth
        const authResult = await signInAnonymously();
        setUser(authResult.user);
        setSession(authResult.session);
        setIsSupabaseAuth(authResult.isSupabaseAuth);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async () => {
    setIsLoading(true);
    try {
      const authResult = await signInAnonymously();
      setUser(authResult.user);
      setSession(authResult.session);
      setIsSupabaseAuth(authResult.isSupabaseAuth);
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOutUser = async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUser(null);
      setSession(null);
      setIsSupabaseAuth(false);
      
      // Automatically sign in with new anonymous session
      const authResult = await signInAnonymously();
      setUser(authResult.user);
      setSession(authResult.session);
      setIsSupabaseAuth(authResult.isSupabaseAuth);
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isSupabaseAuth,
    signIn,
    signOutUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}