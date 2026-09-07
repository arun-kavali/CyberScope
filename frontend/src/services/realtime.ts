export type RealtimeStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface RealtimeAlertEvent {
  type: 'ALERT_CREATED';
  timestamp: string;
  data: {
    alert_id: string;
    alert_code: string;
    event_type: string;
    event_category: string;
    severity: string;
    status: string;
    timestamp: string;
    user_context?: string | null;
    asset_context?: string | null;
    source_ip?: string | null;
    destination_ip?: string | null;
    source_port?: number | null;
    destination_port?: number | null;
    protocol?: string | null;
    action?: string | null;
    description: string;
    indicator?: string | null;
    technique?: string | null;
    source_id?: string | null;
    created_at: string;
  };
}

type EventListener = (event: RealtimeAlertEvent) => void;
type StatusListener = (status: RealtimeStatus) => void;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private status: RealtimeStatus = 'DISCONNECTED';
  private eventListeners: Set<EventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isIntentionalDisconnect = false;

  constructor() {}

  public connect(token: string) {
    if (!token) return;
    this.token = token;
    this.isIntentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.initSocket();
  }

  private getWebSocketUrl(token: string): string {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const wsProtocol = window.location.protocol === 'https:' || apiBase.startsWith('https:') ? 'wss:' : 'ws:';
    const host = apiBase.replace(/^https?:\/\//, '');
    return `${wsProtocol}//${host}/ws?token=${encodeURIComponent(token)}`;
  }

  private initSocket() {
    if (!this.token) return;
    this.cleanupSocket();

    this.setStatus('CONNECTING');
    try {
      const url = this.getWebSocketUrl(this.token);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
      };

      this.ws.onmessage = (messageEvent) => {
        try {
          const parsed = JSON.parse(messageEvent.data);
          if (parsed && parsed.type) {
            this.notifyEvent(parsed as RealtimeAlertEvent);
          }
        } catch (err) {
          console.warn('Realtime message parse error:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Realtime WebSocket error:', err);
        this.setStatus('ERROR');
      };

      this.ws.onclose = (_closeEvent) => {
        if (!this.isIntentionalDisconnect) {
          this.setStatus('DISCONNECTED');
          this.scheduleReconnect();
        } else {
          this.setStatus('DISCONNECTED');
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket client:', err);
      this.setStatus('ERROR');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isIntentionalDisconnect || !this.token) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max WebSocket reconnect attempts reached.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = window.setTimeout(() => {
      if (!this.isIntentionalDisconnect && this.token) {
        this.initSocket();
      }
    }, delay);
  }

  public disconnect() {
    this.isIntentionalDisconnect = true;
    this.token = null;
    this.cleanupSocket();
    this.setStatus('DISCONNECTED');
  }

  private cleanupSocket() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private setStatus(newStatus: RealtimeStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((listener) => listener(newStatus));
  }

  private notifyEvent(event: RealtimeAlertEvent) {
    this.eventListeners.forEach((listener) => listener(event));
  }

  public getStatus(): RealtimeStatus {
    return this.status;
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public onAlertCreated(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }
}

export const realtimeClient = new RealtimeClient();
