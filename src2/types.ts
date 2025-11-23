import { AuthType, DeliveryMethod, JourneyEvent } from "./enums";

export type PipelineMap = Partial<Record<AuthType, string>>;

export interface JourneyIDConfig {
  systemToken: string;
  iframeToken: string;
  pipelines?: PipelineMap;
  defaultAuthType?: AuthType;
  defaultDelivery?: DeliveryMethod;
  fallbackDelivery?: DeliveryMethod[];
  baseUrl?: string; // defaults to https://app.journeyid.io/api
}

export interface AuthenticateOptions {
  uniqueId: string; // phone or unique id
}

export interface ExecutionResult {
  sessionId: string;
  executionId?: string;
  userId?: string;
  raw?: any;
}

export type EventHandler = (payload: any) => void;
