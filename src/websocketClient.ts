type Handler = (payload: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Handler[]> = new Map();
  public raw: any = null;

  constructor(private url: string, private iframeToken: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      const onOpen = () => {
        try {
          this.ws?.send(`CONNECT ${this.iframeToken}`);
        } catch (err) {}
        resolve();
      };

      const onMessage = (ev: MessageEvent) => {
        const text = typeof ev.data === "string" ? ev.data : "";
        try {
          const parsed = JSON.parse(text);
          this.raw = parsed;
          const evt = parsed.event;
          if (evt && this.handlers.has(evt)) {
            for (const h of this.handlers.get(evt) ?? []) h(parsed);
          }
          if (this.handlers.has("message"))
            for (const h of this.handlers.get("message") ?? []) h(parsed);
        } catch (err) {
          if (this.handlers.has("raw-message"))
            for (const h of this.handlers.get("raw-message") ?? []) h(text);
        }
      };

      const onClose = () => {
        if (this.handlers.has("closed"))
          for (const h of this.handlers.get("closed") ?? [])
            h({ reason: "closed" });
      };

      const onError = (e: Event) => {
        if (this.handlers.has("error"))
          for (const h of this.handlers.get("error") ?? []) h(e);
        reject(e);
      };

      this.ws.addEventListener("open", onOpen);
      this.ws.addEventListener("message", onMessage);
      this.ws.addEventListener("close", onClose);
      this.ws.addEventListener("error", onError);
    });
  }

  on(eventName: string, handler: Handler) {
    const arr = this.handlers.get(eventName) ?? [];
    arr.push(handler);
    this.handlers.set(eventName, arr);
  }

  close() {
    try {
      this.ws?.close();
    } catch {}
  }
}
