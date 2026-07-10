export interface RateLimitAttempt {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}
