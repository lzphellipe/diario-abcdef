/* API do Diário ABCDEF: recomendação de treinos (TensorFlow) e substituição de exercícios por limitação. */
const fs = require("fs");
const path = require("path");
const express = require("express");
const { tf, backend } = require("./tf");
const core = require("./core/coach-core");
const store = require("./model-store");
const { train, FEEDBACK_FILE } = require("./trainer");

const state = { model: null, W: null, metrics: null, training: false };

async function ensureModel() {
  const loaded = store.load(tf);
  if (loaded) { Object.assign(state, loaded); return; }
  console.log("Nenhum modelo salvo; treinando um agora (cerca de 1 minuto)…");
  await retrain();
}
async function retrain() {
  state.training = true;
  try {
    const { model, metrics } = await train(tf, {});
    const W = store.save(model, metrics);
    if (state.model) state.model.dispose();
    Object.assign(state, { model, W, metrics });
  } finally { state.training = false; }
}

/* ---- validação simples ---- */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const num = (v, name, min, max, def) => {
  if (v == null || v === "") { if (def !== undefined) return def; throw new HttpError(400, `Informe ${name}.`); }
  const x = Number(v); if (!isFinite(x) || x < min || x > max) throw new HttpError(400, `${name} deve estar entre ${min} e ${max}.`);
  return x;
};
function parseLimits(v) {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new HttpError(400, "limits deve ser uma lista de ids.");
  const bad = v.filter(id => !core.LIMMAP[id]);
  if (bad.length) throw new HttpError(400, `Limitação desconhecida: ${bad.join(", ")}. Veja GET /api/limitations.`);
  return v;
}
function parseProfile(p) {
  if (!p || typeof p !== "object") throw new HttpError(400, "Envie profile.");
  if (p.goal != null && !core.GOALS.includes(p.goal)) throw new HttpError(400, `goal deve ser ${core.GOALS.join(", ")}.`);
  if (p.current != null && p.current !== "" && !core.PROGRAM_IDS.includes(p.current)) throw new HttpError(400, "current não é um programa conhecido.");
  return {
    years: num(p.years, "years", 0, 60), days: num(p.days, "days", 1, 7), minutes: num(p.minutes, "minutes", 15, 240, 60),
    goal: p.goal || "hipertrofia", pref: num(p.pref, "pref", -1, 1, 0), limits: parseLimits(p.limits), current: p.current || null,
    plannedPerWeek: num(p.plannedPerWeek, "plannedPerWeek", 1, 7, num(p.days, "days", 1, 7))
  };
}

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || "*";
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

app.get("/health", (req, res) => res.json({ ok: true, backend, modelo: !!state.model, treinando: state.training, versao: core.VERSION, metricas: state.metrics }));

app.get("/api/limitations", (req, res) => res.json(core.LIMITATIONS));

app.get("/api/exercises", (req, res) => {
  const q = core.norm(req.query.q || ""), m = req.query.muscle;
  const list = core.EXERCISES.filter(e => (!q || core.norm(e.name).includes(q)) && (!m || e.muscle === m))
    .map(e => ({ name: e.name, muscle: e.muscle, pattern: core.PATTERNS[e.pattern], equipment: core.EQUIP[e.equip], stress: e.stress, axial: e.axial, pressure: e.bp }));
  res.json({ total: list.length, exercises: list });
});

/* Recomenda programa, volume e intensidade.
 * Corpo: { profile:{years,days,minutes,goal,pref,limits,current,plannedPerWeek}, sessions?:[…], signals?:{…}, today?:"AAAA-MM-DD" } */
app.post("/api/recommend", wrap(async (req, res) => {
  if (!state.model) throw new HttpError(503, "O modelo ainda está sendo treinado. Tente em instantes.");
  const profile = parseProfile(req.body.profile);
  let signals = req.body.signals;
  if (!signals) {
    const sessions = Array.isArray(req.body.sessions) ? req.body.sessions : [];
    signals = core.signalsFromSessions(sessions, { active: profile.current, plannedPerWeek: profile.plannedPerWeek, today: req.body.today });
  }
  const out = await core.recommend(tf, state.model, state.W, profile, signals);
  out.features = core.features(profile, signals);
  res.json(out);
}));

