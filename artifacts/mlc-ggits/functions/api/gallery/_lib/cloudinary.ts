type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

type CloudinaryEnv = {
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_FOLDER?: string;
};

export function getCloudinaryConfig(env: CloudinaryEnv): CloudinaryConfig {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim() ?? "";
  const folder = (env.CLOUDINARY_FOLDER?.trim() || "mlsa-ggits/gallery").replace(/^\/+|\/+$/g, "");

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are missing.");
  }

  return { cloudName, apiKey, apiSecret, folder };
}

export function safeExt(fileName: string): string {
  const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "jpg";
}

export async function signCloudinaryParams(
  params: Record<string, string | number>,
  apiSecret: string,
): Promise<string> {
  const raw = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const payload = new TextEncoder().encode(`${raw}${apiSecret}`);
  const digest = await crypto.subtle.digest("SHA-1", payload);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function basicAuthHeader(apiKey: string, apiSecret: string): string {
  return `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
}
