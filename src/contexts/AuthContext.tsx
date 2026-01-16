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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:28',message:'FetchUserRole start',data:{userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Buscar todas as roles do usuário
    const { data, error } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:34',message:'FetchUserRole result',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,hasData:!!data,dataLength:data?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:90',message:'SignIn start',data:{email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:96',message:'SignIn result',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,hasUser:!!data?.user,hasSession:!!data?.session},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      return { error };
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:103',message:'SignIn catch error',data:{errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:115',message:'SignInOrSignUp start',data:{name,phone},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    try {
      const tempEmail = `${phone.replace(/\D/g, '')}@cliente.com`;
      const tempPassword = phone.replace(/\D/g, '');

      // Try to sign in first
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword,
      });

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:126',message:'SignIn attempt result',data:{hasError:!!signInError,errorCode:signInError?.code,errorMessage:signInError?.message,hasUser:!!signInData?.user},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

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

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:140',message:'SignUp attempt result',data:{hasError:!!signUpError,errorCode:signUpError?.code,errorMessage:signUpError?.message,hasUser:!!signUpData?.user,userId:signUpData?.user?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        if (signUpError) {
          return { error: signUpError };
        }

        // O trigger handle_new_user cria profile e role automaticamente
        // Após signup, fazer signIn para criar a sessão (se não houver sessão)
        if (signUpData.user && !signUpData.session) {
          // Aguardar um pouco para o trigger executar
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Fazer signIn para criar a sessão
          const { data: signInAfterSignUp, error: signInAfterSignUpError } = await supabase.auth.signInWithPassword({
            email: tempEmail,
            password: tempPassword,
          });
          
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:153',message:'SignIn after signup',data:{hasError:!!signInAfterSignUpError,errorCode:signInAfterSignUpError?.code,hasSession:!!signInAfterSignUp?.session},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          if (signInAfterSignUpError) {
            // Se falhar, ainda retorna sucesso pois o usuário foi criado
            // O usuário pode precisar confirmar email ou fazer login manualmente
            console.warn('SignIn after signup failed:', signInAfterSignUpError);
          }
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:149',message:'Signup successful - trigger will create profile/role',data:{userId:signUpData?.user?.id,hasSession:!!signUpData?.session},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        return { error: null };
      }

      // Update profile on sign in
      if (signInData.user) {
        const profileUpdateResult = await (supabase as any)
          .from('profiles')
          .upsert({
            id: signInData.user.id,
            name,
            phone,
          }, {
            onConflict: 'id'
          });

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:180',message:'Profile update on signin result',data:{hasError:!!profileUpdateResult.error,errorCode:profileUpdateResult.error?.code,errorMessage:profileUpdateResult.error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }

      return { error: null };
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:188',message:'SignInOrSignUp catch error',data:{errorMessage:error?.message,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
