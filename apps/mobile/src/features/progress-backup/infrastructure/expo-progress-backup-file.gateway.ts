import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { strToU8 } from "fflate";

import type { ProgressBackupFileGateway } from "@/features/progress-backup/application/progress-backup-file.gateway";
import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";

import {
  ProgressBackupTooLargeError,
  ProgressBackupValidationError,
} from "@/features/progress-backup/domain/progress-backup.errors";

const MAX_BACKUP_BYTES = 64 * 1024 * 1024;
const SAFETY_COPY_DIRECTORY = "progress-backups";

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
      throw new ProgressBackupValidationError();
    }
    const file = new File(asset.uri);
    if (file.size === null || file.size > MAX_BACKUP_BYTES) {
      throw new ProgressBackupTooLargeError();
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

  async saveSafetyCopy(document: ProgressBackupDocument): Promise<string> {
    const bytes = encodeBackup(document);
    const directory = new Directory(Paths.document, SAFETY_COPY_DIRECTORY);
    directory.create({ idempotent: true });
    const fileName = `before-progress-restore-${Crypto.randomUUID()}.json`;
    const file = new File(directory, fileName);
    try {
      file.create();
      file.write(bytes);
      return fileName;
    } catch (cause) {
      if (file.exists) {
        file.delete();
      }
      throw cause;
    }
  }

  async hasSafetyCopy(fileName: string): Promise<boolean> {
    return new File(Paths.document, SAFETY_COPY_DIRECTORY, fileName).exists;
  }

  async shareSafetyCopy(fileName: string): Promise<void> {
    const file = new File(Paths.document, SAFETY_COPY_DIRECTORY, fileName);
    if (!file.exists) {
      throw new Error("No previous progress backup is available");
    }
    await this.shareFile(file);
  }

  async deleteSafetyCopy(fileName: string): Promise<void> {
    const file = new File(Paths.document, SAFETY_COPY_DIRECTORY, fileName);
    if (file.exists) {
      file.delete();
    }
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
    throw new ProgressBackupTooLargeError();
  }
  return bytes;
}
