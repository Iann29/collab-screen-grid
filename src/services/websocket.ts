
type WebSocketMessage = {
  type: string;
  id?: string;
  data?: string;
  timestamp?: string;
  time?: string;
};

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log("WebSocket connection already open");
      return;
    }

    this.socket = new WebSocket("ws://89.117.32.119:8000/ws");

    this.socket.onopen = this.handleOpen.bind(this);
    this.socket.onmessage = this.handleMessage.bind(this);
    this.socket.onerror = this.handleError.bind(this);
    this.socket.onclose = this.handleClose.bind(this);

    // Start ping interval
    this.startPingInterval();
  }

  private handleOpen() {
    console.log("WebSocket connection established!");
    // Reset reconnect attempts on successful connection
    this.reconnectAttempts = 0;

    // Identify to the server
    this.send({
      type: "identify",
      id: "viewer-web"
    });
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Process only image messages
      if (message.type === "image") {
        const screenId = message.id;
        
        if (screenId) {
          // Update both the card and modal images if they exist
          const imgElement = document.getElementById(screenId);
          const modalImgElement = document.getElementById(`${screenId}-full`);
          
          if (imgElement && message.data) {
            imgElement.src = `data:image/jpeg;base64,${message.data}`;
            
            // Update the screen status to online
            this.updateScreenStatus(screenId, true);
          }
          
          if (modalImgElement && message.data) {
            modalImgElement.src = `data:image/jpeg;base64,${message.data}`;
          }
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  private updateScreenStatus(screenId: string, isOnline: boolean) {
    // Extract username from screenId (e.g., screen-ian -> ian)
    const username = screenId.replace('screen-', '');
    
    // Dispatch a custom event to notify components
    const event = new CustomEvent('screen-status-change', { 
      detail: { username, isOnline }
    });
    window.dispatchEvent(event);
  }

  private handleError(error: Event) {
    console.error("WebSocket connection error:", error);
  }

  private handleClose(event: CloseEvent) {
    console.log(`WebSocket connection closed, code: ${event.code}`);
    
    // Stop ping interval
    this.stopPingInterval();
    
    // Attempt to reconnect
    this.reconnect();
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Attempting to reconnect in ${delay/1000} seconds...`);
      
      this.reconnectTimeout = window.setTimeout(() => {
        console.log(`Reconnect attempt ${this.reconnectAttempts}`);
        this.connect();
      }, delay);
    } else {
      console.error("Max reconnect attempts reached. Please refresh the page.");
    }
  }

  private startPingInterval() {
    this.pingInterval = window.setInterval(() => {
      this.sendPing();
    }, 30000); // Every 30 seconds
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
  }
}

export const websocketService = new WebSocketService();
