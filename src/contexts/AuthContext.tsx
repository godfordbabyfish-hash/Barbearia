import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type UserRole = 'admin' | 'gestor' | 'cliente' | 'barbeiro';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signInOrSignUp: (name: string, phone: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserRole = async (userId: string) => {
    // Buscar todas as roles do usuário
    const { data, error } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      console.error('Error fetching user role:', error);
      return null;
    }

    // Priorizar role admin > gestor > barbeiro > cliente
    const roles = data.map((r: any) => r.role);
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('gestor')) return 'gestor';
    if (roles.includes('barbeiro')) return 'barbeiro';
    return 'cliente';
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            const userRole = await fetchUserRole(session.user.id);
            setRole(userRole);
          }, 0);
        } else {
          setRole(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userRole = await fetchUserRole(session.user.id);
        setRole(userRole);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name,
          }
        }
      });

      if (authError) return { error: authError };

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signInOrSignUp = async (name: string, phone: string) => {
    try {
      const tempEmail = `${phone.replace(/\D/g, '')}@cliente.com`;
      const tempPassword = phone.replace(/\D/g, '');

      // Try to sign in first
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword,
      });

      if (signInError) {
        // If sign in fails, try to sign up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: tempEmail,
          password: tempPassword,
          options: {
            data: {
              name,
              phone,
            },
          },
        });

        if (signUpError) {
          return { error: signUpError };
        }

        // Create profile after signup
        if (signUpData.user) {
          await (supabase as any)
            .from('profiles')
            .upsert({
              id: signUpData.user.id,
              name,
              phone,
            }, {
              onConflict: 'id'
            });

          // Create cliente role
          await (supabase as any)
            .from('user_roles')
            .upsert({
              user_id: signUpData.user.id,
              role: 'cliente'
            }, {
              onConflict: 'user_id,role',
              ignoreDuplicates: true
            });
        }

        return { error: null };
      }

      // Update profile on sign in
      if (signInData.user) {
        await (supabase as any)
          .from('profiles')
          .upsert({
            id: signInData.user.id,
            name,
            phone,
          }, {
            onConflict: 'id'
          });
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signInOrSignUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
