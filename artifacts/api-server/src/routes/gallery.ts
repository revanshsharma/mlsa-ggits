import express, { Router, type Request } from "express";
import { ObjectStorageService, objectStorageClient } from "../lib/objectStorage";
import { createHash, randomUUID } from "crypto";
import path from "path";
import { mkdir, readdir, stat, writeFile } from "fs/promises";

const router = Router();
const storage = new ObjectStorageService();

const SIDECAR = "http://127.0.0.1:1106";
const LOCAL_GALLERY_DIR = process.env.LOCAL_GALLERY_DIR || path.resolve("/tmp/gallery");
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const CLOUDINARY_FOLDER = (process.env.CLOUDINARY_FOLDER || "mlsa-ggits/gallery").replace(/^\/+|\/+$/g, "");

function getCloudinaryConfig(): { cloudName: string; apiKey: string; apiSecret: string; folder: string } | null {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return null;
  }
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
    folder: CLOUDINARY_FOLDER,
  };
}

function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const raw = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${raw}${apiSecret}`).digest("hex");
}

async function uploadToCloudinary(data: Buffer, contentType: string, fileName: string) {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error("Cloudinary not configured");
  }

  const ext = safeExt(fileName);
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${config.folder}/${randomUUID()}.${ext}`;
  const signature = signCloudinaryParams(
    {
      folder: config.folder,
      public_id: publicId,
      timestamp,
    },
    config.apiSecret
  );

  const fileDataUri = `data:${contentType};base64,${data.toString("base64")}`;
  const body = new URLSearchParams({
    api_key: config.apiKey,
    file: fileDataUri,
    folder: config.folder,
    public_id: publicId,
    timestamp: String(timestamp),
    signature,
  });

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} ${errorBody}`);
  }

  const payload = (await response.json()) as {
    public_id?: string;
    secure_url?: string;
    created_at?: string;
  };

  if (!payload.secure_url || !payload.public_id) {
    throw new Error("Cloudinary upload response missing required fields");
  }

  return {
    objectPath: payload.public_id,
    updatedAt: payload.created_at ?? new Date().toISOString(),
    url: payload.secure_url,
  };
}

async function listCloudinaryImages() {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error("Cloudinary not configured");
  }

  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
  const prefix = `${config.folder}/`;
  const endpoint = new URL(`https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload`);
  endpoint.searchParams.set("prefix", prefix);
  endpoint.searchParams.set("max_results", "100");

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Cloudinary list failed: ${response.status} ${errorBody}`);
  }

  const payload = (await response.json()) as {
    resources?: Array<{
      public_id?: string;
      secure_url?: string;
      created_at?: string;
      format?: string;
    }>;
  };

  const images = (payload.resources ?? [])
    .filter((resource) => Boolean(resource.secure_url && resource.public_id))
    .map((resource) => {
      const publicId = resource.public_id ?? "";
      const baseName = publicId.split("/").pop() ?? publicId;
      const ext = resource.format ? `.${resource.format}` : "";
      return {
        name: `${baseName}${ext}`,
        updatedAt: resource.created_at ?? "",
        url: resource.secure_url as string,
      };
    });

  images.sort((a, b) => {
    const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bDate - aDate;
  });

  return images;
}

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
  try {
    await mkdir(LOCAL_GALLERY_DIR, { recursive: true });
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "EACCES") {
      console.warn(`Permission denied accessing ${LOCAL_GALLERY_DIR}. Local gallery will be unavailable.`);
      throw new Error(`LOCAL_GALLERY_DIR not writable: ${LOCAL_GALLERY_DIR}`);
    }
    throw err;
  }
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
    if (getCloudinaryConfig()) {
      const uploadURL = toAbsoluteApiUrl(req, "/api/gallery/upload");
      res.json({ uploadURL, objectPath: "cloudinary", contentType });
      return;
    }

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

      if (getCloudinaryConfig()) {
        try {
          const result = await uploadToCloudinary(data, contentTypeHeader, fileNameHeader);
          res.status(200).json({
            ok: true,
            source: "cloudinary",
            objectPath: result.objectPath,
            url: result.url,
            updatedAt: result.updatedAt,
          });
          return;
        } catch (err) {
          req.log.warn({ err }, "Cloudinary upload failed; trying object storage fallback");
        }
      }

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
  if (getCloudinaryConfig()) {
    try {
      const images = await listCloudinaryImages();
      res.json({ images });
      return;
    } catch (err) {
      req.log.warn({ err }, "Cloudinary unavailable for gallery; trying other backends");
    }
  }

  try {
    const galleryParts = getGalleryParts();
    if (!galleryParts) {
      const images = await listLocalGalleryImages(req);
      res.status(200).json({ images });
      return;
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
