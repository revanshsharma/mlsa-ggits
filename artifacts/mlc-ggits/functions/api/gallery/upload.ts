import { getCloudinaryConfig, safeExt, signCloudinaryParams } from "./_lib/cloudinary";

type UploadPayload = {
  public_id?: string;
  secure_url?: string;
  created_at?: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export const onRequestPut = async (context: {
  request: Request;
  env: Record<string, string | undefined>;
}) => {
  try {
    const config = getCloudinaryConfig(context.env);
    const request = context.request;
    const fileNameHeader = request.headers.get("x-file-name") || "photo.jpg";
    const contentTypeHeader = request.headers.get("content-type") || "image/jpeg";
    const ext = safeExt(fileNameHeader);

    const raw = await request.arrayBuffer();
    if (raw.byteLength === 0) {
      return json(400, { error: "Empty upload body" });
    }

    const bytes = new Uint8Array(raw);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${crypto.randomUUID()}.${ext}`;
    const signature = await signCloudinaryParams(
      {
        folder: config.folder,
        public_id: publicId,
        timestamp,
      },
      config.apiSecret,
    );

    const body = new URLSearchParams({
      api_key: config.apiKey,
      file: `data:${contentTypeHeader};base64,${btoa(binary)}`,
      folder: config.folder,
      public_id: publicId,
      timestamp: String(timestamp),
      signature,
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    if (!response.ok) {
      const details = await response.text();
      return json(502, { error: `Cloudinary upload failed: ${response.status}`, details });
    }

    const payload = (await response.json()) as UploadPayload;
    if (!payload.public_id || !payload.secure_url) {
      return json(502, { error: "Cloudinary upload response missing required fields" });
    }

    return json(200, {
      ok: true,
      source: "cloudinary",
      objectPath: payload.public_id,
      url: payload.secure_url,
      updatedAt: payload.created_at ?? new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upload error";
    return json(500, { error: message });
  }
};
