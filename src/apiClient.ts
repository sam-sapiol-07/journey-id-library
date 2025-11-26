import { JourneyIDConfig, Customer, ExecutionResponse } from "./types";

export class ApiClient {
  private cfg: JourneyIDConfig;
  private baseUrl: string;

  constructor(cfg: JourneyIDConfig) {
    this.cfg = cfg;
    this.baseUrl = cfg.baseUrl ?? "https://app.journeyid.io/api";
  }

  private async request<T>(
    path: string,
    method = "GET",
    body?: any,
    useSystem = false
  ): Promise<T> {
    const token = useSystem ? this.cfg.systemToken : this.cfg.iframeToken;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    };
    if (body) headers["content-type"] = "application/json";

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    if (!res.ok) {
      let parsed: any = text;
      try {
        parsed = JSON.parse(text);
      } catch {}
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(parsed)}`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as unknown as T;
    }
  }

  async lookupCustomer(uniqueId: string): Promise<Customer> {
    const encoded = encodeURIComponent(uniqueId);
    return this.request<Customer>(
      `/system/customers/lookup?unique_id=${encoded}`,
      "GET",
      undefined,
      true
    );
  }

  async createCustomer(payload: {
    uniqueId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
    [k: string]: any;
  }): Promise<Customer> {
    return this.request<Customer>(`/system/customers`, "POST", payload, true);
  }

  async createExecution(payload: any): Promise<ExecutionResponse> {
    return this.request<ExecutionResponse>(
      `/iframe/executions`,
      "POST",
      payload,
      false
    );
  }

  async bootstrapSession(payload: any): Promise<any> {
    return this.request<any>(
      `/iframe/sessions/bootstrap`,
      "POST",
      payload,
      false
    );
  }
}
