#!/usr/bin/env node
/*
 * Gera o app a partir de app/src/index.html, do núcleo de IA (backend/src/core/coach-core.js)
 * e dos pesos do modelo (backend/model/weights.json).
 *
 * Saídas em app/dist:
 *   artifact.html   corpo da página, para publicar como artefato no Claude
 *   index.html      página completa, para abrir no navegador (dados no navegador, sem login)
 *   pwa/            app instalável para o GitHub Pages: login com Google, cadastro, offline, dados no aparelho
 *
 *   node scripts/build-app.js           gera tudo
 *   node scripts/build-app.js --check   falha se app/dist estiver desatualizado (usado na CI)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "app", "src", "index.html");
const CORE = path.join(ROOT, "backend", "src", "core", "coach-core.js");
const WEIGHTS = path.join(ROOT, "backend", "model", "weights.json");
const PWA_SRC = path.join(ROOT, "app", "pwa");
const DIST = path.join(ROOT, "app", "dist");

const RESET = [
  ":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}",
  "body{margin:0;font:14px system-ui,-apple-system,'Segoe UI',sans-serif}",
  "img{max-width:100%}",
  "[hidden]{display:none!important}"
].join("");
const MARKS = ["/*@@COACH_CORE@@*/", "/*@@COACH_WEIGHTS@@*/", "<!--@@HOST@@-->"];

function body(hostTags) {
  const tpl = fs.readFileSync(SRC, "utf8");
  const core = fs.readFileSync(CORE, "utf8");
  const weights = JSON.stringify(JSON.parse(fs.readFileSync(WEIGHTS, "utf8")));
  for (const m of MARKS) if (tpl.split(m).length !== 2) throw new Error(`Marcador ${m} deve aparecer exatamente uma vez em ${SRC}`);
  if (core.includes("</script")) throw new Error("coach-core.js não pode conter </script");
  return tpl.replace(MARKS[0], () => core).replace(MARKS[1], () => weights).replace(MARKS[2], () => hostTags);
}
const page = (b, extraHead) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${extraHead || ""}<style>${RESET}</style></head><body>${b}</body></html>\n`;

function build() {
  const out = {};
  const plain = body("");
  out["artifact.html"] = plain;
  out["index.html"] = page(plain);
  const head = '<meta name="theme-color" content="#111112"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Diário"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" type="image/png" sizes="192x192" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">';
  out["pwa/index.html"] = page(body('<script src="config.js"></script>\n<script src="pwa.js"></script>'), head);
  for (const f of fs.readdirSync(PWA_SRC)) out["pwa/" + f] = fs.readFileSync(path.join(PWA_SRC, f));
  out["pwa/.nojekyll"] = "";
  return out;
}
const same = (a, b) => Buffer.isBuffer(a) || Buffer.isBuffer(b) ? Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0 : a === b;

const out = build();
if (process.argv.includes("--check")) {
  const stale = Object.entries(out).filter(([f, c]) => { const p = path.join(DIST, f); return !fs.existsSync(p) || !same(fs.readFileSync(p, Buffer.isBuffer(c) ? undefined : "utf8"), c); });
  if (stale.length) { console.error(`app/dist desatualizado (${stale.map(s => s[0]).join(", ")}). Rode: node scripts/build-app.js`); process.exit(1); }
  console.log("app/dist está atualizado.");
} else {
  for (const [f, c] of Object.entries(out)) { const p = path.join(DIST, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); }
  console.log(`Gerado app/dist: artifact.html, index.html e pwa/ (${Object.keys(out).filter(f => f.startsWith("pwa/")).length} arquivos)`);
}
