import { basicAuthHeader, getCloudinaryConfig } from "./_lib/cloudinary";

type CloudinaryResource = {
  public_id?: string;
  secure_url?: string;
  created_at?: string;
  format?: string;
};

type CloudinaryListPayload = {
  resources?: CloudinaryResource[];
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export const onRequestGet = async (context: { env: Record<string, string | undefined> }) => {
  try {
    const config = getCloudinaryConfig(context.env);
    const prefix = `${config.folder}/`;
    const endpoint = new URL(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload`,
    );
    endpoint.searchParams.set("prefix", prefix);
    endpoint.searchParams.set("max_results", "100");

    const response = await fetch(endpoint, {
      headers: {
        Authorization: basicAuthHeader(config.apiKey, config.apiSecret),
      },
    });

    if (!response.ok) {
      const details = await response.text();
      return json(502, { error: `Cloudinary list failed: ${response.status}`, details });
    }

    const payload = (await response.json()) as CloudinaryListPayload;
    const images = (payload.resources ?? [])
      .filter((resource) => Boolean(resource.secure_url && resource.public_id))
      .map((resource) => {
        const publicId = resource.public_id ?? "";
        const baseName = publicId.split("/").pop() ?? publicId;
        const ext = resource.format ? `.${resource.format}` : "";
        const hasExt = ext ? baseName.toLowerCase().endsWith(ext.toLowerCase()) : false;

        return {
          name: hasExt ? baseName : `${baseName}${ext}`,
          updatedAt: resource.created_at ?? "",
          url: resource.secure_url as string,
        };
      });

    images.sort((a, b) => {
      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    });

    return json(200, { images });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown gallery list error";
    return json(500, { error: message });
  }
};
