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

export type JourneyEvent =
  | "execution-created"
  | "execution-started"
  | "execution-progress"
  | "execution-completed"
  | "closed"
  | "error";