/* Alternativas para um exercício. Corpo: { exercise, limits?:[], n? } */
app.post("/api/substitutions", (req, res, next) => {
  try {
    const name = String(req.body.exercise || "").trim();
    if (!name) throw new HttpError(400, "Informe exercise.");
    const out = core.substitute(tf, name, parseLimits(req.body.limits), { n: num(req.body.n, "n", 1, 30, 8) });
    if (!out.target) throw new HttpError(404, `Não reconheci "${name}". Veja GET /api/exercises.`);
    res.json(out);
  } catch (e) { next(e); }
});

/* Confere uma sessão inteira contra as limitações e sugere a melhor troca de cada exercício bloqueado.
 * Corpo: { exercises:["Supino reto com barra", …], limits:[…] } */
app.post("/api/check", (req, res, next) => {
  try {
    if (!Array.isArray(req.body.exercises)) throw new HttpError(400, "exercises deve ser uma lista de nomes.");
    const limits = parseLimits(req.body.limits);
    const items = req.body.exercises.slice(0, 60).map(n => {
      const st = core.check(String(n), limits), item = { exercise: n, allowed: st.allowed, reasons: st.reasons, cautions: st.cautions };
      if (!st.allowed) { const s = core.substitute(tf, String(n), limits, { n: 3 }); item.suggestions = s.alternatives.map(a => a.name); }
      return item;
    });
    res.json({ limits, blocked: items.filter(i => !i.allowed).length, items });
  } catch (e) { next(e); }
});

/* Registra a escolha do usuário para o próximo treino do modelo.
 * Corpo: { profile, signals, program, volume?, intensity? } */
app.post("/api/feedback", (req, res, next) => {
  try {
    const profile = parseProfile(req.body.profile), signals = req.body.signals || {};
    if (!core.PROGRAM_IDS.includes(req.body.program)) throw new HttpError(400, "program inválido.");
    const rec = { at: new Date().toISOString(), features: core.features(profile, signals), program: req.body.program, volume: core.VOL_IDS.includes(req.body.volume) ? req.body.volume : "pad", intensity: core.INT_IDS.includes(req.body.intensity) ? req.body.intensity : "pad" };
    fs.mkdirSync(path.dirname(FEEDBACK_FILE), { recursive: true });
    fs.appendFileSync(FEEDBACK_FILE, JSON.stringify(rec) + "\n");
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

/* Retreina com os feedbacks acumulados. Protegido por ADMIN_TOKEN. */
app.post("/api/train", wrap(async (req, res) => {
  if (!process.env.ADMIN_TOKEN || req.get("x-admin-token") !== process.env.ADMIN_TOKEN) throw new HttpError(403, "Defina ADMIN_TOKEN no servidor e envie o cabeçalho x-admin-token.");
  if (state.training) throw new HttpError(409, "Já existe um treino em andamento.");
  await retrain();
  res.json({ ok: true, metricas: state.metrics });
}));

/* Pesos atuais no formato que o app carrega. */
app.get("/api/model/weights", (req, res) => { if (!state.W) return res.status(503).json({ erro: "Modelo indisponível." }); res.json(state.W); });

app.use((err, req, res, next) => {
  const status = err.status || (err.type === "entity.parse.failed" ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ erro: status === 400 && err.type === "entity.parse.failed" ? "JSON inválido." : err.message || "Erro interno." });
});

async function start(port) {
  await ensureModel();
  return new Promise(resolve => { const srv = app.listen(port, () => resolve(srv)); });
}
if (require.main === module) {
  const port = +(process.env.PORT || 3000);
  start(port).then(() => console.log(`API do Diário ABCDEF em http://localhost:${port} (${backend})`)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = { app, start, state };
