/*
 * demo.js — modo demonstração do app de iPhone, usado só na CI do simulador.
 * Cria uma conta de exemplo com 5 semanas de treinos fictícios, faz o cadastro e
 * percorre as telas sozinho para a gravação. Incluído por: node scripts/prepare.js --demo
 */
(function () {
  "use strict";
  const KEY = "diario-abcdef-v1:ios-local";
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const rnd = (x, step) => Math.round(x / step) * step;

  function seed() {
    if (localStorage.getItem("diario-demo-seeded")) return;
    const LOADS = { a1: [80, 7], a2: [32, 9], a3: [12.5, 13], a4: [60, 11], a5: [7.5, 15], a6: [25, 12],
      b1: [15, 7], b2: [80, 9], b3: [70, 11], b4: [30, 11], b5: [25, 15], b6: [14, 11], b7: [40, 12],
      c1: [120, 6], c2: [140, 10], c3: [300, 12], c4: [60, 11], c5: [55, 12], c6: [100, 10],
      d1: [30, 7], d2: [7.5, 14], d3: [40, 16], d4: [35, 11], d5: [80, 10], d6: [15, 13],
      e1: [40, 9], e2: [40, 9], e3: [30, 11], e4: [10, 12], e5: [16, 11], e6: [40, 11], e7: [70, 11], e8: [36, 10], e9: [null, 12],
      f1: [110, 7], f2: [140, 10], f3: [60, 17], f4: [45, 11], f5: [20, 10], f6: [55, 13], f7: [60, 15] };
    const SETS = { a1: 3, a2: 3, a3: 2, a4: 7, a5: 3, a6: 3, b1: 3, b2: 3, b3: 3, b4: 7, b5: 3, b6: 3, b7: 3, c1: 3, c2: 3, c3: 2, c4: 7, c5: 4, c6: 4, d1: 3, d2: 3, d3: 3, d4: 7, d5: 3, d6: 2, e1: 3, e2: 3, e3: 3, e4: 3, e5: 2, e6: 7, e7: 3, e8: 2, e9: 3, f1: 3, f2: 3, f3: 2, f4: 7, f5: 3, f6: 2, f7: 4 };
    const DAY = ["", "A", "B", "C", "D", "E", "F"];
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const sessions = {}, docs = {};
    const setsFor = (k, f) => { const sets = {}; for (const [id, [kg, reps]] of Object.entries(LOADS)) { if (id[0] !== k.toLowerCase()) continue; const step = kg >= 40 ? 2.5 : kg >= 10 ? 1 : 0.5;
      sets[id] = Array.from({ length: SETS[id] }, (_, i) => ({ kg: kg == null ? null : rnd(kg * f * (i ? 0.92 : 1), step), reps: reps + (i ? 1 : 0) - (SETS[id] === 7 && i > 3 ? 2 : 0), done: true })); } return sets; };
    for (let back = 35; back >= 1; back--) {
      const d = new Date(today); d.setDate(d.getDate() - back); const k = DAY[d.getDay()]; if (!k || back === 16) continue;
      const week = Math.min(5, Math.floor((35 - back) / 7) + 1), date = iso(d);
      const cardio = back % 2 ? [{ id: "c" + back, type: back % 3 ? "esteira" : "bike", int: "leve", min: 20 + (back % 4) * 5, km: back % 3 ? 2.6 + (back % 4) * 0.3 : null, kcal: 180 + (back % 4) * 40, hr: 128 + back % 9 }] : [];
      sessions["s-" + date + "-" + k] = { kind: "session", date, prog: "abcdef", day: k, week, sets: setsFor(k, 1 + (week - 1) * 0.015), cardio,
        notes: { sleep: [7.5, 7, 8, 6.5, 7.5, 8, 7][back % 7], energy: [4, 4, 5, 3, 4, 5, 4][back % 7] }, finishedAt: date + "T20:40:00.000Z", updatedAt: date + "T20:40:00.000Z" };
    }
    const W = [80.6, 80.9, 81.1, 81.0, 81.5, 81.8, 82.0, 82.2], waist = [82, 82, 82.5, 82.5, 82.5, 83, 83, 83], arm = [38.2, 38.3, 38.5, 38.6, 38.8, 39, 39.1, 39.3];
    W.forEach((w, i) => { const d = new Date(today); d.setDate(d.getDate() - (8 - i) * 7); const date = iso(d); docs["b-" + date] = { kind: "body", date, weight: w, waist: waist[i], arm: arm[i], photos: {}, updatedAt: date + "T08:00:00.000Z" }; });
    const R = (name, value, unit, min, max, refText) => ({ name, value: String(value), unit, min, max, refText });
    docs["x-demo1"] = { kind: "exam", updatedAt: "2026-10-28T10:00:00.000Z", data: { id: "demo1", date: "2026-10-28", type: "Exames de sangue", notes: "", next: "", files: [], results: [
      R("Hemoglobina", 15.8, "g/dL", 13.5, 17.5, "13,5 a 17,5"), R("Hematócrito", 47.2, "%", 40, 50, "40 a 50"), R("HDL", 38, "mg/dL", 40, null, "> 40"), R("LDL", 121, "mg/dL", null, 130, "< 130"),
      R("TGP (ALT)", 47, "U/L", null, 41, "< 41"), R("CK (creatinoquinase)", 612, "U/L", null, 190, "< 190"), R("Glicose em jejum", 84, "mg/dL", 70, 99, "70 a 99"), R("Vitamina D (25-OH)", 36, "ng/mL", 30, 100, "30 a 100")] } };
    localStorage.setItem(KEY, JSON.stringify({ sessions, docs, settings: { week: 5, limits: ["ombro"], profile: { years: "5", days: "6", minutes: 75, goal: "hipertrofia", pref: 0.3 } } }));
    localStorage.setItem("diario-demo-seeded", "1");
  }
  try { seed(); } catch (e) { console.log("DEMO seed falhou", e); }

  /* ---------------- roteiro ---------------- */
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, max = 30000) { const t = Date.now(); while (Date.now() - t < max) { const v = fn(); if (v) return v; await sleep(200); } return null; }
  async function type(el, text) { el.focus(); if (el.type === "number") { await sleep(400); el.value = text; el.dispatchEvent(new Event("input", { bubbles: true })); await sleep(400); el.blur(); return; } el.value = ""; for (const ch of String(text)) { el.value += ch; el.dispatchEvent(new Event("input", { bubbles: true })); await sleep(90); } el.dispatchEvent(new Event("change", { bubbles: true })); el.blur(); }
  const scrollTo = async (sel, off = 12) => { const el = typeof sel === "string" ? $(sel) : sel; if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - off, behavior: "smooth" }); await sleep(900); };
  const go = async h => { location.hash = h; await sleep(500); window.scrollTo(0, 0); };
  const step = (name) => console.log("DEMO_STEP " + name);

  async function run() {
    const local = await until(() => $("#local"));
    if (local) { step("login"); await sleep(5000); local.click(); }
    const form = await until(() => $("#ob"));
    if (form) {
      step("cadastro"); await sleep(1500);
      await type($("#ob-name"), "Rafael Souza"); await type($("#ob-age"), "29"); await type($("#ob-weight"), "82.4"); await type($("#ob-height"), "178");
      $("#ob-ok").checked = true; await sleep(2500); form.querySelector("button[type=submit]").click();
    }
    await until(() => !$(".gate") && $("#hello") && $("#hello").textContent !== "Olá");
    await sleep(2500); step("inicio"); await sleep(5000);
    if (!$("#exlist > li")) { const p = $("#pills button"); if (p) p.click(); await sleep(800); }
    step("treino"); await scrollTo("#exlist > li"); await sleep(5000);
    await scrollTo("#adjust", 120); await sleep(4000);
    step("cardio"); await scrollTo("#cardio");
    const add = $("[data-cadd]"); if (add) { add.click(); await sleep(800);
      const box = $("#cardio [data-cid]"), id = box && box.dataset.cid;
      if (id) { await type($(`#cf-${id}-min`), "25"); await type($(`#cf-${id}-km`), "3,2"); await type($(`#cf-${id}-kcal`), "310"); await type($(`#cf-${id}-hr`), "136"); } }
    await sleep(3000);
    step("finalizar"); await scrollTo("#finish", 260); await sleep(2000); const fin = $("#fin"); if (fin) fin.click(); await sleep(6000);
    const close = $("[data-sheetclose]"); if (close) close.click(); await sleep(800);
    step("programas"); await go("#programas"); await sleep(5000);
    const head = [...document.querySelectorAll("#v-programas h2")].find(h => /Programas de treino/.test(h.textContent)); if (head) await scrollTo(head); await sleep(3000);
    const car = $("#carousel"); if (car) { car.scrollTo({ left: 700, behavior: "smooth" }); await sleep(3000); }
    step("detalhe"); const sst = $('#carousel [data-prog="sst"]') || $("#carousel [data-prog]"); if (sst) { sst.click(); await sleep(800); window.scrollTo(0, 0); } await sleep(5000);
    await scrollTo("#detail .prose, #detail p", 80); await sleep(4000);
    step("evolucao"); await go("#evolucao"); await sleep(5000);
    const cs = $("[data-sub=cardio]"); if (cs) { cs.click(); step("evolucao-cardio"); await sleep(5000); }
    step("nutricao"); await go("#nutricao"); await sleep(5000);
    step("saude"); await go("#saude"); const ex = $("[data-hsub=saude]"); if (ex) ex.click(); await sleep(5000);
    const v = $("[data-examview]"); if (v) { v.click(); step("exame"); await sleep(5000); const c = $("#sheet-close"); if (c) c.click(); await sleep(600); }
    step("mesociclo"); await go("#mesociclo"); await sleep(5000);
    step("fim"); await go("#inicio"); await sleep(3000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => run()); else run();
})();
