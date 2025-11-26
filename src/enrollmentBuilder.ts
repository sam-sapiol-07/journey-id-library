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
 * EnrollmentBuilder - returned by journey.enroll(userData)
 * chainable .type().delivery().start()
 */
export class EnrollmentBuilder {
  private chosenAuthType?: AuthType;
  private chosenDelivery?: DeliveryMethod;

  constructor(
    private userData: Partial<Customer>,
    private cfg: JourneyIDConfig,
    private api: ApiClient,
    private resolver: PipelineResolver
  ) {
    this.chosenAuthType = cfg.defaultAuthType;
    this.chosenDelivery = cfg.defaultDelivery;
  }

  type(auth: AuthType): EnrollmentBuilder {
    this.chosenAuthType = auth;
    return this;
  }

  delivery(delivery: DeliveryMethod): EnrollmentBuilder {
    this.chosenDelivery = delivery;
    return this;
  }

  /**
   * start() — creates or looks up customer, resolves pipelineKey (enrollment pipelines),
   * creates execution (enrollment), then connects websocket and returns connected client + execution + customer
   */
  async start(): Promise<{
    sessionClient: WebSocketClient;
    execution: ExecutionResponse;
    customer: Customer;
  }> {
    let customer = this.userData;
    // 1) ensure customer exists: if uniqueId provided try lookup; else create
    // let customer: Customer | undefined;

    // if (this.userData.uniqueId) {
    //   try {
    //     customer = await this.api.lookupCustomer(this.userData.uniqueId);
    //   } catch {
    //     customer = undefined;
    //   }
    // }

    // if (!customer) {
    //   // build minimal create payload (require uniqueId, firstName, lastName ideally)
    //   const createPayload: any = {
    //     uniqueId: this.userData.uniqueId ?? this.genTempUniqueId(),
    //     firstName: this.userData.firstName ?? "Unknown",
    //     lastName: this.userData.lastName ?? "User",
    //   };
    //   if (this.userData.email) createPayload.email = this.userData.email;
    //   if (this.userData.phoneNumbers && this.userData.phoneNumbers[0])
    //     createPayload.phoneNumber = this.userData.phoneNumbers[0];
    //   else if ((this.userData as any).phoneNumber)
    //     createPayload.phoneNumber = (this.userData as any).phoneNumber;

    //   customer = await this.api.createCustomer(createPayload);
    // }

    // 2) choose pipeline key (use enrollment pipelines first)
    const pipelineKey = this.resolver.resolveEnrollment(
      this.chosenAuthType ?? AuthType.OTP,
      customer
    );
    if (!pipelineKey) {
      throw new Error(
        `No enrollment pipeline configured for auth type ${this.chosenAuthType}`
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
        new Error(
          "Failed to create enrollment execution for all delivery methods."
        )
      );
    }

    // 4) derive userId and sessionId for websocket
    const sessionId =
      (execResp.session && (execResp.session as any).id) ??
      (execResp.session as string);
    const userId = (execResp.user && execResp.user.id) ?? customer.id;

    if (!userId || !sessionId) {
      const altSession =
        (execResp as any).sessionId || (execResp as any).session?.id;
      if (!altSession || !userId) {
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
    const phone = customer.phoneNumbers?.[0] ?? undefined;
    const deviceId = customer.devices?.[0]?.id ?? undefined;
    const userObj: any = {
      phoneNumber: phone,
      uniqueId: customer.uniqueId,
      id: customer.id,
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

  private genTempUniqueId() {
    // simple fallback: timestamp + random
    return `tmp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}
