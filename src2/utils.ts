export async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text().catch(() => "");
  const contentType = res.headers.get?.("content-type") || "";

  if (!res.ok) {
    // try parse json or return text
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {}
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(parsed)}`);
  }

  if (text && contentType.includes("application/json")) {
    return JSON.parse(text);
  }
  return text;
}
