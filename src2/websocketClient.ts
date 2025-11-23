import { EventHandler } from "./types";

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;

  constructor(userId: string, sessionId: string, token: string) {
    this.url = `wss://app.journeyid.io/api/iframe/ws/users/${userId}/sessions/${sessionId}`;
    this.token = token;
  }

  connect(
    onMessage: (data: any) => void,
    onClose?: () => void,
    onOpen?: () => void
  ) {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      // Authenticate socket
      this.ws?.send(`CONNECT ${this.token}`);
      onOpen?.();
    };

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse((ev.data as string) || "{}");
        onMessage(data);
      } catch (err) {
        // Some servers may send plain text - ignore
      }
    };

    this.ws.onclose = () => {
      onClose?.();
    };

    this.ws.onerror = () => {
      // emit error via onClose or handled above
    };
  }

  close() {
    this.ws?.close();
  }
}
