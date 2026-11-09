/*
 * pwa.js — camada da versão instalável (GitHub Pages) do Diário ABCDEF.
 * Login com Google, cadastro no primeiro uso, sessão offline, arquivos no IndexedDB,
 * backup e exclusão de dados. Tudo fica no aparelho: nada é enviado a servidores.
 * Expõe window.DiarioHost, que o app usa no lugar dos recursos do Claude.
 */
(function () {
  "use strict";
  const CFG = window.DIARIO_CONFIG || {};
  const CLIENT_ID = (CFG.googleClientId || "").trim();
  const LOCAL_HOSTS = ["localhost", "127.0.0.1", ""];
  const IS_LOCAL = LOCAL_HOSTS.includes(location.hostname) || location.protocol === "file:";
  const SESSION_KEY = "diario-session";
  const dataKey = sub => "diario-abcdef-v1:" + sub;
  const profileKey = sub => "diario-profile:" + sub;

  const ls = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- Service worker ---------------- */
  const swReady = ("serviceWorker" in navigator && location.protocol !== "file:")
    ? navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).catch(() => null)
    : Promise.resolve(null);

  /* ---------------- Arquivos (IndexedDB) ---------------- */
  let dbP = null;
  function idb() {
    if (!dbP) dbP = new Promise((res, rej) => {
      const r = indexedDB.open("diario-files", 1);
      r.onupgradeneeded = () => { const s = r.result.createObjectStore("files", { keyPath: "id" }); s.createIndex("sub", "sub"); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbP;
  }
  async function tx(mode, fn) {
    const db = await idb();
    return new Promise((res, rej) => { const t = db.transaction("files", mode), st = t.objectStore("files"); let out; Promise.resolve(fn(st)).then(v => { out = v; }); t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error("abort")); });
  }
  const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
  const blobUrl = id => "_blob/" + id;
  let current = null;

  const assets = {
    async upload(blob) {
      if (!current) throw Object.assign(new Error("Sem sessão"), { code: "not_granted" });
      if (blob.size > 25 * 1024 * 1024) throw Object.assign(new Error("Arquivo grande demais (máximo 25 MB)."), { code: "too_large" });
      const id = newId(), type = blob.type || "application/octet-stream";
      await tx("readwrite", st => st.put({ id, sub: current.sub, type, name: blob.name || "", size: blob.size, at: Date.now(), blob }));
      return { id, url: blobUrl(id), sizeBytes: blob.size, contentType: type };
    },
    async list() {
      const all = await tx("readonly", st => reqP(st.index("sub").getAll(current.sub)));
      return { assets: all.map(f => ({ id: f.id, url: blobUrl(f.id), sizeBytes: f.size, contentType: f.type })), usage: { bytes: all.reduce((a, f) => a + f.size, 0) } };
    },
    async delete(id) { await tx("readwrite", st => st.delete(id)); }
  };
  async function filesOf(sub) { return tx("readonly", st => reqP(st.index("sub").getAll(sub))); }
  async function deleteFilesOf(sub) { const all = await filesOf(sub); await tx("readwrite", st => { all.forEach(f => st.delete(f.id)); }); }
  const toDataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  const fromDataUrl = async u => (await fetch(u)).blob();

  /* ---------------- Downloads ---------------- */
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data], { type: /\.csv$/i.test(filename) ? "text/csv;charset=utf-8" : /\.json$/i.test(filename) ? "application/json" : "text/plain;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
  };

  /* ---------------- Interface de login e cadastro ---------------- */
  const css = `
  .gate{position:fixed;inset:0;z-index:50;background:#111112;color:#fff;overflow-y:auto;font-family:Lato,system-ui,sans-serif;padding:calc(28px + env(safe-area-inset-top,0px)) max(20px,env(safe-area-inset-right,0px)) calc(28px + env(safe-area-inset-bottom,0px)) max(20px,env(safe-area-inset-left,0px))}
  .gate .in{max-width:440px;margin:0 auto;display:grid;gap:18px}
  .gate .mark{width:56px;height:56px;border-radius:16px;background:#fff;display:grid;place-items:center}
  .gate h1{font-size:32px;font-weight:900;line-height:1.1;margin:0;letter-spacing:-.01em;text-wrap:balance}
  .gate p{margin:0;color:#9B9BA1;font-size:16px;line-height:1.5}
  .gate .card{background:#1C1C1E;border-radius:16px;padding:20px;display:grid;gap:14px}
  .gate label{display:grid;gap:6px;font-size:13px;font-weight:700;color:#9B9BA1}
  .gate input[type=text],.gate input[type=number]{height:48px;border:0;border-radius:12px;background:#2A2A2D;color:#fff;padding:0 14px;font-size:17px;width:100%;box-sizing:border-box;font-family:inherit}
  .gate .row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  .gate .chk{display:grid;grid-template-columns:22px 1fr;gap:10px;align-items:start;font-weight:400;font-size:14px;color:#D9D9DE;line-height:1.45}
  .gate .chk input{width:20px;height:20px;margin:1px 0 0;accent-color:#3DD47A}
  .gate .btn{height:50px;border:0;border-radius:25px;background:#fff;color:#111;font-weight:900;font-size:16px;cursor:pointer;width:100%;font-family:inherit}
  .gate .btn.ghost{background:#2A2A2D;color:#fff}
  .gate .err{color:#FF6B6B;font-size:14px;min-height:1em}
  .gate .who{display:flex;gap:12px;align-items:center}
  .gate .who img,.gate .who .ini{width:44px;height:44px;border-radius:50%;background:#2A2A2D;display:grid;place-items:center;font-weight:900;flex:none;object-fit:cover}
  .gate .who b{display:block;color:#fff}
  .gate .who span{color:#9B9BA1;font-size:14px}
  .gate .gbtn{min-height:44px;display:flex;justify-content:center}
  .gate .small{font-size:13px;color:#6E6E75}
  .gate code{background:#2A2A2D;padding:1px 6px;border-radius:6px;color:#D9D9DE}
  .gate :focus-visible{outline:2px solid #fff;outline-offset:2px}
  @media (max-width:380px){.gate .row{grid-template-columns:1fr}}`;
  const DUMBBELL = '<svg viewBox="0 0 24 24" width="30" height="30" fill="#111" aria-hidden="true"><rect x="1.5" y="9" width="3" height="6" rx="1"/><rect x="4.5" y="6.5" width="3.5" height="11" rx="1.2"/><rect x="16" y="6.5" width="3.5" height="11" rx="1.2"/><rect x="19.5" y="9" width="3" height="6" rx="1"/><rect x="8" y="10.8" width="8" height="2.4" rx=".6"/></svg>';
  let gate = null;
  function showGate(html) {
    if (!document.getElementById("pwa-css")) { const s = document.createElement("style"); s.id = "pwa-css"; s.textContent = css; document.head.appendChild(s); }
    if (!gate) { gate = document.createElement("div"); gate.className = "gate"; gate.setAttribute("role", "dialog"); gate.setAttribute("aria-modal", "true"); document.body.appendChild(gate); }
    gate.innerHTML = `<div class="in">${html}</div>`;
    gate.scrollTop = 0;
    const f = gate.querySelector("input,button"); if (f) setTimeout(() => f.focus(), 50);
    return gate;
  }
  function hideGate() { if (gate) { gate.remove(); gate = null; } }

  function decodeJwt(t) {
    const p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(p.padEnd(p.length + (4 - p.length % 4) % 4, "="));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
  }
  let gisP = null;
  function loadGis() {
    if (!gisP) gisP = new Promise((res, rej) => { if (window.google && google.accounts && google.accounts.id) return res(); const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = () => res(); s.onerror = () => rej(new Error("gis")); document.head.appendChild(s); });
    return gisP;
  }

  function loginScreen() {
    return new Promise(resolve => {
      const intro = `<span class="mark">${DUMBBELL}</span><h1>Diário ABCDEF</h1><p>Treinos, evolução, nutrição e acompanhamento num só lugar. Seus dados ficam guardados só neste aparelho.</p>`;
      if (!CLIENT_ID) {
        showGate(`${intro}<div class="card"><p><b style="color:#fff">Login com Google ainda não configurado.</b> Crie um Client ID OAuth (aplicativo da Web) no Google Cloud Console e coloque em <code>app/pwa/config.js</code>.</p>${IS_LOCAL ? `<button type="button" class="btn ghost" id="dev">Entrar em modo de teste</button><p class="small">Disponível só em localhost, para desenvolvimento.</p>` : ""}</div>`);
        const d = gate.querySelector("#dev");
        if (d) d.onclick = () => resolve({ sub: "local-dev", name: "Usuário de teste", email: "teste@localhost", picture: "" });
        return;
      }
      showGate(`${intro}<div class="card"><p>Entre com sua conta Google para começar. Usamos só o seu nome, e-mail e foto para identificar seu perfil neste aparelho.</p><div class="gbtn" id="gbtn"><span class="small">Carregando o botão do Google…</span></div><p class="err" id="gerr" role="alert"></p></div><p class="small">Depois do primeiro login o app abre mesmo sem internet.</p>`);
      loadGis().then(() => {
        google.accounts.id.initialize({
          client_id: CLIENT_ID, auto_select: true, cancel_on_tap_outside: false, use_fedcm_for_prompt: true,
          callback: r => {
            try { const p = decodeJwt(r.credential); if (p.aud !== CLIENT_ID || (p.exp && p.exp * 1000 < Date.now() - 60000)) throw new Error("token"); resolve({ sub: "g-" + p.sub, name: p.name || "", email: p.email || "", picture: p.picture || "" }); }
            catch (e) { const g = gate && gate.querySelector("#gerr"); if (g) g.textContent = "Não foi possível concluir o login. Tente de novo."; }
          }
        });
        const el = gate.querySelector("#gbtn"); el.innerHTML = "";
        google.accounts.id.renderButton(el, { theme: "filled_black", size: "large", shape: "pill", text: "continue_with", locale: "pt-BR", width: Math.min(360, el.clientWidth || 320) });
        google.accounts.id.prompt();
      }).catch(() => { const g = gate && gate.querySelector("#gerr"); if (g) g.textContent = "Sem conexão com o Google. Conecte-se à internet para o primeiro login."; });
    });
  }

  function onboarding(user, prev) {
    return new Promise(resolve => {
      const p = prev || {}, first = !prev;
      const avatar = user.picture ? `<img src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer">` : `<span class="ini">${esc((user.name || "?").trim().charAt(0).toUpperCase())}</span>`;
      showGate(`<h1>${first ? "Complete seu cadastro" : "Editar cadastro"}</h1><p>${first ? "Esses dados ajustam as metas de nutrição, a recomendação de treino e o histórico de peso." : "Atualize seus dados. Mudanças de peso também entram no histórico."}</p>
        <form class="card" id="ob" novalidate>
          <div class="who">${avatar}<div><b>${esc(user.name || "Sem nome")}</b><span>${esc(user.email || "")}</span></div></div>
          <label for="ob-name">Nome completo<input type="text" id="ob-name" autocomplete="name" value="${esc(p.name || user.name || "")}" required></label>
          <div class="row">
            <label for="ob-age">Idade<input type="number" id="ob-age" inputmode="numeric" min="14" max="100" step="1" value="${esc(p.age || "")}" required></label>
            <label for="ob-weight">Peso (kg)<input type="number" id="ob-weight" inputmode="decimal" min="30" max="300" step="0.1" value="${esc(p.weight || "")}" required></label>
            <label for="ob-height">Altura (cm)<input type="number" id="ob-height" inputmode="numeric" min="120" max="230" step="1" value="${esc(p.height || "")}" required></label>
          </div>
          ${first ? `<label class="chk"><input type="checkbox" id="ob-ok"><span>Entendo que meus dados (incluindo saúde, exames e fotos) ficam guardados só neste aparelho, que posso exportar um backup e apagar tudo quando quiser, e que o app não substitui orientação profissional.</span></label>` : ""}
          <p class="err" id="ob-err" role="alert"></p>
          <button type="submit" class="btn">${first ? "Começar" : "Salvar"}</button>
          ${first ? "" : `<button type="button" class="btn ghost" id="ob-cancel">Cancelar</button>`}
        </form>`);
      const f = gate.querySelector("#ob"), err = gate.querySelector("#ob-err");
      const cancel = gate.querySelector("#ob-cancel"); if (cancel) cancel.onclick = () => { hideGate(); resolve(null); };
      f.onsubmit = e => {
        e.preventDefault();
        const name = f.querySelector("#ob-name").value.trim().replace(/\s+/g, " ");
        const num = id => parseFloat(String(f.querySelector(id).value).replace(",", "."));
        const age = num("#ob-age"), weight = num("#ob-weight"), height = num("#ob-height");
        if (name.split(" ").length < 2) { err.textContent = "Informe nome e sobrenome."; return; }
        if (!(age >= 14 && age <= 100)) { err.textContent = "Idade deve estar entre 14 e 100 anos."; return; }
        if (!(weight >= 30 && weight <= 300)) { err.textContent = "Peso deve estar entre 30 e 300 kg."; return; }
        if (!(height >= 120 && height <= 230)) { err.textContent = "Altura deve estar entre 120 e 230 cm."; return; }
        const ok = f.querySelector("#ob-ok"); if (ok && !ok.checked) { err.textContent = "Marque a confirmação para continuar."; return; }
        resolve({ name, age: Math.round(age), weight: Math.round(weight * 10) / 10, height: Math.round(height), consentAt: p.consentAt || new Date().toISOString(), createdAt: p.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
      };
    });
  }

  /* ---------------- Fluxo ---------------- */
  async function ready() {
    let user = ls.get(SESSION_KEY);
    if (!user || !user.sub) { user = await loginScreen(); ls.set(SESSION_KEY, user); }
    let profile = ls.get(profileKey(user.sub));
    if (!profile) { profile = await onboarding(user, null); ls.set(profileKey(user.sub), profile); }
    hideGate();
    current = user;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    swReady.then(() => {});
    return { storageKey: dataKey(user.sub), user, profile };
  }
  async function editProfile() {
    const prev = ls.get(profileKey(current.sub));
    const p = await onboarding(current, prev);
    if (!p) return null;
    ls.set(profileKey(current.sub), p); hideGate();
    return p;
  }
  function signOut() {
    ls.del(SESSION_KEY);
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    location.reload();
  }
  async function deleteAll() {
    const sub = current.sub;
    ls.del(dataKey(sub)); ls.del(profileKey(sub)); ls.del(SESSION_KEY);
    try { await deleteFilesOf(sub); } catch (e) {}
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    location.reload();
  }
  async function exportBackup() {
    const sub = current.sub, files = await filesOf(sub).catch(() => []);
    const out = { app: "diario-abcdef", formato: 1, exportadoEm: new Date().toISOString(), conta: { email: current.email, name: current.name }, perfil: ls.get(profileKey(sub)), dados: ls.get(dataKey(sub)), arquivos: [] };
    for (const f of files) out.arquivos.push({ id: f.id, type: f.type, name: f.name, at: f.at, data: await toDataUrl(f.blob) });
    const stamp = new Date().toISOString().slice(0, 10);
    await downloads.save({ filename: `diario-backup-${stamp}.json`, data: new Blob([JSON.stringify(out)], { type: "application/json" }) });
    return { files: files.length };
  }
  async function importBackup(file) {
    let b;
    try { b = JSON.parse(await file.text()); } catch (e) { throw new Error("O arquivo não é um backup válido."); }
    if (!b || b.app !== "diario-abcdef" || !b.dados) throw new Error("O arquivo não é um backup do Diário ABCDEF.");
    const sub = current.sub;
    await deleteFilesOf(sub).catch(() => {});
    for (const f of b.arquivos || []) { const blob = await fromDataUrl(f.data); await tx("readwrite", st => st.put({ id: f.id, sub, type: f.type, name: f.name || "", size: blob.size, at: f.at || Date.now(), blob })); }
    if (!ls.set(dataKey(sub), b.dados)) throw new Error("Sem espaço no aparelho para restaurar o backup.");
    if (b.perfil) ls.set(profileKey(sub), b.perfil);
    location.reload();
  }

  window.DiarioHost = {
    kind: "pwa", ready, editProfile, signOut, deleteAll, exportBackup, importBackup, assets, downloads, blobUrl,
    get user() { return current; },
    get profile() { return current ? ls.get(profileKey(current.sub)) : null; }
  };
})();
