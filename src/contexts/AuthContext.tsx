import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfileData | null;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ data: { user: User | null }; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: { user: User | null }; error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<ProfileData>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

interface ProfileData {
  id: string;
  user_id: string;
  name: string;
  username: string | null;
  timezone: string;
  avatar_url: string | null;
  phone: string | null;
  onboarding_completed: boolean;
  trial_ends_at: string | null;
  plan_id: string | null;
  theme: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

   const fetchProfile = async (userId: string) => {
     const { data, error } = await supabase
       .from('profiles')
       .select('*')
       .eq('user_id', userId)
       .maybeSingle();

     if (data && !error) {
       const profileData = data as ProfileData;
       setProfile(profileData);
       
       // Apply theme from profile if available
       if (profileData.theme) {
         // Apply theme via global setter (set by ThemeProvider)
         const themeSetter = window['__THEME_SETTER__'];
         if (themeSetter && typeof themeSetter === 'function') {
           themeSetter(profileData.theme);
         }
         // Also apply immediately to prevent flash
         document.documentElement.classList.toggle('dark', profileData.theme === 'dark');
       }
     }
   };

   useEffect(() => {
     // Set up auth state listener FIRST
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (event, session) => {
         setSession(session);
         setUser(session?.user ?? null);

         if (session?.user) {
           // Defer profile fetch to avoid deadlock
           setTimeout(() => {
             fetchProfile(session.user.id);
           }, 0);
         } else {
           setProfile(null);
           // Reset theme to system when user logs out
           // Note: We can't directly set theme here without importing useTheme
           // The theme will be reapplied on next login
         }
         setIsLoading(false);
       }
     );

     // THEN check for existing session
     supabase.auth.getSession().then(({ data: { session } }) => {
       setSession(session);
       setUser(session?.user ?? null);
       if (session?.user) {
         fetchProfile(session.user.id);
       }
       setIsLoading(false);
     });

     return () => subscription.unsubscribe();
   }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: name,
          name: name,
        }
      }
    });

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
  };

  const signInWithGoogle = async () => {
    // Get the proper redirect URL
    // In production, use the actual domain; in development, use current origin
    const origin = window.location.origin;
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

    // If we're on localhost but accessing from a different device (like mobile testing),
    // use the production URL if available, otherwise use current origin
    let redirectUrl = origin;

    // Check if we have a production URL configured
    const productionUrl = import.meta.env.VITE_APP_URL;
    if (productionUrl && !isLocalhost) {
      redirectUrl = productionUrl;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectUrl}/dashboard`,
      }
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<ProfileData>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...data } : null);
    }

    return { error };
  };

   const refreshProfile = async () => {
     if (user) {
       await fetchProfile(user.id);
     }
   };



  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile,
      refreshProfile,
    }}>
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
