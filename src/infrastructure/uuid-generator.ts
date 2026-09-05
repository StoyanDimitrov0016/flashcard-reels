import { randomUUID } from "expo-crypto";

import type { IdGenerator } from "@/shared/domain/id-generator";

export class UuidGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
