import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cleanCPF } from '@/utils/cpfValidation';
import { toast } from 'sonner';

type UserRole = 'admin' | 'gestor' | 'cliente' | 'barbeiro';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signInOrSignUp: (name: string, phone: string) => Promise<{ error: any }>;
  signUpWithCPF: (cpf: string, name: string, whatsapp: string, birthDate: string) => Promise<{ error: any }>;
  signInWithCPF: (cpf: string) => Promise<{ error: any }>;
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
    const finalRole = roles.includes('admin') ? 'admin' : roles.includes('gestor') ? 'gestor' : roles.includes('barbeiro') ? 'barbeiro' : 'cliente';
    
    return finalRole;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESH_FAILED') {
          toast.error('Sua sessão expirou. Faça login novamente.');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setRole(null);
          navigate('/auth');
          setLoading(false);
          return;
        }

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Salvar email no localStorage para preenchimento automático futuro (apenas se login bem-sucedido)
      if (!error && typeof window !== 'undefined') {
        try {
          localStorage.setItem('lastBarberEmail', email);
        } catch (e) {
          console.warn('Não foi possível salvar email no localStorage:', e);
        }
      }
      
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
          
          if (signInAfterSignUpError) {
            // Se falhar, ainda retorna sucesso pois o usuário foi criado
            // O usuário pode precisar confirmar email ou fazer login manualmente
            console.warn('SignIn after signup failed:', signInAfterSignUpError);
          }
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

  const signUpWithCPF = async (cpf: string, name: string, whatsapp: string, birthDate: string) => {
    try {
      const cleanedCPF = cleanCPF(cpf);
      const tempEmail = `${cleanedCPF}@cliente.com`;
      const tempPassword = cleanedCPF;

      // Criar usuário no Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            name,
            cpf: cleanedCPF,
            whatsapp,
            birth_date: birthDate,
          },
        },
      });

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
        
        if (signInAfterSignUpError) {
          console.warn('SignIn after signup failed:', signInAfterSignUpError);
          // Ainda retorna sucesso pois o usuário foi criado
        } else {
          // Salvar CPF no localStorage após cadastro bem-sucedido
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('lastClientCPF', cleanedCPF);
            } catch (e) {
              console.warn('Não foi possível salvar CPF no localStorage:', e);
            }
          }
        }
        
        // Garantir vinculação do WhatsApp ao perfil
        try {
          const { data: currentUserRes } = await supabase.auth.getUser();
          const currentUser = currentUserRes?.user || signUpData.user;
          const phoneDigits = (whatsapp || '').replace(/\D/g, '');
          if (currentUser) {
            await (supabase as any)
              .from('profiles')
              .upsert(
                {
                  id: currentUser.id,
                  name: name?.trim() || 'Usuário',
                  phone: phoneDigits || null,
                },
                { onConflict: 'id' }
              );
          }
        } catch (e) {
          console.warn('Falha ao atualizar telefone no perfil após cadastro:', e);
        }
      } else if (signUpData.user && signUpData.session) {
        // Se já tiver sessão, salvar CPF também
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('lastClientCPF', cleanedCPF);
          } catch (e) {
            console.warn('Não foi possível salvar CPF no localStorage:', e);
          }
        }

        // Garantir vinculação do WhatsApp ao perfil
        try {
          const currentUser = signUpData.user;
          const phoneDigits = (whatsapp || '').replace(/\D/g, '');
          if (currentUser) {
            await (supabase as any)
              .from('profiles')
              .upsert(
                {
                  id: currentUser.id,
                  name: name?.trim() || 'Usuário',
                  phone: phoneDigits || null,
                },
                { onConflict: 'id' }
              );
          }
        } catch (e) {
          console.warn('Falha ao atualizar telefone no perfil após cadastro (sessão existente):', e);
        }
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signInWithCPF = async (cpf: string) => {
    try {
      const cleanedCPF = cleanCPF(cpf);
      
      // Buscar usuário pelo CPF na tabela profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, cpf')
        .eq('cpf', cleanedCPF)
        .maybeSingle();

      if (profileError) {
        return { error: new Error('Erro ao buscar CPF: ' + profileError.message) };
      }

      if (!profile) {
        return { error: new Error('CPF não cadastrado. Faça seu cadastro primeiro.') };
      }

      // Gerar email e senha baseados no CPF
      const tempEmail = `${cleanedCPF}@cliente.com`;
      const tempPassword = cleanedCPF;

      // Fazer login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword,
      });

      if (signInError) {
        return { error: signInError };
      }

      // Sincronizar telefone do metadata para o perfil, caso ainda não exista
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const u = userRes?.user;
        const metaPhone = (u as any)?.user_metadata?.whatsapp || (u as any)?.user_metadata?.phone || '';
        if (u && metaPhone) {
          const phoneDigits = String(metaPhone).replace(/\D/g, '');
          await (supabase as any)
            .from('profiles')
            .upsert(
              {
                id: u.id,
                name: (u as any)?.user_metadata?.name || u.email?.split('@')[0] || 'Usuário',
                phone: phoneDigits || null,
              },
              { onConflict: 'id' }
            );
        }
      } catch (e) {
        console.warn('Falha ao sincronizar telefone do metadata para perfil no login:', e);
      }

      // Salvar CPF no localStorage para preenchimento automático futuro
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lastClientCPF', cleanedCPF);
        } catch (e) {
          console.warn('Não foi possível salvar CPF no localStorage:', e);
        }
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
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signInOrSignUp, signUpWithCPF, signInWithCPF, signOut }}>
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
