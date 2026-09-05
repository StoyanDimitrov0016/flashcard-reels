import type { IdGenerator } from "@/shared/domain/id-generator";

export class RandomIdGenerator implements IdGenerator {
  generate(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
