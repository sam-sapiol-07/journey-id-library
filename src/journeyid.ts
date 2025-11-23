import { JourneyIDConfig, AuthType, DeliveryMethod } from "./types";
import { ApiClient } from "./apiClient";
import { PipelineResolver } from "./pipelineResolver";
import { AuthBuilder } from "./authBuilder";

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
    this.resolver = new PipelineResolver(this.cfg.pipelines);
  }

  authenticate(uniqueId: string): AuthBuilder {
    return new AuthBuilder(uniqueId, this.cfg, this.api, this.resolver);
  }
}

export { AuthType, DeliveryMethod };
