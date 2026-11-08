const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/core/coach-core");
const tf = require("@tensorflow/tfjs");

test("toda a base tem músculo, padrão e equipamento válidos", () => {
  for (const e of core.EXERCISES) {
    assert.ok(core.MUSCLES.includes(e.muscle), e.name);
    assert.ok(core.PATTERNS[e.pattern], e.name);
    assert.ok(core.EQUIP[e.equip], e.name);
  }
});

test("limitação de ombro bloqueia desenvolvimento e sugere alternativa sem estresse alto no ombro", () => {
  assert.equal(core.check("Desenvolvimento com halteres sentado", ["ombro"]).allowed, false);
  const out = core.substitute(tf, "Desenvolvimento com halteres sentado", ["ombro"]);
  assert.ok(out.alternatives.length > 0);
  for (const a of out.alternatives) assert.ok(core.lookup(a.name).stress.o < 2, a.name);
});

test("equipamento em casa só devolve halteres, elástico ou peso corporal", () => {
  const out = core.substitute(tf, "Puxada alta pegada aberta", ["casa"]);
  assert.ok(out.alternatives.length > 0);
  for (const a of out.alternatives) assert.ok(["H", "P", "E"].includes(core.lookup(a.name).equip), a.name);
});

test("hérnia de disco bloqueia carga axial e flexão com carga", () => {
  assert.equal(core.check("Agachamento livre", ["hernia"]).allowed, false);
  assert.equal(core.check("Abdominal no cabo", ["hernia"]).allowed, false);
  assert.equal(core.check("Leg press horizontal", ["hernia"]).allowed, true);
});

test("gestação bloqueia exercícios deitado de costas", () => {
  assert.equal(core.check("Supino reto com halteres", ["gestacao"]).allowed, false);
  assert.equal(core.check("Supino reto na máquina", ["gestacao"]).allowed, true);
});

test("exercício fora da base é inferido pelo nome", () => {
  const x = core.lookup("Rosca concentrada com halter");
  assert.equal(x.muscle, "Bíceps");
  assert.equal(x.equip, "H");
});

test("professor: iniciante com 3 dias recebe Full Body ou Upper/Lower", () => {
  const t = core.teacher({ years: 0.5, days: 3, minutes: 60, goal: "hipertrofia", pref: 0, limits: [] }, { sleep: 7.5, energy: 3.5, adherence: 0.9, progress: 1, fatigue: 0, pain: 0 }, 0);
  assert.ok(["fb", "ul"].includes(core.PROGRAM_IDS[t.program]));
});

test("professor: hipertensão leva a intensidade moderada", () => {
  const t = core.teacher({ years: 6, days: 5, minutes: 75, goal: "hipertrofia", pref: 0.8, limits: ["hipertensao"] }, { sleep: 8, energy: 4.5, adherence: 0.9, progress: 0.5, fatigue: 0, pain: 0 }, 0);
  assert.equal(core.INT_IDS[t.intensity], "mod");
});

test("sinais do histórico: detecta queda em 3 sessões como fadiga", () => {
  const s = (date, kg) => ({ date, prog: "abcdef", day: "A", sets: { a1: [{ kg, reps: 8, done: true }] }, notes: { sleep: 6, energy: 2 } });
  const sig = core.signalsFromSessions([s("2026-10-20", 100), s("2026-10-27", 95), s("2026-11-03", 90)], { today: "2026-11-08", active: "abcdef", plannedPerWeek: 6 });
  assert.equal(sig.fatigue, 1);
  assert.ok(sig.progress < 0);
  assert.equal(sig.sleep, 6);
});

test("modelo treina rápido e a inferência com e sem TensorFlow coincide", async () => {
  const data = core.generateDataset(800, 3, 0.35);
  const { model } = await core.trainModel(tf, data, { epochs: 3 });
  const W = core.exportWeights(model), x = data.X[0];
  const a = await core.predictProbs(tf, model, x), b = core.forwardPlain(W, x);
  a[0].forEach((v, i) => assert.ok(Math.abs(v - b[0][i]) < 1e-3));
  const rec = core.assemble(a, { years: 3, days: 4, minutes: 60, goal: "hipertrofia", limits: [] }, {});
  assert.equal(rec.programs.length, core.PROGRAM_IDS.length);
});
