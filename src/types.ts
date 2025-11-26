export enum AuthType {
  OTP = "otp",
  FACIAL = "facial",
  DEVICE = "device",
  PUSH = "push",
}

export enum DeliveryMethod {
  SMS = "sms",
  EMAIL = "email",
  LINK = "link",
  PUSH_NOTIFICATION = "push-notification",
}

export type PipelineMap = Partial<Record<AuthType, string>>;

export interface JourneyIDConfig {
  systemToken: string;
  iframeToken: string;
  pipelines?: PipelineMap;
  enrollmentPipelines?: PipelineMap;
  defaultAuthType?: AuthType;
  defaultDelivery?: DeliveryMethod;
  fallbackDelivery?: DeliveryMethod[];
  baseUrl?: string;
}

export interface Customer {
  id?: string;
  uniqueId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumbers?: string[];
  devices?: Array<{ id?: string; nickname?: string; device?: string }>;
  enrollments?: Array<{ type?: string }>;
  [k: string]: any;
}

export interface ExecutionResponse {
  id?: string;
  execution?: any;
  session?: { id?: string } | string;
  user?: any;
  [k: string]: any;
}

export const ExecutionEvents = {
  CREATED: "execution-created",
  STARTED: "execution-started",
  PROGRESS: "execution-progress",
  COMPLETED: "execution-completed",
} as const;

export type ExecutionEventName =
  (typeof ExecutionEvents)[keyof typeof ExecutionEvents];
