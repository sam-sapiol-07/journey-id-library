import {
  AuthType,
  DeliveryMethod,
  JourneyIDConfig,
  Customer,
  ExecutionResponse,
} from "./types";
import { ApiClient } from "./apiClient";
import { PipelineResolver } from "./pipelineResolver";
import { WebSocketClient } from "./websocketClient";

/**
 * AuthBuilder: returned by journey.authenticate(uniqueId)
 * chainable .type().delivery().start()
 */
export class AuthBuilder {
  private chosenAuthType?: AuthType;
  private chosenDelivery?: DeliveryMethod;

  constructor(
    private uniqueId: string,
    private cfg: JourneyIDConfig,
    private api: ApiClient,
    private resolver: PipelineResolver
  ) {
    this.chosenAuthType = cfg.defaultAuthType;
    this.chosenDelivery = cfg.defaultDelivery;
  }

  type(auth: AuthType): AuthBuilder {
    this.chosenAuthType = auth;
    return this;
  }

  delivery(delivery: DeliveryMethod): AuthBuilder {
    this.chosenDelivery = delivery;
    return this;
  }

  /**
   * start() — performs lookup, resolves pipelineKey, tries delivery + fallbacks,
   * creates execution, then connects websocket and returns a connected WebSocketClient
   */
  async start(): Promise<{
    sessionClient: WebSocketClient;
    execution: ExecutionResponse;
    customer: Customer;
  }> {
    // 1) lookup
    const customer = await this.api.lookupCustomer(this.uniqueId);

    // 2) choose pipeline key
    const pipelineKey = this.resolver.resolve(
      this.chosenAuthType ?? AuthType.OTP,
      customer
    );
    if (!pipelineKey) {
      throw new Error(
        `No pipeline configured for auth type ${this.chosenAuthType}`
      );
    }

    // 3) build delivery tries
    const tries: DeliveryMethod[] = [];
    if (this.chosenDelivery) tries.push(this.chosenDelivery);
    if (this.cfg.fallbackDelivery) {
      for (const f of this.cfg.fallbackDelivery) {
        if (!tries.includes(f)) tries.push(f);
      }
    }

    let execResp: ExecutionResponse | undefined;
    let lastErr: any;

    for (const method of tries) {
      try {
        const payload = this.buildExecutionPayload(
          customer,
          pipelineKey,
          method
        );
        execResp = await this.api.createExecution(payload);
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!execResp) {
      throw (
        lastErr ??
        new Error("Failed to create execution for all delivery methods.")
      );
    }

    // 4) derive userId and sessionId for websocket
    const sessionId =
      (execResp.session && (execResp.session as any).id) ??
      (execResp.session as string);
    const userId = (execResp.user && execResp.user.id) ?? customer.id;

    if (!userId || !sessionId) {
      // try: some flows return session id nested under execResp.sessionId
      const altSession =
        (execResp as any).sessionId || (execResp as any).session?.id;
      if (!altSession || !userId) {
        // still continue — some flows may return later events; but we require both
        throw new Error("Missing userId or sessionId in execution response.");
      }
    }

    // 5) connect websocket
    const wsUrl =
      `${this.cfg.baseUrl ?? "https://app.journeyid.io/api"}`.replace(
        /^https?/,
        "wss"
      ) + `/iframe/ws/users/${userId}/sessions/${sessionId}`;

    const sessionClient = new WebSocketClient(wsUrl, this.cfg.iframeToken);
    await sessionClient.connect();

    return {
      sessionClient,
      execution: execResp,
      customer,
    };
  }

  private buildExecutionPayload(
    customer: Customer,
    pipelineKey: string,
    method: DeliveryMethod
  ) {
    // minimal mapping for payload; keep flexible for future fields
    const phone = customer.phoneNumbers?.[0] ?? undefined;
    const deviceId = customer.devices?.[0]?.id ?? undefined;
    const userObj: any = {
      phoneNumber: phone,
      uniqueId: customer.uniqueId ?? this.uniqueId,
    };

    const delivery: any = { method };
    if (method === DeliveryMethod.SMS && phone) delivery.phoneNumber = phone;
    if (method === DeliveryMethod.EMAIL && (customer as any).email)
      delivery.email = (customer as any).email;
    if (method === DeliveryMethod.PUSH_NOTIFICATION && deviceId)
      delivery.deviceId = deviceId;

    return {
      user: userObj,
      language: "en-US",
      delivery,
      configuration: {},
      pipelineKey,
    };
  }
}
