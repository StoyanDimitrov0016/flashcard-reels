import type { Clock } from "@/shared/domain/clock";

export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}
