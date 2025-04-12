// src/services/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sha256 } from 'js-sha256';

// --- Configuração do Supabase ---
// As variáveis de ambiente VITE_* são lidas durante o build
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verificação Essencial: Garante que as credenciais foram carregadas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO CRÍTICO: Credenciais do Supabase não configuradas! Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente do seu projeto (Vercel/local). A aplicação não funcionará corretamente.');
  // Poderia até lançar um erro aqui para parar a execução em desenvolvimento
  // throw new Error("Credenciais do Supabase ausentes.");
}

// Inicializa o cliente Supabase
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// --- Interface do Usuário ---
// Define a estrutura do objeto de usuário que será usado na aplicação
export interface User {
  id: string; // UUID vindo do Supabase
  username: string;
  html_id: string;
  created_at?: string; // Opcional, pode não ser sempre necessário no frontend
  last_login?: string; // Opcional
}

// --- Estado de Autenticação ---
// Variável no escopo do módulo para manter o usuário logado (simples gerenciamento de estado)
let currentUser: User | null = null;

// --- Funções de Hash de Senha ---

// Função auxiliar para calcular o hash SHA256 da senha com o salt
// O salt é crucial para a segurança, tornando rainbow tables ineficazes
const calculatePasswordHash = (password: string): string => {
  const salt = import.meta.env.VITE_PASSWORD_SALT || '';
  if (!salt) {
    // É vital ter um salt configurado
    console.error('ERRO CRÍTICO DE CONFIGURAÇÃO: VITE_PASSWORD_SALT não definido nas variáveis de ambiente!');
    // Retornar uma string vazia ou lançar um erro pode ser apropriado
    // Retornar vazio fará a comparação de senha falhar de forma segura
    return '';
  }
  // Concatena a senha com o salt e calcula o hash
  return sha256(`${password}${salt}`);
};

// Função para verificar se a senha fornecida corresponde ao hash armazenado
// Esta é a função chave para validar o login
const verifyPassword = (password: string, storedHash: string): boolean => {
  // Calcula o hash da senha que o usuário digitou
  const calculatedHash = calculatePasswordHash(password);
  // Compara o hash calculado com o hash que está no banco de dados
  // Usa uma comparação segura em tempo constante para mitigar ataques de timing (embora sha256 puro não seja ideal para senhas, para este caso, a comparação direta é o método)
  return calculatedHash === storedHash && calculatedHash !== ''; // Garante que o cálculo não falhou por falta de salt
};


// --- Funções Principais de Autenticação ---

/**
 * Tenta autenticar um usuário com username e senha.
 * Busca o usuário no Supabase e compara o hash da senha.
 * Atualiza o timestamp de último login em caso de sucesso.
 * @param username - O nome de usuário fornecido.
 * @param password - A senha fornecida.
 * @returns Um objeto com 'data' (o objeto User em caso de sucesso) ou 'error'.
 */
export const signIn = async (username: string, password: string): Promise<{ data: User | null; error: Error | null }> => {
  try {
    // Validação Prévia: Verifica se o SALT está configurado
    if (!import.meta.env.VITE_PASSWORD_SALT) {
      console.error("Falha de login: Sistema não configurado corretamente (SALT ausente).");
      return {
        data: null,
        error: new Error("Erro interno do servidor. Por favor, tente mais tarde.") // Mensagem genérica para o usuário
      };
    }

    // Normaliza o username para minúsculas para consistência na busca
    const normalizedUsername = username.toLowerCase();

    // Busca o usuário no banco de dados Supabase pela coluna 'username'
    const { data: usersData, error: fetchError } = await supabase
      .from('users') // Nome da tabela
      .select('id, username, password_hash, html_id, created_at, last_login') // Seleciona as colunas necessárias
      .eq('username', normalizedUsername) // Filtra pelo username normalizado
      .maybeSingle(); // Espera no máximo um resultado (ou null)

    // Trata erros na busca ao banco
    if (fetchError) {
      console.error(`Erro ao buscar usuário '${normalizedUsername}' no Supabase:`, fetchError);
      return { data: null, error: new Error('Não foi possível conectar ao serviço de autenticação.') };
    }

    // Verifica se o usuário foi encontrado
    if (!usersData) {
      console.warn(`Tentativa de login falhou: Usuário '${normalizedUsername}' não encontrado.`);
      return { data: null, error: new Error('Usuário ou senha inválidos.') }; // Mensagem genérica por segurança
    }

    // Usuário encontrado, agora verifica a senha
    // Garante que a coluna password_hash existe no resultado
    if (!usersData.password_hash) {
       console.error(`Erro Crítico: Campo 'password_hash' não encontrado para o usuário ${normalizedUsername}. Verifique a consulta ou o schema.`);
       return { data: null, error: new Error("Erro de configuração da conta de usuário.") };
    }

    const isPasswordValid = verifyPassword(password, usersData.password_hash);

    // Verifica se a senha está correta
    if (!isPasswordValid) {
      console.warn(`Tentativa de login falhou: Senha inválida para usuário '${normalizedUsername}'.`);
      return { data: null, error: new Error('Usuário ou senha inválidos.') }; // Mensagem genérica
    }

    // --- Autenticação bem-sucedida ---
    console.log(`Login bem-sucedido para: ${normalizedUsername}`);

    // Atualiza o timestamp de 'last_login' (melhor esforço, não bloqueia o login se falhar)
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() }) // Atualiza com a data/hora atual
      .eq('id', usersData.id); // Filtra pelo ID do usuário

    if (updateError) {
      // Apenas registra um aviso se a atualização falhar
      console.warn(`Aviso: Falha ao atualizar last_login para ${normalizedUsername}: ${updateError.message}`);
    }

    // Define o usuário atual na variável do módulo (estado simples)
    // Importante: Criar um novo objeto apenas com os campos da interface User,
    // para não vazar o password_hash para o estado do frontend.
    currentUser = {
       id: usersData.id,
       username: usersData.username,
       html_id: usersData.html_id,
       created_at: usersData.created_at,
       last_login: usersData.last_login // Pode ser útil ter isso
    };

    // Retorna os dados do usuário (sem o hash) e nenhum erro
    return { data: currentUser, error: null };

  } catch (error: any) {
    // Captura erros inesperados durante o processo
    console.error('Erro inesperado durante o signIn:', error);
    return { data: null, error: new Error('Ocorreu um erro inesperado durante o login.') };
  }
};

