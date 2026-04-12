import express, { Router, type Request } from "express";
import { ObjectStorageService, objectStorageClient } from "../lib/objectStorage";
import { randomUUID } from "crypto";
import path from "path";
import { mkdir, readdir, stat, writeFile } from "fs/promises";

const router = Router();
const storage = new ObjectStorageService();

const SIDECAR = "http://127.0.0.1:1106";
const LOCAL_GALLERY_DIR = process.env.LOCAL_GALLERY_DIR || path.resolve(process.cwd(), ".local-gallery");

function parseGCSPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  const bucketName = parts[1] ?? "";
  const objectName = parts.slice(2).join("/");
  return { bucketName, objectName };
}

function getGalleryParts(): { bucketName: string; prefix: string } | null {
  try {
    const dir = storage.getPrivateObjectDir();
    const { bucketName, objectName } = parseGCSPath(dir);
    const prefix = objectName ? `${objectName}/gallery/` : "gallery/";
    return { bucketName, prefix };
  } catch {
    return null;
  }
}

async function ensureLocalGalleryDir(): Promise<void> {
  await mkdir(LOCAL_GALLERY_DIR, { recursive: true });
}

function safeExt(fileName: string): string {
  const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "jpg";
}

function toAbsoluteApiUrl(req: Request, apiPath: string): string {
  const host = req.get("host");
  if (!host) {
    return apiPath;
  }
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedProtocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto;
  const isLocalHost = host.includes("localhost") || host.startsWith("127.0.0.1");
  const protocol = forwardedProtocol || (isLocalHost ? "http" : "https");
  return `${protocol}://${host}${apiPath}`;
}

async function listLocalGalleryImages(req: Request) {
  await ensureLocalGalleryDir();
  const files = await readdir(LOCAL_GALLERY_DIR);
  const rows = await Promise.all(
    files.map(async (name) => {
      const filePath = path.join(LOCAL_GALLERY_DIR, name);
      const fileStat = await stat(filePath);
      return {
        name,
        url: toAbsoluteApiUrl(req, `/api/gallery/local/${encodeURIComponent(name)}`),
        updatedAt: fileStat.mtime.toISOString(),
      };
    })
  );

  rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return rows;
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
    const ext = safeExt(fileName);
    const objectId = randomUUID();
    const galleryParts = getGalleryParts();
    
    if (galleryParts) {
      try {
        const { bucketName, prefix } = galleryParts;
        const objectName = `${prefix}${objectId}.${ext}`;
        const uploadURL = await signUrl(bucketName, objectName, "PUT", 900);
        const objectPath = `/objects/${bucketName}/${objectName}`;
        res.json({ uploadURL, objectPath, contentType });
        return;
      } catch (err) {
        req.log.warn({ err }, "Object storage unavailable; falling back to local upload");
      }
    }
    
    await ensureLocalGalleryDir();
    const localName = `${objectId}.${ext}`;
    const uploadURL = toAbsoluteApiUrl(req, `/api/gallery/local-upload/${localName}`);
    res.json({
      uploadURL,
      objectPath: `/api/gallery/local/${localName}`,
      contentType,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate gallery upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.put(
  "/gallery/upload",
  express.raw({ type: "*/*", limit: "20mb" }),
  async (req, res) => {
    try {
      const body = req.body;
      const data = Buffer.isBuffer(body)
        ? body
        : body instanceof Uint8Array
          ? Buffer.from(body)
          : typeof body === "string"
            ? Buffer.from(body)
            : Buffer.from([]);

      if (data.length === 0) {
        res.status(400).json({ error: "Empty upload body" });
        return;
      }

      const fileNameHeader = req.header("x-file-name") || "photo.jpg";
      const contentTypeHeader = req.header("content-type") || "image/jpeg";
      const ext = safeExt(fileNameHeader);
      const objectId = randomUUID();

      const galleryParts = getGalleryParts();
      if (galleryParts) {
        try {
          const { bucketName, prefix } = galleryParts;
          const objectName = `${prefix}${objectId}.${ext}`;
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          await file.save(data, {
            contentType: contentTypeHeader,
            resumable: false,
          });

          res.status(200).json({
            ok: true,
            source: "object-storage",
            objectPath: `/objects/${bucketName}/${objectName}`,
          });
          return;
        } catch (err) {
          req.log.warn({ err }, "Object storage upload failed; falling back to local");
        }
      }

      await ensureLocalGalleryDir();
      const localName = `${objectId}.${ext}`;
      const outputPath = path.join(LOCAL_GALLERY_DIR, localName);
      await writeFile(outputPath, data);

      res.status(200).json({
        ok: true,
        source: "local",
        objectPath: `/api/gallery/local/${localName}`,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to upload gallery image");
      res.status(500).json({ error: "Failed to upload image" });
    }
  }
);

router.put(
  "/gallery/local-upload/:fileName",
  express.raw({ type: "*/*", limit: "20mb" }),
  async (req, res) => {
    try {
      await ensureLocalGalleryDir();
      const rawName = req.params.fileName ?? "upload.jpg";
      const ext = safeExt(rawName);
      const safeName = `${path.basename(rawName, path.extname(rawName))}.${ext}`;
      const outputPath = path.join(LOCAL_GALLERY_DIR, safeName);
      const body = req.body;
      const data = Buffer.isBuffer(body)
        ? body
        : body instanceof Uint8Array
          ? Buffer.from(body)
          : typeof body === "string"
            ? Buffer.from(body)
            : Buffer.from([]);
      if (data.length === 0) {
        res.status(400).json({ error: "Empty upload body" });
        return;
      }
      await writeFile(outputPath, data);
      res.status(200).json({ ok: true, name: safeName });
    } catch (err) {
      req.log.error({ err }, "Failed to store local gallery upload");
      res.status(500).json({ error: "Failed to store upload" });
    }
  }
);

router.get("/gallery/local/:fileName", async (req, res) => {
  try {
    const fileName = path.basename(req.params.fileName ?? "");
    const filePath = path.join(LOCAL_GALLERY_DIR, fileName);
    res.sendFile(filePath, {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to serve local gallery image");
    res.status(404).json({ error: "Image not found" });
  }
});

router.get("/gallery/images", async (req, res) => {
  try {
    const galleryParts = getGalleryParts();
    if (!galleryParts) {
      throw new Error("Object storage not configured; using local fallback");
    }
    
    const { bucketName, prefix } = galleryParts;
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
    req.log.warn({ err }, "Object storage unavailable for gallery; using local fallback");
    try {
      const images = await listLocalGalleryImages(req);
      res.status(200).json({ images });
    } catch (localErr) {
      req.log.error({ err: localErr }, "Failed to list local gallery images");
      res.status(200).json({ images: [] });
    }
  }
});

export default router;
