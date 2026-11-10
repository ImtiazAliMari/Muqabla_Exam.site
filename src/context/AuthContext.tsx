import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { profileService } from '../services/supabaseService';
import { CurrentUser } from '../types';

interface AuthContextType {
  user: CurrentUser | null;
  supabaseUser: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, domicile?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<CurrentUser>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize authenticated user profile from Supabase Database
  const fetchUserProfile = async (authUser: User | null): Promise<CurrentUser | null> => {
    if (!authUser) return null;

    try {
      const profile = await profileService.getProfile(authUser.id);
      if (profile) return profile;

      // If profile does not exist in public.profiles yet, proactively upsert it
      const meta = authUser.user_metadata || {};
      const newProfile: CurrentUser = {
        id: authUser.id,
        name: meta.name || authUser.email?.split('@')[0] || 'Candidate',
        email: authUser.email || '',
        role: authUser.email === 'imtiazalimari534@gmail.com' ? 'admin' : 'candidate',
        province: meta.domicile || 'All Pakistan',
        domicile: meta.domicile || 'All Pakistan',
        education: 'Registered Candidate',
        degree: 'Graduation',
        isVerified: false,
        trustScore: 100,
        createdAt: authUser.created_at,
      };

      try {
        await supabase.from('profiles').upsert(
          {
            id: newProfile.id,
            email: newProfile.email || null,
            name: newProfile.name,
            role: newProfile.role,
            domicile: newProfile.domicile,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      } catch {
        // Ignore if table does not exist
      }

      return newProfile;
    } catch {
      // Fallback to minimal session profile
    }

    // Construct baseline profile from authenticated session
    const meta = authUser.user_metadata || {};
    return {
      id: authUser.id,
      name: meta.name || authUser.email?.split('@')[0] || 'Candidate',
      email: authUser.email || '',
      role: authUser.email === 'imtiazalimari534@gmail.com' ? 'admin' : 'candidate',
      province: meta.domicile || 'All Pakistan',
      domicile: meta.domicile || 'All Pakistan',
      education: 'Registered Candidate',
      degree: 'Graduation',
      isVerified: false,
      trustScore: 100,
      createdAt: authUser.created_at,
    };
  };

  useEffect(() => {
    let mounted = true;

    // 1. Restore current Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user).then((prof) => {
          if (!mounted) return;
          setUser(prof);
          setIsLoading(false);
        });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // 2. Real-time Supabase Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        const prof = await fetchUserProfile(session.user);
        if (mounted) setUser(prof);
      } else {
        if (mounted) setUser(null);
      }
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const prof = await fetchUserProfile(data.user);
        setUser(prof);
      }
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Login failed.' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    domicile: string = 'All Pakistan'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            domicile,
          },
        },
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Fetch or create profile
        const prof = await fetchUserProfile(data.user);
        setUser(prof);
      }
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Registration failed.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
  };

  const updateProfile = async (data: Partial<CurrentUser>): Promise<boolean> => {
    if (!supabaseUser || !user) return false;

    const res = await profileService.updateProfile(supabaseUser.id, data);
    if (res.success) {
      setUser((prev) => (prev ? { ...prev, ...data } : null));
      return true;
    }
    return false;
  };

  const refreshProfile = async () => {
    if (supabaseUser) {
      const prof = await fetchUserProfile(supabaseUser);
      if (prof) setUser(prof);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isLoading,
        isAdmin,
        login,
        signUp,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
