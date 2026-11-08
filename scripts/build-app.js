#!/usr/bin/env node
/*
 * Gera o app em um único arquivo HTML.
 * Junta app/src/index.html com o núcleo de IA (backend/src/core/coach-core.js)
 * e os pesos do modelo (backend/model/weights.json).
 *
 *   node scripts/build-app.js           grava app/dist/index.html (página completa) e app/dist/artifact.html (corpo, para publicar como artefato)
 *   node scripts/build-app.js --check   falha se app/dist estiver desatualizado (usado na CI)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "app", "src", "index.html");
const CORE = path.join(ROOT, "backend", "src", "core", "coach-core.js");
const WEIGHTS = path.join(ROOT, "backend", "model", "weights.json");
const DIST = path.join(ROOT, "app", "dist");

const RESET = [
  ":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}",
  "body{margin:0;font:14px system-ui,-apple-system,'Segoe UI',sans-serif}",
  "img{max-width:100%}",
  "[hidden]{display:none!important}"
].join("");

function build() {
  const tpl = fs.readFileSync(SRC, "utf8");
  const core = fs.readFileSync(CORE, "utf8");
  const weights = JSON.stringify(JSON.parse(fs.readFileSync(WEIGHTS, "utf8")));
  for (const mark of ["/*@@COACH_CORE@@*/", "/*@@COACH_WEIGHTS@@*/"]) {
    if (tpl.split(mark).length !== 2) throw new Error(`Marcador ${mark} deve aparecer exatamente uma vez em ${SRC}`);
  }
  if (core.includes("</script")) throw new Error("coach-core.js não pode conter </script");
  const body = tpl.replace("/*@@COACH_CORE@@*/", () => core).replace("/*@@COACH_WEIGHTS@@*/", () => weights);
  const page = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${RESET}</style></head><body>${body}</body></html>\n`;
  return { "index.html": page, "artifact.html": body };
}

const out = build();
if (process.argv.includes("--check")) {
  const stale = Object.entries(out).filter(([f, c]) => !fs.existsSync(path.join(DIST, f)) || fs.readFileSync(path.join(DIST, f), "utf8") !== c);
  if (stale.length) {
    console.error(`app/dist desatualizado (${stale.map(s => s[0]).join(", ")}). Rode: node scripts/build-app.js`);
    process.exit(1);
  }
  console.log("app/dist está atualizado.");
} else {
  fs.mkdirSync(DIST, { recursive: true });
  for (const [f, c] of Object.entries(out)) fs.writeFileSync(path.join(DIST, f), c);
  console.log(`Gerado app/dist/index.html (${Math.round(out["index.html"].length / 1024)} KB) e app/dist/artifact.html`);
}