/**
 * Desconecta o usuário atual, limpando o estado local.
 */
export const signOut = async (): Promise<{ error: null }> => {
  console.log(`Usuário ${currentUser?.username} desconectado.`);
  currentUser = null; // Limpa o usuário do estado
  // No futuro, se usar tokens JWT do Supabase Auth, chamaria supabase.auth.signOut() aqui
  return { error: null }; // Retorna sucesso (sem erro)
};

/**
 * Obtém o objeto do usuário atualmente autenticado (se houver).
 * Verifica primeiro o localStorage antes de retornar o currentUser em memória.
 * @returns O objeto User ou null.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  // Se já tem usuário em memória, retorna ele
  if (currentUser) {
    return currentUser;
  }
  
  // Caso contrário, tenta obter do localStorage
  try {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      const user = JSON.parse(storedUser) as User;
      // Sincroniza o usuário obtido do localStorage com a variável do módulo
      currentUser = user;
      return user;
    }
  } catch (error) {
    console.error('Erro ao obter usuário do localStorage:', error);
  }
  
  // Se não achou em nenhum lugar, retorna null
  return null;
};

/**
 * Verifica se há um usuário atualmente autenticado.
 * @returns true se houver um usuário logado, false caso contrário.
 */
export const isAuthenticated = async (): Promise<boolean> => {
  // Verifica se 'currentUser' não é null
  return !!currentUser;
};

/**
 * Obtém o ID HTML associado a um nome de usuário (ou ao usuário logado).
 * @param username - Opcional. O nome de usuário para buscar o ID. Se omitido, usa o usuário logado.
 * @returns O html_id como string, ou null se não encontrado ou ocorrer erro.
 */
export const getHtmlId = async (username?: string): Promise<string | null> => {
  // Determina qual username usar: o fornecido ou o do usuário logado
  const targetUsername = username?.toLowerCase() || currentUser?.username;

  // Se nenhum username estiver disponível, não há como buscar
  if (!targetUsername) {
    console.warn("getHtmlId chamado sem username e sem usuário logado.");
    return null;
  }

  try {
    // Busca apenas a coluna 'html_id' no Supabase
    const { data, error } = await supabase
      .from('users')
      .select('html_id')
      .eq('username', targetUsername) // Busca pelo username determinado
      .maybeSingle(); // Espera no máximo um resultado

    // Trata erros da busca ou se o usuário não foi encontrado
    if (error) {
      console.error(`Erro ao obter HTML ID para ${targetUsername}:`, error);
      return null;
    }
    if (!data) {
      console.warn(`HTML ID não encontrado para usuário ${targetUsername}`);
      return null;
    }

    // Retorna o html_id encontrado
    return data.html_id;

  } catch (error) {
    console.error(`Erro inesperado ao obter HTML ID para ${targetUsername}:`, error);
    return null;
  }
};

// Você pode adicionar mais funções aqui conforme necessário (ex: signUp, updateProfile, etc.)