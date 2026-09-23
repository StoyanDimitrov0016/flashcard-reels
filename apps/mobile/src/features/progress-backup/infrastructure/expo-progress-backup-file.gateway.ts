import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { strToU8 } from "fflate";

import type { ProgressBackupFileGateway } from "@/features/progress-backup/application/progress-backup-file.gateway";
import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";

const MAX_BACKUP_BYTES = 64 * 1024 * 1024;
const SAFETY_COPY_NAME = "before-last-progress-restore.json";

export class ExpoProgressBackupFileGateway implements ProgressBackupFileGateway {
  async pick(): Promise<string | null> {
    const selection = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*",
    });
    if (selection.canceled) {
      return null;
    }
    const asset = selection.assets[0];
    if (!asset) {
      throw new Error("No progress backup was selected");
    }
    const file = new File(asset.uri);
    if (file.size === null || file.size > MAX_BACKUP_BYTES) {
      throw new Error("The progress backup is too large to import");
    }
    return file.text();
  }

  async share(document: ProgressBackupDocument): Promise<void> {
    const bytes = encodeBackup(document);
    const file = new File(
      Paths.cache,
      `flashcard-reels-progress-${document.exportedAt.replaceAll(":", "-")}.json`
    );
    file.create({ overwrite: true });
    file.write(bytes);
    await this.shareFile(file);
  }

  async saveSafetyCopy(document: ProgressBackupDocument): Promise<void> {
    const bytes = encodeBackup(document);
    const directory = new Directory(Paths.document, "progress-backups");
    directory.create({ idempotent: true });
    const file = new File(directory, SAFETY_COPY_NAME);
    file.create({ overwrite: true });
    file.write(bytes);
  }

  async hasSafetyCopy(): Promise<boolean> {
    return new File(Paths.document, "progress-backups", SAFETY_COPY_NAME).exists;
  }

  async shareSafetyCopy(): Promise<void> {
    const file = new File(Paths.document, "progress-backups", SAFETY_COPY_NAME);
    if (!file.exists) {
      throw new Error("No previous progress backup is available");
    }
    await this.shareFile(file);
  }

  private async shareFile(file: File): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("File sharing is unavailable on this device");
    }
    await Sharing.shareAsync(file.uri, {
      dialogTitle: "Save progress backup",
      mimeType: "application/json",
      UTI: "public.json",
    });
  }
}

function encodeBackup(document: ProgressBackupDocument): Uint8Array {
  const bytes = strToU8(JSON.stringify(document));
  if (bytes.byteLength > MAX_BACKUP_BYTES) {
    throw new Error("The progress backup exceeds the supported file size");
  }
  return bytes;
}
