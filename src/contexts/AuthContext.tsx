import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, signIn as supabaseSignIn, signOut as supabaseSignOut, User } from '@/services/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar usuário atual
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    // Inicializar verificação
    checkUser();

    return () => {
      // Nada a limpar
    };
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const { data, error } = await supabaseSignIn(username, password);
      
      if (data && !error) {
        setUser(data);
      }
      
      return { error };
    } catch (error) {
      console.error('Erro de login:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabaseSignOut();
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
