import { JourneyIDConfig, ExecutionResult, EventHandler } from "./types";
import { ApiClient } from "./apiClient";
import { WebSocketClient } from "./websocketClient";
import { AuthType, DeliveryMethod } from "./enums";

export class AuthBuilder {
  private uniqueId: string;
  private cfg: JourneyIDConfig;
  private api: ApiClient;
  private selectedAuth?: AuthType;
  private selectedDelivery?: DeliveryMethod;

  constructor(uniqueId: string, cfg: JourneyIDConfig, api: ApiClient) {
    this.uniqueId = uniqueId;
    this.cfg = cfg;
    this.api = api;

    this.selectedAuth = cfg.defaultAuthType;
    this.selectedDelivery = cfg.defaultDelivery;
  }

  type(t: AuthType) {
    this.selectedAuth = t;
    return this;
  }

  delivery(d: DeliveryMethod) {
    this.selectedDelivery = d;
    return this;
  }

  async start(): Promise<{ exec: ExecutionResult; socket: WebSocketClient }> {
    // 1. Lookup customer
    const customer = await this.api
      .lookupCustomer(this.uniqueId)
      .catch(() => null);

    const phone =
      (customer && (customer.phoneNumbers?.[0] as string)) || this.uniqueId;

    // 2. Resolve pipelineKey
    const pipelineKey = this.resolvePipelineKey(this.selectedAuth);
    if (!pipelineKey)
      throw new Error("No pipeline key configured for selected auth type");

    // 3. Try deliveries (primary + fallback)
    const tries = [this.selectedDelivery, ...(this.cfg.fallbackDelivery || [])];

    let execRaw: any = null;
    let lastErr: any = null;

    for (const d of tries) {
      try {
        execRaw = await this.api.createExecution(
          this.uniqueId,
          phone,
          pipelineKey,
          d!
        );
        // Expect execRaw to contain session.id or sessionId
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!execRaw) throw lastErr;

    const sessionId =
      execRaw.session?.id || execRaw.sessionId || execRaw.sessionId;
    const executionId = execRaw.execution?.id || execRaw.id;
    const userId = (customer && customer.id) || execRaw.user?.id;

    // 4. Connect websocket
    const socket = new WebSocketClient(userId, sessionId, this.cfg.iframeToken);

    return {
      exec: { sessionId, executionId, userId, raw: execRaw },
      socket,
    };
  }

  private resolvePipelineKey(auth?: AuthType | undefined) {
    if (!auth) return undefined;
    return this.cfg.pipelines?.[auth];
  }
}
