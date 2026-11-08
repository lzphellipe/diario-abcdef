/* Treino: dados sintéticos rotulados pelo "professor" + feedback real do usuário (peso maior). */
const fs = require("fs");
const path = require("path");
const core = require("./core/coach-core");

const FEEDBACK_FILE = path.join(__dirname, "..", "data", "feedback.jsonl");

function readFeedback() {
  if (!fs.existsSync(FEEDBACK_FILE)) return [];
  return fs.readFileSync(FEEDBACK_FILE, "utf8").split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
}

function evaluate(tf, model, n, seed) {
  const test = core.generateDataset(n, seed, 0);
  const out = tf.tidy(() => model.predict(tf.tensor2d(test.X)).map(t => t.arraySync()));
  const argmax = a => a.indexOf(Math.max(...a));
  let p1 = 0, p3 = 0, v = 0, i = 0;
  out[0].forEach((row, k) => {
    const order = row.map((x, j) => [x, j]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    if (order[0] === test.Y[k]) p1++;
    if (order.slice(0, 3).includes(test.Y[k])) p3++;
    if (argmax(out[1][k]) === test.V[k]) v++;
    if (argmax(out[2][k]) === test.I[k]) i++;
  });
  return { amostras: n, programa_top1: +(p1 / n).toFixed(3), programa_top3: +(p3 / n).toFixed(3), volume: +(v / n).toFixed(3), intensidade: +(i / n).toFixed(3) };
}

async function train(tf, opts) {
  const o = Object.assign({ samples: 15000, epochs: 40, seed: 42, log: () => {} }, opts || {});
  const data = core.generateDataset(o.samples, o.seed, 0.35);
  const fb = readFeedback().filter(f => Array.isArray(f.features) && f.features.length === core.INPUT_DIM && core.PROGRAM_IDS.includes(f.program));
  // Cada feedback real entra 5 vezes: pesa mais que um exemplo sintético. (tfjs ainda não aceita sampleWeight.)
  fb.forEach(f => {
    for (let k = 0; k < 5; k++) {
      data.X.push(f.features); data.Y.push(core.PROGRAM_IDS.indexOf(f.program));
      data.V.push(Math.max(0, core.VOL_IDS.indexOf(f.volume || "pad"))); data.I.push(Math.max(0, core.INT_IDS.indexOf(f.intensity || "pad")));
    }
  });
  const t0 = Date.now();
  const { model, history } = await core.trainModel(tf, data, {
    epochs: o.epochs,
    onEpoch: (ep, logs) => o.log(`época ${ep + 1}/${o.epochs} · perda ${logs.loss.toFixed(3)} · validação ${logs.val_loss.toFixed(3)}`)
  });
  const metrics = {
    treinado_em: new Date().toISOString(), segundos: Math.round((Date.now() - t0) / 1000), amostras_sinteticas: o.samples,
    feedbacks: fb.length, epocas: o.epochs, perda_final: +history.loss[history.loss.length - 1].toFixed(4),
    concordancia_com_regras: evaluate(tf, model, 1500, 7)
  };
  return { model, metrics };
}
module.exports = { train, evaluate, readFeedback, FEEDBACK_FILE };
