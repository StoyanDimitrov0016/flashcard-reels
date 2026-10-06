import type { ProgressBackupFileGateway } from "@/features/progress-backup/application/progress-backup-file.gateway";
import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";

export class MemoryBackupFiles implements ProgressBackupFileGateway {
  picked: string | null = null;
  shared: ProgressBackupDocument | null = null;
  readonly copies = new Map<string, ProgressBackupDocument>();
  failSafetyCopy = false;
  private nextFile = 0;

  get safetyCopy(): ProgressBackupDocument | null {
    return [...this.copies.values()].at(-1) ?? null;
  }

  async pick(): Promise<string | null> {
    return this.picked;
  }
  async share(document: ProgressBackupDocument): Promise<void> {
    this.shared = document;
  }
  async saveSafetyCopy(document: ProgressBackupDocument): Promise<string> {
    if (this.failSafetyCopy) {
      throw new Error("Storage is full");
    }
    const fileName = `safety-copy-${++this.nextFile}.json`;
    this.copies.set(fileName, document);
    return fileName;
  }
  async hasSafetyCopy(fileName: string): Promise<boolean> {
    return this.copies.has(fileName);
  }
  async shareSafetyCopy(fileName: string): Promise<void> {
    this.shared = this.copies.get(fileName) ?? null;
    if (!this.shared) {
      throw new Error("Missing safety copy");
    }
  }
  async deleteSafetyCopy(fileName: string): Promise<void> {
    this.copies.delete(fileName);
  }
}
