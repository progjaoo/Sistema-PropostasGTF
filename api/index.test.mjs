import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadNormalizeApiUrl() {
  const source = fs
    .readFileSync(new URL("./index.js", import.meta.url), "utf8")
    .replace("export default async function handler", "async function handler");
  const context = { URLSearchParams };

  vm.runInNewContext(
    `${source}\nglobalThis.normalizeApiUrl = normalizeApiUrl;`,
    context,
  );

  return context.normalizeApiUrl;
}

test("remove o parametro interno path ao normalizar a URL da Vercel", () => {
  const normalizeApiUrl = loadNormalizeApiUrl();
  const req = {
    query: {
      path: "proposal-types",
      active: "true",
    },
    url: "/api/index.js?path=proposal-types&active=true",
  };

  normalizeApiUrl(req);

  assert.equal(req.url, "/api/proposal-types?active=true");
});

test("preserva filtros repetidos sem expor o parametro interno path", () => {
  const normalizeApiUrl = loadNormalizeApiUrl();
  const req = {
    query: {
      path: ["proposals", "progress-board"],
    },
    url: "/api/index.js?path=proposals%2Fprogress-board&status=DRAFT&stationId=a&stationId=b",
  };

  normalizeApiUrl(req);

  assert.equal(
    req.url,
    "/api/proposals/progress-board?status=DRAFT&stationId=a&stationId=b",
  );
});
