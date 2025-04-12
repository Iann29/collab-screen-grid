import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, signIn as supabaseSignIn, signOut as supabaseSignOut, User } from '@/services/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Função para salvar o usuário no localStorage
const saveUserToStorage = (user: User | null) => {
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('auth_user');
  }
};

// Função para recuperar o usuário do localStorage
const getUserFromStorage = (): User | null => {
  const storedUser = localStorage.getItem('auth_user');
  if (storedUser) {
    try {
      return JSON.parse(storedUser) as User;
    } catch (e) {
      console.error('Erro ao carregar usuário do localStorage:', e);
      return null;
    }
  }
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializa o estado com o usuário do localStorage, se existir
  const [user, setUser] = useState<User | null>(() => getUserFromStorage());
  const [loading, setLoading] = useState(true);

  // Efeito para verificar o usuário quando o componente é montado
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Se já temos usuário do localStorage, usa-o primeiro para renderização rápida
        const storedUser = getUserFromStorage();
        
        if (storedUser) {
          // Define o usuário no estado do componente
          setUser(storedUser);
          
          // Atualiza também o estado no serviço Supabase para manter sincronizado
          // Isso é importante para que outras chamadas de API funcionem corretamente
          await supabase.auth.getSession();
        } else {
          // Se não tiver no localStorage, tenta obter do estado do serviço
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            saveUserToStorage(currentUser);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    // Inicializar verificação
    checkUser();
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const { data, error } = await supabaseSignIn(username, password);
      
      if (data && !error) {
        setUser(data);
        // Persiste o usuário no localStorage
        saveUserToStorage(data);
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
      // Remove o usuário do localStorage
      saveUserToStorage(null);
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
