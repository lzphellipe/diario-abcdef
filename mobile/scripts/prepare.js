#!/usr/bin/env node
/*
 * Prepara mobile/www para o app de iPhone:
 *   1. gera o app (scripts/build-app.js);
 *   2. copia app/dist/ios e os ícones para mobile/www.
 *   --demo  inclui demo/demo.js, que cria uma conta de exemplo e percorre as telas sozinho
 *           (usado na CI para gravar o simulador; não use na versão de verdade).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const MOBILE = path.join(__dirname, "..");
const ROOT = path.join(MOBILE, "..");
const WWW = path.join(MOBILE, "www");
const SRC = path.join(ROOT, "app", "dist", "ios");
const demo = process.argv.includes("--demo");

execFileSync(process.execPath, [path.join(ROOT, "scripts", "build-app.js")], { stdio: "inherit" });
fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });
for (const f of fs.readdirSync(SRC)) fs.copyFileSync(path.join(SRC, f), path.join(WWW, f));
for (const f of ["icon-192.png", "apple-touch-icon.png"]) fs.copyFileSync(path.join(ROOT, "app", "pwa", f), path.join(WWW, f));
if (demo) {
  fs.copyFileSync(path.join(MOBILE, "demo", "demo.js"), path.join(WWW, "demo.js"));
  const idx = path.join(WWW, "index.html");
  const html = fs.readFileSync(idx, "utf8");
  if (!html.includes('<script src="config.js"></script>')) throw new Error("index.html sem config.js");
  fs.writeFileSync(idx, html.replace('<script src="config.js"></script>', '<script src="demo.js"></script>\n<script src="config.js"></script>'));
}
console.log(`mobile/www pronto${demo ? " (modo demonstração)" : ""}.`);
