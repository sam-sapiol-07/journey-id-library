# journeyid-sdk

Frontend-safe TypeScript SDK for JourneyID iframe executions + websocket session events.

## Features

- Lookup customer enrollments
- Create iframe executions (OTP, facial, device, push)
- Chainable builder API: `.authenticate(...).type(...).delivery(...).start()`
- Automatic pipeline selection using configured pipeline keys
- Delivery fallback (configurable)
- WebSocket listener (automatic CONNECT <token>)
- Works in browsers (uses `fetch`, `WebSocket`) and Node.js with polyfills

## Quick start

1. Install (after publishing) or link locally

2. Build

```bash
npm run build
```

3. Example usage

```ts
import { JourneyID, AuthType, DeliveryMethod } from "journeyid-sdk";

const journey = new JourneyID({
  systemToken: "SYSTEM_JWT",
  iframeToken: "IFRAME_JWT",
  pipelines: {
    otp: "12345678-1234-1234-1234-123456789012",
    facial: "12345678-1234-1234-1234-123456789012",
    push: "b12345678-1234-1234-1234-123456789012",
  },
  defaultAuthType: AuthType.OTP,
  defaultDelivery: DeliveryMethod.SMS,
  fallbackDelivery: [DeliveryMethod.EMAIL, DeliveryMethod.LINK],
});

const result = await journey
  .authenticate("unique_id")
  .type(AuthType.FACIAL)
  .delivery(DeliveryMethod.SMS)
  .start();

journey.on("execution-progress", (e) => console.log(e));
journey.on("execution-completed", (e) => console.log("done", e));
```

## Notes

In Node.js you will need a fetch and WebSocket polyfill (e.g. node-fetch and ws) when using server-side. The library intentionally uses the browser APIs so it runs natively in browsers.

The package intentionally avoids Node-only globals so it is safe to ship to frontend consumers.
