import {
  JourneyIDConfig,
  AuthType,
  DeliveryMethod,
  ExecutionEvents,
  Customer,
} from "./types";
import { ApiClient } from "./apiClient";
import { PipelineResolver } from "./pipelineResolver";
import { AuthBuilder } from "./authBuilder";
import { EnrollmentBuilder } from "./enrollmentBuilder";
import { WebSocketClient } from "./websocketClient";

/**
 * JourneyID - main SDK class
 */
export class JourneyID {
  private cfg: JourneyIDConfig;
  private api: ApiClient;
  private resolver: PipelineResolver;

  constructor(cfg: JourneyIDConfig) {
    if (!cfg.systemToken || !cfg.iframeToken)
      throw new Error("systemToken and iframeToken are required");
    this.cfg = { ...cfg };
    this.api = new ApiClient(this.cfg);
    this.resolver = new PipelineResolver(
      this.cfg.pipelines,
      this.cfg.enrollmentPipelines
    );
  }

  authenticate(uniqueId: string): AuthBuilder {
    return new AuthBuilder(uniqueId, this.cfg, this.api, this.resolver);
  }

  // create a new customer (system-level)
  async createCustomer(payload: {
    uniqueId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumbers?: string[];
    [k: string]: any;
  }) {
    return this.api.createCustomer(payload);
  }

  // start an enrollment flow for userData -> returns EnrollmentBuilder
  enroll(userData: Partial<any>): EnrollmentBuilder {
    return new EnrollmentBuilder(userData, this.cfg, this.api, this.resolver);
  }

  // helper: open websocket and register a handler for events; returns a connected client
  async onSessionEvents(
    sessionId: string,
    userId: string,
    handler: (e: any) => void
  ): Promise<WebSocketClient> {
    const wsUrl =
      `${this.cfg.baseUrl ?? "https://app.journeyid.io/api"}`.replace(
        /^https?/,
        "wss"
      ) + `/iframe/ws/users/${userId}/sessions/${sessionId}`;

    const client = new WebSocketClient(wsUrl, this.cfg.iframeToken);
    await client.connect();
    client.on("message", handler);
    // also register generic event passthrough
    client.on("raw-message", handler);
    client.on("error", handler);
    client.on("closed", handler);
    return client;
  }

  async lookupCustomer(uniqueId: string): Promise<Customer> {
    return this.api.lookupCustomer(uniqueId);
  }
}

export { AuthType, DeliveryMethod, ExecutionEvents };
