let appPromise;

export default async function handler(req, res) {
  appPromise ??= import("../artifacts/api-server/dist/app.mjs").then((mod) => mod.default);
  const app = await appPromise;
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  return app(req, res);
}
