import { JourneyIDConfig } from "./types";
import { fetchJson } from "./utils";
import { DeliveryMethod } from "./enums";

export class ApiClient {
  private cfg: JourneyIDConfig;
  private base = "https://app.journeyid.io/api";

  constructor(cfg: JourneyIDConfig) {
    this.cfg = cfg;
  }

  async lookupCustomer(uniqueId: string) {
    const url = `${
      this.base
    }/system/customers/lookup?unique_id=${encodeURIComponent(uniqueId)}`;
    return fetchJson(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.cfg.systemToken}`,
      },
    });
  }

  async bootstrapSession(uniqueId: string, phone?: string) {
    const url = `${this.base}/iframe/sessions/bootstrap`;
    const body = {
      session: { externalRef: uniqueId },
      user: { phoneNumber: phone || "", uniqueId },
    };
    return fetchJson(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.cfg.iframeToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  async createExecution(
    uniqueId: string,
    phone: string | undefined,
    pipelineKey: string,
    deliveryMethod: DeliveryMethod
  ) {
    const url = `${this.base}/iframe/executions`;
    const body: any = {
      user: { phoneNumber: phone || "", uniqueId },
      language: "en-US",
      delivery: {},
      configuration: {},
      pipelineKey,
    };

    switch (deliveryMethod) {
      case DeliveryMethod.SMS:
        body.delivery = { method: "sms", phoneNumber: phone || "" };
        break;
      case DeliveryMethod.EMAIL:
        body.delivery = { method: "email" };
        break;
      case DeliveryMethod.LINK:
        body.delivery = { method: "link" };
        break;
      case DeliveryMethod.PUSH_NOTIFICATION:
        body.delivery = { method: "push-notification" };
        break;
      default:
        body.delivery = { method: "sms", phoneNumber: phone || "" };
    }

    return fetchJson(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.cfg.iframeToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
}
