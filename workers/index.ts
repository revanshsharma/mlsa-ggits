export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "mlc-ggits-worker" });
    }

    return new Response("mlc-ggits worker is running", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
