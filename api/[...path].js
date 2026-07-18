let appPromise;

export default async function handler(req, res) {
  appPromise ??= import("../artifacts/api-server/dist/app.mjs").then((mod) => mod.default);
  const app = await appPromise;
  return app(req, res);
}
