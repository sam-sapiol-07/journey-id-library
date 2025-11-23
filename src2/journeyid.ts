import { JourneyIDConfig } from "./types";
import { ApiClient } from "./apiClient";
import { AuthBuilder } from "./authBuilder";
import { JourneyEvent } from "./enums";

export class JourneyID {
  private cfg: JourneyIDConfig;

  private api: ApiClient;

  constructor(cfg: JourneyIDConfig) {
    this.cfg = cfg;
    this.api = new ApiClient(cfg);
  }

  authenticate(uniqueId: string) {
    return new AuthBuilder(uniqueId, this.cfg, this.api);
  }
}
