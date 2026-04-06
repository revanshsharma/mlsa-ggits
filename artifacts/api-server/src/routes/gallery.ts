import { Router } from "express";
import { ObjectStorageService, objectStorageClient } from "../lib/objectStorage";
import { randomUUID } from "crypto";

const router = Router();
const storage = new ObjectStorageService();

const SIDECAR = "http://127.0.0.1:1106";

function parseGCSPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  const bucketName = parts[1] ?? "";
  const objectName = parts.slice(2).join("/");
  return { bucketName, objectName };
}

function getGalleryParts(): { bucketName: string; prefix: string } {
  const dir = storage.getPrivateObjectDir();
  const { bucketName, objectName } = parseGCSPath(dir);
  const prefix = objectName ? `${objectName}/gallery/` : "gallery/";
  return { bucketName, prefix };
}

async function signUrl(
  bucketName: string,
  objectName: string,
  method: "PUT" | "GET",
  ttlSec: number
): Promise<string> {
  const res = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Sign URL failed: ${res.status}`);
  const data = await res.json() as { signed_url: string };
  return data.signed_url;
}

router.post("/gallery/upload-url", async (req, res) => {
  try {
    const body = req.body as { contentType?: string; fileName?: string };
    const contentType = body.contentType ?? "image/jpeg";
    const fileName = body.fileName ?? "photo.jpg";
    const ext = fileName.split(".").pop() ?? "jpg";
    const objectId = randomUUID();
    const { bucketName, prefix } = getGalleryParts();
    const objectName = `${prefix}${objectId}.${ext}`;
    const uploadURL = await signUrl(bucketName, objectName, "PUT", 900);
    const objectPath = `/objects/${bucketName}/${objectName}`;
    res.json({ uploadURL, objectPath, contentType });
  } catch (err) {
    req.log.error({ err }, "Failed to generate gallery upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.get("/gallery/images", async (req, res) => {
  try {
    const { bucketName, prefix } = getGalleryParts();
    const bucket = objectStorageClient.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix });

    const images = await Promise.all(
      files
        .filter((f) => f.name !== prefix && f.name.length > prefix.length)
        .map(async (file) => {
          const url = await signUrl(bucketName, file.name, "GET", 3600);
          const name = file.name.split("/").pop() ?? file.name;
          const meta = file.metadata as Record<string, unknown>;
          return { url, name, updatedAt: (meta.updated as string) ?? "" };
        })
    );

    images.sort((a, b) => {
      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    });

    res.json({ images });
  } catch (err) {
    req.log.error({ err }, "Failed to list gallery images");
    res.status(200).json({ images: [] });
  }
});

export default router;
