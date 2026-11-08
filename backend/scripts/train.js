#!/usr/bin/env node
/* npm run train — treina o modelo e grava model/weights.json (usado pelo servidor e pelo app). */
const { tf, backend } = require("../src/tf");
const { train } = require("../src/trainer");
const store = require("../src/model-store");

(async () => {
  const epochs = +(process.env.EPOCHS || 40), samples = +(process.env.SAMPLES || 15000);
  console.log(`Treinando com ${backend}: ${samples} amostras, ${epochs} épocas…`);
  const { model, metrics } = await train(tf, { epochs, samples, log: m => process.stdout.write(m + "\r") });
  store.save(model, metrics);
  console.log("\n" + JSON.stringify(metrics, null, 2));
  console.log(`Modelo salvo em ${store.WEIGHTS_FILE}`);
})().catch(e => { console.error(e); process.exit(1); });
