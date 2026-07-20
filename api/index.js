let appPromise;

function normalizeApiUrl(req) {
  const rawPath = req.query?.path;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
  const cleanPath = typeof path === "string" && path.length > 0
    ? path.replace(/^\/+/, "")
    : "";

  const originalUrl = req.url || "";
  const queryIndex = originalUrl.indexOf("?");
  const searchParams = new URLSearchParams(
    queryIndex >= 0 ? originalUrl.slice(queryIndex + 1) : "",
  );
  searchParams.delete("path");
  const publicQuery = searchParams.toString();
  const search = publicQuery ? `?${publicQuery}` : "";

  if (req.query && typeof req.query === "object") {
    Reflect.deleteProperty(req.query, "path");
  }
  req.url = cleanPath ? `/api/${cleanPath}${search}` : `/api${search}`;
}

export default async function handler(req, res) {
  appPromise ??= import("../artifacts/api-server/dist/app.mjs").then((mod) => mod.default);
  const app = await appPromise;
  normalizeApiUrl(req);
  return app(req, res);
}
