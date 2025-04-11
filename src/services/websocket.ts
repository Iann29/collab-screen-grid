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

// URL do WebSocket - permite trocar facilmente entre ambientes
const WS_URL = {
  development: "ws://89.117.32.119:8000/ws",                // Dev local (inseguro)
  production: "wss://socket.magodohayday.com/ws"            // Produção (seguro)
};

// Escolher automaticamente baseado no ambiente
const CURRENT_WS_URL = window.location.protocol === 'https:' 
  ? WS_URL.production
  : WS_URL.development;

// Configurações globais para controle de logs
const DEBUG_MODE = false;

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;
  private activityCheckInterval: number | null = null;
  private activityTracker: ActivityTracker = {};
  private offlineTimeout = 2000;
  private lastNotificationStatus: {[screenId: string]: boolean} = {};

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.debugLog("WebSocket connection already open");
      return;
    }

    try {
      // Usar a URL apropriada baseada no ambiente
      this.socket = new WebSocket(CURRENT_WS_URL);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);

      this.startPingInterval();
      this.startActivityCheck();
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  }

  private handleOpen() {
    this.debugLog("WebSocket connection established!");
    this.reconnectAttempts = 0;

    this.send({
      type: "identify",
      id: "viewer-web"
    });
    
    this.debugLog("Sent identity as viewer-web");
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      // Log reduzido para mensagens importantes
      if (message.type !== "image") {
        this.debugLog("Received message:", message.type, message.id);
      }
      
      if (message.type === "image") {
        const screenId = message.id;
        
        if (screenId) {
          // Atualize rastreador antes de qualquer outra operação
          this.updateActivity(screenId, true);
          
          // Use exactly the ID that came from the server
          const imgElement = document.getElementById(screenId) as HTMLImageElement | null;
          if (imgElement && message.data) {
            imgElement.src = `data:image/jpeg;base64,${message.data}`;
            
            // Notificar mudança de status apenas se necessário (evitar redundância)
            const username = screenId.replace('screen-', '');
            this.updateScreenStatus(username, true);
          }
          
          // For the modal, we append -full to the ID
          const modalImgElement = document.getElementById(`${screenId}-full`) as HTMLImageElement | null;
          if (modalImgElement && message.data) {
            modalImgElement.src = `data:image/jpeg;base64,${message.data}`;
          }
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  // Método para atualizar o rastreador de atividade
  private updateActivity(screenId: string, isOnline: boolean) {
    const previousStatus = this.activityTracker[screenId]?.isOnline;
    
    this.activityTracker[screenId] = {
      lastUpdate: Date.now(),
      isOnline
    };
    
    // Log somente quando o status muda
    if (previousStatus !== isOnline) {
      this.debugLog(`Activity updated for ${screenId}: ${isOnline ? 'online' : 'offline'}`);
    }
  }
  
  // Método otimizado para verificar inatividade
  private checkActivity() {
    const now = Date.now();
    
    Object.entries(this.activityTracker).forEach(([screenId, activity]) => {
      // Se estiver online e o timeout tiver sido excedido
      if (activity.isOnline && now - activity.lastUpdate > this.offlineTimeout) {
        // Atualiza o status para offline
        this.updateActivity(screenId, false);
        
        // Extrai username do screenId e notifica a interface
        const username = screenId.replace('screen-', '');
        this.updateScreenStatus(username, false);
        
        this.debugLog(`${screenId} timed out (${now - activity.lastUpdate}ms inactive)`);
      }
    });
  }
  
  private startActivityCheck() {
    if (this.activityCheckInterval !== null) {
      window.clearInterval(this.activityCheckInterval);
    }
    
    // Verificação mais frequente (500ms) para detecção mais responsiva
    this.activityCheckInterval = window.setInterval(() => {
      this.checkActivity();
    }, 500);
  }
  
  private stopActivityCheck() {
    if (this.activityCheckInterval !== null) {
      window.clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  // Método otimizado para evitar disparos duplicados de eventos
  private updateScreenStatus(username: string, isOnline: boolean) {
    const normalizedUsername = username.toLowerCase();
    
    // Evita notificações repetidas do mesmo status
    if (this.lastNotificationStatus[normalizedUsername] === isOnline) {
      return;
    }
    
    // Atualiza o registro do último status notificado
    this.lastNotificationStatus[normalizedUsername] = isOnline;
    
    // Dispara o evento de mudança de status
    const event = new CustomEvent('screen-status-change', { 
      detail: { username: normalizedUsername, isOnline }
    });
    window.dispatchEvent(event);
    
    this.debugLog(`Status updated for ${normalizedUsername}: ${isOnline ? 'online' : 'offline'}`);
  }

  private handleError(error: Event) {
    console.error("WebSocket connection error:", error);
  }

  private handleClose(event: CloseEvent) {
    this.debugLog(`WebSocket connection closed, code: ${event.code}`);
    
    this.stopPingInterval();
    this.stopActivityCheck();
    
    // Marca todos como offline
    Object.keys(this.activityTracker).forEach(screenId => {
      const username = screenId.replace('screen-', '');
      this.updateScreenStatus(username, false);
    });
    
    this.reconnect();
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.debugLog(`Attempting to reconnect in ${delay/1000} seconds...`);
      
      this.reconnectTimeout = window.setTimeout(() => {
        this.debugLog(`Reconnect attempt ${this.reconnectAttempts}`);
        this.connect();
      }, delay);
    } else {
      console.error("Max reconnect attempts reached. Please refresh the page.");
    }
  }

  private startPingInterval() {
    this.pingInterval = window.setInterval(() => {
      this.sendPing();
    }, 30000);
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
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
      // Somente log para mensagens não-imagem
      if (message.type !== "image") {
        this.debugLog("Sent message:", message.type);
      }
    } else {
      console.warn("Cannot send message, WebSocket is not open");
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopPingInterval();
    this.stopActivityCheck();
    
    // Marca todos como offline quando desconecta explicitamente
    Object.keys(this.activityTracker).forEach(screenId => {
      const username = screenId.replace('screen-', '');
      this.updateScreenStatus(username, false);
    });
  }
  
  // Método de debug para reduzir logs
  private debugLog(...args: any[]) {
    if (DEBUG_MODE) {
      console.log(...args);
    }
  }
  
  // Método público para verificar status de uma tela
  isScreenOnline(username: string): boolean {
    const screenId = `screen-${username.toLowerCase()}`;
    return !!this.activityTracker[screenId]?.isOnline;
  }
}

export const websocketService = new WebSocketService();