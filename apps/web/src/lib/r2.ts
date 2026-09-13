import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DOWNLOAD_TTL_SECONDS = 15 * 60;

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function r2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requiredEnvironmentVariable("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnvironmentVariable("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnvironmentVariable("R2_SECRET_ACCESS_KEY"),
    },
  });
}

/** Call only after authenticating the requester and authorizing access to objectKey. */
export async function createAuthorizedDeckDownload(objectKey: string) {
  const url = await getSignedUrl(
    r2Client(),
    new GetObjectCommand({
      Bucket: requiredEnvironmentVariable("R2_BUCKET_NAME"),
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename="${objectKey.split("/").at(-1)}"`,
      ResponseContentType: "application/octet-stream",
    }),
    { expiresIn: DOWNLOAD_TTL_SECONDS },
  );
  return { url, expiresAt: new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000).toISOString() };
}
