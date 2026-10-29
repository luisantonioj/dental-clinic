import "server-only";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { env, r2Env } from "@/lib/env";

/** Presigned URLs live for 5 minutes. They are never stored or logged. */
const URL_TTL_SECONDS = 5 * 60;

export type Storage = {
  mode: "r2" | "local";
  /** URL the browser PUTs the file body to. */
  uploadUrl(key: string, mime: string, attachmentId: string): Promise<string>;
  /** URL the browser GETs to view or download (R2 only; local files are streamed by the route). */
  downloadUrl(key: string, opts: { filename: string; mime: string; inline: boolean }): Promise<string>;
  /** Size in bytes, or null if the object doesn't exist. */
  size(key: string): Promise<number | null>;
};

function r2(): Storage {
  const cfg = r2Env();
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  return {
    mode: "r2",
    uploadUrl: (key, mime) =>
      getSignedUrl(client, new PutObjectCommand({ Bucket: cfg.bucket, Key: key, ContentType: mime }), {
        expiresIn: URL_TTL_SECONDS,
      }),
    downloadUrl: (key, { filename, mime, inline }) =>
      getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
          ResponseContentType: mime,
          ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
          ResponseCacheControl: "private, max-age=300",
        }),
        { expiresIn: URL_TTL_SECONDS },
      ),
    size: async (key) => {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
        return head.ContentLength ?? 0;
      } catch {
        return null;
      }
    },
  };
}

/** Development fallback when R2 isn't configured: files go to ./.uploads (gitignored). */
const LOCAL_ROOT = path.join(process.cwd(), ".uploads");

export function localPath(key: string): string {
  const resolved = path.resolve(LOCAL_ROOT, key);
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Invalid storage key");
  return resolved;
}

function local(): Storage {
  return {
    mode: "local",
    uploadUrl: async (_key, _mime, attachmentId) => `/api/files/${attachmentId}/content`,
    downloadUrl: async () => {
      throw new Error("Local files are streamed by the route handler");
    },
    size: async (key) => {
      try {
        return (await stat(localPath(key))).size;
      } catch {
        return null;
      }
    },
  };
}

export async function writeLocalFile(key: string, body: ArrayBuffer): Promise<void> {
  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(body));
}

export function readLocalFile(key: string): Promise<Buffer> {
  return readFile(localPath(key));
}

export function getStorage(): Storage {
  const e = env();
  const configured = e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET;
  if (configured) return r2();
  if (e.NODE_ENV === "production") r2Env(); // throws a clear "not configured" error
  return local();
}
