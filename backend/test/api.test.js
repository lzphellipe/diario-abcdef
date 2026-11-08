const test = require("node:test");
const assert = require("node:assert/strict");
const { start } = require("../src/server");

let srv, base;
test.before(async () => { srv = await start(0); base = `http://127.0.0.1:${srv.address().port}`; });
test.after(() => srv && srv.close());
const post = (p, body) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("GET /health", async () => {
  const r = await fetch(base + "/health"); const j = await r.json();
  assert.equal(r.status, 200); assert.equal(j.modelo, true);
});

test("POST /api/recommend com histórico", async () => {
  const sessions = [{ date: "2026-11-02", prog: "abcdef", day: "A", sets: { a1: [{ kg: 100, reps: 8, done: true }] }, notes: { sleep: 7.5, energy: 4 } }];
  const r = await post("/api/recommend", { today: "2026-11-08", profile: { years: 6, days: 6, minutes: 80, goal: "hipertrofia", pref: 0.2, limits: [], current: "abcdef" }, sessions });
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.programs.length, 12);
  assert.ok(Math.abs(j.programs.reduce((s, p) => s + p.prob, 0) - 1) < 0.01);
  assert.ok(["red", "pad", "alto"].includes(j.volume.id));
});

test("POST /api/recommend valida a entrada", async () => {
  const r = await post("/api/recommend", { profile: { years: 3, days: 9 } });
  assert.equal(r.status, 400);
});

test("POST /api/substitutions respeita limitações", async () => {
  const r = await post("/api/substitutions", { exercise: "Supino reto com barra", limits: ["ombro", "so_maquinas"] });
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.status.allowed, false);
  assert.ok(j.alternatives.length > 0);
  j.alternatives.forEach(a => assert.ok(["máquina", "cabo", "Smith"].includes(a.equip)));
});

test("POST /api/check aponta exercícios bloqueados com sugestões", async () => {
  const r = await post("/api/check", { exercises: ["Agachamento livre", "Cadeira extensora"], limits: ["hernia"] });
  const j = await r.json();
  assert.equal(j.blocked, 1);
  assert.ok(j.items[0].suggestions.length > 0);
});

test("limitação desconhecida devolve 400", async () => {
  const r = await post("/api/substitutions", { exercise: "Peck deck", limits: ["xyz"] });
  assert.equal(r.status, 400);
});
