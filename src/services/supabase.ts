import { createClient } from '@supabase/supabase-js';
import { sha256 } from 'js-sha256';

// Substitua essas variáveis com suas credenciais reais do Supabase
// Idealmente, você deve usar variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Credenciais do Supabase não configuradas corretamente!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para obter o hash da senha de uma variável de ambiente
const getPasswordHash = (username: string): string | null => {
  // O formato das variáveis de ambiente é VITE_PASSWORD_HASH_NOMEUSUARIO
  // Exemplo: VITE_PASSWORD_HASH_IAN para o usuário ian
  const envVarName = `VITE_PASSWORD_HASH_${username.toUpperCase()}`;
  const hashFromEnv = import.meta.env[envVarName];
  
  // Se a variável de ambiente existir, usamos ela
  if (hashFromEnv) {
    return hashFromEnv;
  }
  
  // Caso contrário, retornamos null (usuário não reconhecido)
  return null;
};

// Função para criar hash de senha para novos usuários
// OBS: Só usar para gerar novos hashes, não para verificar senhas!
const createPasswordHash = (password: string): string => {
  const salt = import.meta.env.VITE_PASSWORD_SALT || "hayday_bot_secure_salt";
  return sha256(`${password}${salt}`);
};

// Função para verificar se uma senha é válida para um usuário
const verifyPassword = (username: string, password: string, storedHash: string): boolean => {
  // Primeiro tentamos obter um hash pré-definido das variáveis de ambiente
  const predefinedHash = getPasswordHash(username);
  
  // Comparação com hashes pré-definidos
  if (predefinedHash) {
    return predefinedHash === storedHash;
  }
  
  // Caso contrário, calculamos o hash e comparamos
  const calculatedHash = createPasswordHash(password);
  return calculatedHash === storedHash;
};

// Interface para o usuário autenticado
export interface User {
  id: string;
  username: string;
  html_id: string;
  created_at?: string;
  last_login?: string;
}

// Variável para armazenar o usuário atual
let currentUser: User | null = null;

// Funções auxiliares para autenticação
export const signIn = async (username: string, password: string) => {
  try {
    // Normaliza o username (lowercase)
    const normalizedUsername = username.toLowerCase();
    
    // Consulta Supabase por usuário com username correspondente
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', normalizedUsername);
    
    if (error) {
      console.error('Erro ao consultar usuário:', error);
      return { data: null, error: new Error(`Erro ao conectar ao banco: ${error.message}`) };
    }
    
    if (!users || users.length === 0) {
      return { data: null, error: new Error("Usuário não encontrado") };
    }
    
    const user = users[0];
    
    // Verifica a senha usando a nova função de verificação
    const isPasswordValid = verifyPassword(normalizedUsername, password, user.password_hash);
    
    if (!isPasswordValid) {
      return { data: null, error: new Error("Senha inválida") };
    }
    
    // Atualiza o timestamp de último login
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);
    
    if (updateError) {
      console.warn(`Aviso: Falha ao atualizar last_login: ${updateError.message}`);
    }
    
    // Armazena o usuário atual
    currentUser = user;
    
    return { data: user, error: null };
  } catch (error: any) {
    console.error('Erro de autenticação:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  currentUser = null;
  return { error: null };
};

export const getCurrentUser = async () => {
  return currentUser;
};

export const isAuthenticated = async () => {
  return !!currentUser;
};

// Obter o elemento HTML ID associado ao username
export const getHtmlId = async (username?: string): Promise<string | null> => {
  if (!username && !currentUser) {
    return null;
  }
  
  const targetUsername = username || currentUser?.username;
  
  if (!targetUsername) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('html_id')
      .eq('username', targetUsername.toLowerCase());
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    return data[0].html_id;
  } catch (error) {
    console.error(`Erro ao obter HTML ID: ${error}`);
    return null;
  }
};
