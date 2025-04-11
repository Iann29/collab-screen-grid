// src/services/websocket.ts
type WebSocketMessage = {
  type: string;
  id?: string;
  data?: string;
  timestamp?: string;
  time?: string;
};

// Interface para rastreamento de atividade
type ActivityTracker = {
  [screenId: string]: {
    lastUpdate: number;
    isOnline: boolean;
  }
};

// Configuração para conectar ao servidor WebSocket
const CONFIG = {
  // URL do WebSocket - INCLUINDO A PORTA 8000 que é obrigatória
  WS_URL: "wss://socket.magodohayday.com:8000/ws",
  
  // Timeouts e intervalos
  TIMEOUT: {
    offline: 3000,        // Tempo após o qual uma tela é considerada offline (ms)
    ping: 30000,          // Intervalo de ping para manter a conexão ativa (ms)
    activityCheck: 1000   // Com que frequência verificar telas inativas (ms)
  },
  // Número máximo de tentativas de reconexão
  MAX_RECONNECT_ATTEMPTS: 10,
  // Ativa logs detalhados para depuração
  DEBUG_MODE: true
};

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;
  private activityCheckInterval: number | null = null;
  private activityTracker: ActivityTracker = {};
  private lastNotificationStatus: {[screenId: string]: boolean} = {};

  constructor() {
    console.log("📡 Serviço WebSocket inicializado");
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.debugLog("Conexão WebSocket já está aberta");
      return;
    }

    try {
      console.log(`📡 Conectando ao WebSocket: ${CONFIG.WS_URL}`);
      
      this.socket = new WebSocket(CONFIG.WS_URL);
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);

      this.startPingInterval();
      this.startActivityCheck();
    } catch (error) {
      console.error("📡❌ Falha ao criar conexão WebSocket:", error);
      this.triggerReconnect();
    }
  }

  private handleOpen() {
    console.log("📡✅ Conexão WebSocket estabelecida!");
    this.reconnectAttempts = 0;

    // Identifica esta conexão para o servidor
    this.send({
      type: "identify",
      id: "viewer-web"
    });
    
    this.debugLog("Identidade enviada como viewer-web");
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Registra apenas mensagens que não são imagens
      if (message.type !== "image") {
        this.debugLog("Mensagem recebida:", message.type, message.id);
      }
      
      if (message.type === "image") {
        const screenId = message.id;
        
        if (screenId) {
          // Atualiza rastreador de atividade primeiro
          this.updateActivity(screenId, true);
          
          // Atualiza a imagem em miniatura
          const imgElement = document.getElementById(screenId) as HTMLImageElement | null;
          if (imgElement && message.data) {
            imgElement.src = `data:image/jpeg;base64,${message.data}`;
            
            // Extrai nome de usuário do screenId e atualiza status
            const username = screenId.replace('screen-', '');
            this.updateScreenStatus(username, true);
          }
          
          // Atualiza a imagem modal (expandida) se visível
          const modalImgElement = document.getElementById(`${screenId}-full`) as HTMLImageElement | null;
          if (modalImgElement && message.data) {
            modalImgElement.src = `data:image/jpeg;base64,${message.data}`;
          }
        }
      } else if (message.type === "pong") {
        this.debugLog("Pong recebido do servidor");
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
    }
  }

  // Resto do código permanece o mesmo...
  
  // Rastreia atividade para cada tela
  private updateActivity(screenId: string, isOnline: boolean) {
    const previousStatus = this.activityTracker[screenId]?.isOnline;
    
    this.activityTracker[screenId] = {
      lastUpdate: Date.now(),
      isOnline
    };
    
    // Registra apenas quando o status muda
    if (previousStatus !== isOnline) {
      this.debugLog(`Atividade atualizada para ${screenId}: ${isOnline ? 'online' : 'offline'}`);
    }
  }
  
  private checkActivity() {
    const now = Date.now();
    
    Object.entries(this.activityTracker).forEach(([screenId, activity]) => {
      // Se online e timeout excedido, marca como offline
      if (activity.isOnline && now - activity.lastUpdate > CONFIG.TIMEOUT.offline) {
        // Atualiza rastreador de atividade
        this.updateActivity(screenId, false);
        
        // Notifica interface da mudança de status
        const username = screenId.replace('screen-', '');
        this.updateScreenStatus(username, false);
        
        this.debugLog(`${screenId} marcado como offline após ${now - activity.lastUpdate}ms inativo`);
      }
    });
  }
  
  private startActivityCheck() {
    this.stopActivityCheck(); // Limpa qualquer intervalo existente
    
    this.activityCheckInterval = window.setInterval(() => {
      this.checkActivity();
    }, CONFIG.TIMEOUT.activityCheck);
  }
  
  private stopActivityCheck() {
    if (this.activityCheckInterval !== null) {
      window.clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  // Notifica app sobre mudanças de status das telas
  private updateScreenStatus(username: string, isOnline: boolean) {
    const normalizedUsername = username.toLowerCase();
    
    // Evita notificações duplicadas
    if (this.lastNotificationStatus[normalizedUsername] === isOnline) {
      return;
    }
    
    // Atualiza o último status notificado
    this.lastNotificationStatus[normalizedUsername] = isOnline;
    
    // Dispara evento para componentes UI responderem
    const event = new CustomEvent('screen-status-change', { 
      detail: { username: normalizedUsername, isOnline }
    });
    window.dispatchEvent(event);
    
    if (isOnline) {
      console.log(`🟢 Tela ${normalizedUsername} agora está ONLINE`);
    } else {
      console.log(`🔴 Tela ${normalizedUsername} agora está OFFLINE`);
    }
  }

  private handleError(error: Event) {
    console.error("📡❌ Erro na conexão WebSocket:", error);
  }

  private handleClose(event: CloseEvent) {
    this.debugLog(`📡🔌 Conexão WebSocket fechada, código: ${event.code}, motivo: ${event.reason || 'Nenhum motivo fornecido'}`);
    
    this.stopPingInterval();
    this.stopActivityCheck();
    
    // Marca todas as telas como offline
    Object.keys(this.activityTracker).forEach(screenId => {
      const username = screenId.replace('screen-', '');
      this.updateScreenStatus(username, false);
    });
    
    this.triggerReconnect();
  }

  private triggerReconnect() {
    // Limpa qualquer timeout de reconexão existente
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts < CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      
      // Backoff exponencial com delay máximo de 30 segundos
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
      console.log(`📡🔄 Tentando reconectar em ${(delay/1000).toFixed(1)} segundos... (tentativa ${this.reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS})`);
      
      this.reconnectTimeout = window.setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error("📡⛔ Máximo de tentativas de reconexão atingido. Por favor, atualize a página.");
    }
  }

  private startPingInterval() {
    this.stopPingInterval(); // Limpa qualquer intervalo existente
    
    this.pingInterval = window.setInterval(() => {
      this.sendPing();
    }, CONFIG.TIMEOUT.ping);
  }

  private stopPingInterval() {
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private sendPing() {
    this.send({
      type: "ping",
      time: new Date().toISOString()
    });
  }

  send(message: WebSocketMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      // Registra apenas mensagens que não são de imagem
      if (message.type !== "image") {
        this.debugLog("Mensagem enviada:", message.type);
      }
    } else {
      console.warn("📡⚠️ Não foi possível enviar mensagem, WebSocket não está aberto");
    }
  }

  disconnect() {
    this.debugLog("Desconectando WebSocket explicitamente");
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopPingInterval();
    this.stopActivityCheck();
    
    // Marca todas as telas como offline
    Object.keys(this.activityTracker).forEach(screenId => {
      const username = screenId.replace('screen-', '');
      this.updateScreenStatus(username, false);
    });
  }
  
  // Logs condicionais
  private debugLog(...args: any[]) {
    if (CONFIG.DEBUG_MODE) {
      console.log("📡", ...args);
    }
  }
  
  // API pública para verificar status da tela
  isScreenOnline(username: string): boolean {
    const screenId = `screen-${username.toLowerCase()}`;
    return !!this.activityTracker[screenId]?.isOnline;
  }
}

export const websocketService = new WebSocketService();