import { PipelineMap, AuthType, Customer } from "./types";

export class PipelineResolver {
  private pipelines: PipelineMap;
  private enrollmentPipelines?: PipelineMap;

  constructor(pipelines?: PipelineMap, enrollmentPipelines?: PipelineMap) {
    this.pipelines = pipelines ?? {};
    this.enrollmentPipelines = enrollmentPipelines;
  }

  resolve(authType: AuthType, customer?: Customer): string | undefined {
    const key = this.pipelines[authType];
    if (key) return key;

    // fallback: facial -> otp
    if (authType === AuthType.FACIAL && this.pipelines[AuthType.OTP])
      return this.pipelines[AuthType.OTP];

    return undefined;
  }

  resolveEnrollment(
    authType: AuthType,
    customer?: Customer
  ): string | undefined {
    if (this.enrollmentPipelines) {
      const key = this.enrollmentPipelines[authType];
      if (key) return key;

      if (
        authType === AuthType.FACIAL &&
        this.enrollmentPipelines[AuthType.OTP]
      )
        return this.enrollmentPipelines[AuthType.OTP];
    }
    return this.resolve(authType, customer);
  }
}
