import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Environment } from "@/config/server-environment";

const DOWNLOAD_TTL_SECONDS = 15 * 60;

function createR2Client() {
  const environment = getR2Environment();
  return new S3Client({
    region: "auto",
    endpoint: `https://${environment.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: environment.R2_ACCESS_KEY_ID,
      secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function createAuthorizedDeckDownload(objectKey: string) {
  const environment = getR2Environment();
  const client = createR2Client();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: environment.R2_BUCKET_NAME,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename="${objectKey.split("/").at(-1)}"`,
      ResponseContentType: "application/octet-stream",
    }),
    { expiresIn: DOWNLOAD_TTL_SECONDS }
  );
  return { url, expiresAt: new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000).toISOString() };
}

export async function readDeckObject(objectKey: string) {
  const environment = getR2Environment();
  const response = await createR2Client().send(
    new GetObjectCommand({ Bucket: environment.R2_BUCKET_NAME, Key: objectKey })
  );
  if (!response.Body) {
    throw new Error("Deck object has no body");
  }
  return response.Body.transformToByteArray();
}
