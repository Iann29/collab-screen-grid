// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { sha256 } from 'js-sha256';

// Configuração do Supabase - deve ser configurada no Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: Credenciais do Supabase não configuradas. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Função para calcular hash de senha
const createPasswordHash = (password: string): string => {
  const salt = import.meta.env.VITE_PASSWORD_SALT || '';
  if (!salt) {
    console.error('ERRO: VITE_PASSWORD_SALT não configurado nas variáveis de ambiente.');
    return '';
  }
  return sha256(`${password}${salt}`);
};

// Função para verificar hash de senha predefinido
const verifyWithEnvHash = (username: string, password: string, storedHash: string): boolean => {
  // Procura o hash predefinido na variável de ambiente
  const envVarName = `VITE_PASSWORD_HASH_${username.toUpperCase()}`;
  const predefinedHash = import.meta.env[envVarName];
  
  if (predefinedHash) {
    // Se existir um hash predefinido, usamos ele para comparação direta
    return predefinedHash === storedHash;
  }
  
  // Se não existir hash predefinido, calcula e compara
  const calculatedHash = createPasswordHash(password);
  return calculatedHash === storedHash;
};

// Funções auxiliares para autenticação
export const signIn = async (username: string, password: string) => {
  try {
    // Verifica se as variáveis necessárias estão configuradas
    if (!import.meta.env.VITE_PASSWORD_SALT) {
      return { 
        data: null, 
        error: new Error("Sistema não configurado corretamente. Contate o administrador.") 
      };
    }
    
    // Normaliza o username (lowercase)
    const normalizedUsername = username.toLowerCase();
    
    // Consulta Supabase por usuário com username correspondente
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', normalizedUsername);
    
    if (error) {
      console.error('Erro ao consultar usuário:', error);
      return { data: null, error: new Error(`Erro ao conectar ao banco de dados`) };
    }
    
    if (!users || users.length === 0) {
      return { data: null, error: new Error("Usuário não encontrado") };
    }
    
    const user = users[0];
    
    // Verifica o hash da senha
    const isPasswordValid = verifyWithEnvHash(normalizedUsername, password, user.password_hash);
    
    if (!isPasswordValid) {
      return { data: null, error: new Error("Senha inválida") };
    }
    
    // Atualiza o timestamp de último login
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);
    
    if (updateError) {
      console.warn(`Aviso: Falha ao atualizar last_login`);
    }
    
    // Armazena o usuário atual
    currentUser = user;
    
    return { data: user, error: null };
  } catch (error: any) {
    console.error('Erro de autenticação');
    return { data: null, error: new Error("Erro no processo de autenticação") };
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
    console.error(`Erro ao obter HTML ID`);
    return null;
  }
};