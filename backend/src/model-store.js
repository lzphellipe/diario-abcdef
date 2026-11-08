/* Salva e carrega o modelo no disco sem depender do tfjs-node. */
const fs = require("fs");
const path = require("path");
const core = require("./core/coach-core");

const MODEL_DIR = path.join(__dirname, "..", "model");
const WEIGHTS_FILE = path.join(MODEL_DIR, "weights.json");
const META_FILE = path.join(MODEL_DIR, "metrics.json");

function save(model, metrics) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
  const W = core.exportWeights(model);
  fs.writeFileSync(WEIGHTS_FILE, JSON.stringify(W));
  fs.writeFileSync(META_FILE, JSON.stringify(metrics, null, 2));
  return W;
}
function load(tf) {
  if (!fs.existsSync(WEIGHTS_FILE)) return null;
  const W = JSON.parse(fs.readFileSync(WEIGHTS_FILE, "utf8"));
  if (W.inputDim !== core.INPUT_DIM) return null;
  return { W, model: core.modelFromWeights(tf, W), metrics: fs.existsSync(META_FILE) ? JSON.parse(fs.readFileSync(META_FILE, "utf8")) : null };
}
module.exports = { save, load, MODEL_DIR, WEIGHTS_FILE };
