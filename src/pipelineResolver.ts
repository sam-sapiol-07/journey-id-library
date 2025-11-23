import { PipelineMap, AuthType, Customer } from "./types";

export class PipelineResolver {
  private pipelines: PipelineMap;

  constructor(pipelines?: PipelineMap) {
    this.pipelines = pipelines ?? {};
  }

  resolve(authType: AuthType, customer?: Customer): string | undefined {
    const key = this.pipelines[authType];
    if (key) return key;

    if (authType === AuthType.FACIAL && this.pipelines[AuthType.OTP])
      return this.pipelines[AuthType.OTP];

    return undefined;
  }
}
