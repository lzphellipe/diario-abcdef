/*
 * coach-core.js — núcleo compartilhado do Diário ABCDEF.
 * O mesmo arquivo roda no backend Node (require) e dentro do app (script no navegador).
 * Contém: base de exercícios, limitações, extração de sinais do histórico,
 * vetor de entrada do modelo, "professor" baseado em regras de evidência,
 * gerador de dados sintéticos, modelo TensorFlow e motor de substituições.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CoachCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Vocabulários                                                        */
  /* ------------------------------------------------------------------ */
  const MUSCLES = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Quadríceps", "Isquiotibiais", "Glúteos", "Panturrilha", "Abdômen"];
  const PATTERNS = {
    hpush: "empurrar na horizontal", vpush: "empurrar acima da cabeça", fly: "crucifixo", dip: "mergulho",
    hpull: "remada", vpull: "puxada vertical", pullover: "pullover", shrug: "encolhimento",
    squat: "agachamento", lunge: "afundo e unilateral", hinge: "dobradiça de quadril", kext: "extensão de joelho",
    kflex: "flexão de joelho", hipext: "extensão de quadril", abd: "abdução de quadril",
    latraise: "elevação lateral", rear: "deltoide posterior", curl: "flexão de cotovelo", ext: "extensão de cotovelo",
    calf: "panturrilha", core: "core"
  };
  const PATTERN_IDS = Object.keys(PATTERNS);
  const EQUIP = { B: "barra", H: "halteres", M: "máquina", C: "cabo", S: "Smith", P: "peso corporal", E: "elástico" };
  const EQUIP_IDS = Object.keys(EQUIP);
  const JOINTS = { o: "ombro", c: "cotovelo", u: "punho", l: "lombar", j: "joelho", q: "quadril", t: "tornozelo" };
  const JOINT_IDS = Object.keys(JOINTS);

  /* ------------------------------------------------------------------ */
  /* Base de exercícios                                                  */
  /* [nome, músculo, padrão, equipamento, estresse articular, carga axial 0–2,
   *  exigência pressórica 0–2, flags: s=deitado de costas, b=de bruços, f=flexão de coluna com carga]
   * Estresse: letra da articulação + nível (1 moderado, 2 alto). Ex.: "o2c1".
   * ------------------------------------------------------------------ */
  const RAW = [
    // Peito
    ["Supino reto com barra", "Peito", "hpush", "B", "o2c1u1", 0, 2, "s"],
    ["Supino reto com halteres", "Peito", "hpush", "H", "o1c1u1", 0, 1, "s"],
    ["Supino reto na máquina", "Peito", "hpush", "M", "o1c1", 0, 1, ""],
    ["Supino inclinado com barra", "Peito", "hpush", "B", "o2c1u1", 0, 2, "s"],
    ["Supino inclinado com halteres", "Peito", "hpush", "H", "o1c1u1", 0, 1, "s"],
    ["Supino inclinado com halteres (30°)", "Peito", "hpush", "H", "o1c1u1", 0, 1, "s"],
    ["Supino inclinado na máquina", "Peito", "hpush", "M", "o1c1", 0, 1, ""],
    ["Supino inclinado no Smith", "Peito", "hpush", "S", "o2c1u1", 0, 2, "s"],
    ["Supino com halteres pegada neutra", "Peito", "hpush", "H", "c1", 0, 1, "s"],
    ["Supino no chão com halteres", "Peito", "hpush", "H", "c1", 0, 1, "s"],
    ["Chest press na máquina pegada neutra", "Peito", "hpush", "M", "c1", 0, 1, ""],
    ["Flexão de braço", "Peito", "hpush", "P", "o1c1u2", 0, 0, ""],
    ["Flexão de braço com apoio nos halteres", "Peito", "hpush", "P", "o1c1", 0, 0, ""],
    ["Supino com elástico", "Peito", "hpush", "E", "o1c1", 0, 0, ""],
    ["Paralelas com tronco inclinado", "Peito", "dip", "P", "o2c2u1", 0, 1, ""],
    ["Crucifixo no cabo", "Peito", "fly", "C", "o1", 0, 0, ""],
    ["Crucifixo no cabo, polia média", "Peito", "fly", "C", "o1", 0, 0, ""],
    ["Crossover polia alta → baixo", "Peito", "fly", "C", "o1", 0, 0, ""],
    ["Crucifixo inclinado com halteres", "Peito", "fly", "H", "o2c1", 0, 0, "s"],
    ["Peck deck", "Peito", "fly", "M", "o1", 0, 0, ""],
    ["Crucifixo com elástico", "Peito", "fly", "E", "o1", 0, 0, ""],
    // Costas
    ["Barra fixa pronada", "Costas", "vpull", "P", "o2c1u1", 0, 1, ""],
    ["Barra fixa pronada com carga", "Costas", "vpull", "P", "o2c1u1", 0, 2, ""],
    ["Barra fixa supinada fechada", "Costas", "vpull", "P", "o1c2u1", 0, 1, ""],
    ["Puxada alta pegada aberta", "Costas", "vpull", "C", "o2c1", 0, 0, ""],
    ["Puxada alta pegada neutra", "Costas", "vpull", "C", "o1c1", 0, 0, ""],
    ["Puxada neutra", "Costas", "vpull", "C", "o1c1", 0, 0, ""],
    ["Puxada neutra fechada", "Costas", "vpull", "C", "o1c1", 0, 0, ""],
    ["Puxada pegada fechada supinada", "Costas", "vpull", "C", "o1c2u1", 0, 0, ""],
    ["Pulldown pegada fechada", "Costas", "vpull", "C", "o1c1", 0, 0, ""],
    ["Pulldown unilateral", "Costas", "vpull", "C", "o1c1", 0, 0, ""],
    ["Puxada com elástico", "Costas", "vpull", "E", "o1c1", 0, 0, ""],
    ["Remada curvada com barra", "Costas", "hpull", "B", "l2c1u1", 1, 2, ""],
    ["Remada T com apoio", "Costas", "hpull", "M", "c1", 0, 1, ""],
    ["Remada apoiada no peito", "Costas", "hpull", "M", "c1", 0, 0, ""],
    ["Remada cavalinho pegada aberta", "Costas", "hpull", "M", "c1", 0, 1, ""],
    ["Remada baixa no cabo", "Costas", "hpull", "C", "l1c1", 0, 0, ""],
    ["Remada baixa pegada aberta", "Costas", "hpull", "C", "l1c1", 0, 0, ""],
    ["Remada unilateral com halter", "Costas", "hpull", "H", "l1c1", 0, 1, ""],
    ["Remada com halteres apoiada no banco inclinado", "Costas", "hpull", "H", "c1", 0, 0, ""],
    ["Remada unilateral na máquina", "Costas", "hpull", "M", "c1", 0, 0, ""],
    ["Remada invertida (peso corporal)", "Costas", "hpull", "P", "c1u1", 0, 0, ""],
    ["Remada com elástico", "Costas", "hpull", "E", "c1", 0, 0, ""],
    ["Pullover na máquina", "Costas", "pullover", "M", "o2", 0, 0, ""],
    ["Pullover no cabo", "Costas", "pullover", "C", "o1", 0, 0, ""],
    ["Pullover no cabo, braços estendidos", "Costas", "pullover", "C", "o1", 0, 0, ""],
    ["Encolhimento com halteres", "Costas", "shrug", "H", "u1", 1, 1, ""],
    // Ombros
    ["Desenvolvimento com halteres", "Ombros", "vpush", "H", "o2c1", 1, 1, ""],
    ["Desenvolvimento com halteres sentado", "Ombros", "vpush", "H", "o2c1", 1, 1, ""],
    ["Desenvolvimento com barra sentado", "Ombros", "vpush", "B", "o2c1u1", 1, 2, ""],
    ["Desenvolvimento na máquina", "Ombros", "vpush", "M", "o2c1", 0, 1, ""],
    ["Desenvolvimento landmine", "Ombros", "vpush", "B", "o1c1", 0, 1, ""],
    ["Elevação lateral com halteres", "Ombros", "latraise", "H", "o1", 0, 0, ""],
    ["Elevação lateral na máquina", "Ombros", "latraise", "M", "o1", 0, 0, ""],
    ["Elevação lateral no cabo", "Ombros", "latraise", "C", "o1", 0, 0, ""],
    ["Elevação lateral unilateral no cabo", "Ombros", "latraise", "C", "o1", 0, 0, ""],
    ["Elevação lateral com elástico", "Ombros", "latraise", "E", "o1", 0, 0, ""],
    ["Elevação lateral posterior sentado", "Ombros", "rear", "H", "o1", 0, 0, ""],
    ["Crucifixo inverso", "Ombros", "rear", "H", "o1", 0, 0, ""],
    ["Crucifixo inverso no peck deck", "Ombros", "rear", "M", "o1", 0, 0, ""],
    ["Face pull", "Ombros", "rear", "C", "o1", 0, 0, ""],
    ["Crucifixo inverso com elástico", "Ombros", "rear", "E", "o1", 0, 0, ""],
    // Bíceps
    ["Rosca direta com barra", "Bíceps", "curl", "B", "c1u2", 0, 0, ""],
    ["Rosca direta com barra W", "Bíceps", "curl", "B", "c1u1", 0, 0, ""],
    ["Rosca Scott", "Bíceps", "curl", "B", "c2u1", 0, 0, ""],
    ["Rosca Scott na máquina", "Bíceps", "curl", "M", "c1", 0, 0, ""],
    ["Rosca alternada com halteres", "Bíceps", "curl", "H", "c1", 0, 0, ""],
    ["Rosca com halteres alternada", "Bíceps", "curl", "H", "c1", 0, 0, ""],
    ["Rosca inclinada com halteres", "Bíceps", "curl", "H", "o1c1", 0, 0, ""],
    ["Rosca martelo", "Bíceps", "curl", "H", "c1", 0, 0, ""],
    ["Rosca martelo no cabo com corda", "Bíceps", "curl", "C", "c1", 0, 0, ""],
    ["Rosca no cabo com barra reta", "Bíceps", "curl", "C", "c1u2", 0, 0, ""],
    ["Rosca com elástico", "Bíceps", "curl", "E", "c1", 0, 0, ""],
    // Tríceps
    ["Paralelas", "Tríceps", "dip", "P", "o2c2u1", 0, 1, ""],
    ["Tríceps no banco (mergulho)", "Tríceps", "dip", "P", "o2c1u1", 0, 0, ""],
    ["Tríceps testa com barra W", "Tríceps", "ext", "B", "c2u1", 0, 0, "s"],
    ["Tríceps francês no cabo", "Tríceps", "ext", "C", "o1c2", 0, 0, ""],
    ["Tríceps francês unilateral", "Tríceps", "ext", "H", "o1c2", 0, 0, ""],
    ["Tríceps no pulley", "Tríceps", "ext", "C", "c1u1", 0, 0, ""],
    ["Tríceps no pulley com barra V", "Tríceps", "ext", "C", "c1u1", 0, 0, ""],
    ["Tríceps no pulley com corda", "Tríceps", "ext", "C", "c1", 0, 0, ""],
    ["Tríceps coice no cabo", "Tríceps", "ext", "C", "c1", 0, 0, ""],
    ["Tríceps coice com halter", "Tríceps", "ext", "H", "c1", 0, 0, ""],
    ["Tríceps com elástico", "Tríceps", "ext", "E", "c1", 0, 0, ""],
    ["Flexão de braço fechada", "Tríceps", "hpush", "P", "o1c1u2", 0, 0, ""],
    // Quadríceps
    ["Agachamento livre", "Quadríceps", "squat", "B", "j2q2l2t1", 2, 2, ""],
    ["Agachamento livre ou hack", "Quadríceps", "squat", "B", "j2q1l1t1", 2, 2, ""],
    ["Agachamento hack", "Quadríceps", "squat", "M", "j2q1", 1, 1, ""],
    ["Agachamento goblet", "Quadríceps", "squat", "H", "j1q1t1", 1, 1, ""],
    ["Agachamento com elástico", "Quadríceps", "squat", "E", "j1q1", 0, 0, ""],
    ["Leg press 45°", "Quadríceps", "squat", "M", "j2q1l1", 0, 2, ""],
    ["Leg press 45°, pés médios", "Quadríceps", "squat", "M", "j2q1l1", 0, 2, ""],
    ["Leg press horizontal", "Quadríceps", "squat", "M", "j1q1", 0, 1, ""],
    ["Agachamento búlgaro", "Quadríceps", "lunge", "H", "j1q2t1", 1, 1, ""],
    ["Afundo reverso com halteres", "Quadríceps", "lunge", "H", "j1q1t1", 1, 1, ""],
    ["Step-up no banco", "Quadríceps", "lunge", "H", "j1q1", 0, 1, ""],
    ["Cadeira extensora", "Quadríceps", "kext", "M", "j2", 0, 0, ""],
    ["Cadeira extensora reclinada", "Quadríceps", "kext", "M", "j2", 0, 0, ""],
    ["Cadeira extensora com amplitude parcial", "Quadríceps", "kext", "M", "j1", 0, 0, ""],
    // Isquiotibiais
    ["Levantamento terra", "Isquiotibiais", "hinge", "B", "l2q1u1", 2, 2, ""],
    ["Levantamento terra romeno", "Isquiotibiais", "hinge", "B", "l2q1", 1, 2, ""],
    ["Stiff com barra", "Isquiotibiais", "hinge", "B", "l2q1", 1, 2, ""],
    ["Stiff com halteres", "Isquiotibiais", "hinge", "H", "l1q1", 1, 1, ""],
    ["Hiperextensão 45°", "Isquiotibiais", "hinge", "M", "l1q1", 0, 0, ""],
    ["Mesa flexora deitada", "Isquiotibiais", "kflex", "M", "j1", 0, 0, "b"],
    ["Mesa flexora sentada", "Isquiotibiais", "kflex", "M", "j1", 0, 0, ""],
    ["Flexora em pé unilateral", "Isquiotibiais", "kflex", "M", "j1", 0, 0, ""],
    ["Flexora com elástico", "Isquiotibiais", "kflex", "E", "j1", 0, 0, "b"],
    ["Flexão nórdica", "Isquiotibiais", "kflex", "P", "j2", 0, 1, ""],
    // Glúteos
    ["Hip thrust", "Glúteos", "hipext", "B", "q1l1", 0, 1, "s"],
    ["Hip thrust na máquina", "Glúteos", "hipext", "M", "q1", 0, 1, ""],
    ["Elevação pélvica no chão", "Glúteos", "hipext", "P", "q1", 0, 0, "s"],
    ["Glúteo no cabo (coice)", "Glúteos", "hipext", "C", "q1l1", 0, 0, ""],
    ["Cadeira abdutora", "Glúteos", "abd", "M", "q1", 0, 0, ""],
    ["Cadeira abdutora, tronco inclinado", "Glúteos", "abd", "M", "q1", 0, 0, ""],
    ["Abdução com elástico", "Glúteos", "abd", "E", "q1", 0, 0, ""],
    ["Abdução de quadril deitado de lado", "Glúteos", "abd", "P", "", 0, 0, ""],
    // Panturrilha
    ["Panturrilha em pé", "Panturrilha", "calf", "M", "t2", 1, 1, ""],
    ["Panturrilha no leg press", "Panturrilha", "calf", "M", "t1", 0, 1, ""],
    ["Panturrilha sentado", "Panturrilha", "calf", "M", "t1", 0, 0, ""],
    ["Panturrilha unilateral com halter", "Panturrilha", "calf", "H", "t2", 0, 0, ""],
    ["Panturrilha no degrau (peso corporal)", "Panturrilha", "calf", "P", "t1", 0, 0, ""],
    // Abdômen
    ["Abdominal no cabo", "Abdômen", "core", "C", "l1", 0, 1, "f"],
    ["Abdominal na máquina", "Abdômen", "core", "M", "l1", 0, 1, "f"],
    ["Elevação de pernas na barra", "Abdômen", "core", "P", "o1l1q1u1", 0, 1, ""],
    ["Prancha", "Abdômen", "core", "P", "o1", 0, 1, ""],
    ["Pallof press no cabo", "Abdômen", "core", "C", "", 0, 0, ""],
    ["Dead bug", "Abdômen", "core", "P", "", 0, 0, "s"]
  ];
  function parseStress(str) {
    const o = {}; JOINT_IDS.forEach(j => { o[j] = 0; });
    (str.match(/[a-z]\d/g) || []).forEach(t => { o[t[0]] = +t[1]; });
    return o;
  }
  const EXERCISES = RAW.map(r => ({ name: r[0], muscle: r[1], pattern: r[2], equip: r[3], stress: parseStress(r[4]), axial: r[5], bp: r[6], supine: r[7].includes("s"), prone: r[7].includes("b"), flex: r[7].includes("f") }));
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const EXMAP = new Map(EXERCISES.map(e => [norm(e.name), e]));

  /* Inferência para exercícios fora da base (programas criados pelo usuário). */
  const INFER = [
    [/abdominal|crunch/, "Abdômen", "core", "l1"], [/prancha|pallof|dead bug/, "Abdômen", "core", ""],
    [/elevacao de pernas/, "Abdômen", "core", "o1l1"], [/panturrilha|gemeos|soleo/, "Panturrilha", "calf", "t1"],
    [/crucifixo inverso|face pull|posterior/, "Ombros", "rear", "o1"], [/elevacao lateral/, "Ombros", "latraise", "o1"],
    [/desenvolvimento|militar|arnold/, "Ombros", "vpush", "o2c1"], [/encolhimento/, "Costas", "shrug", "u1"],
    [/paralela|mergulho/, "Tríceps", "dip", "o2c2"], [/triceps|frances|coice|testa/, "Tríceps", "ext", "c1"],
    [/rosca/, "Bíceps", "curl", "c1"], [/supino|chest press|flexao de braco/, "Peito", "hpush", "o1c1"],
    [/peck|crucifixo|crossover|voador/, "Peito", "fly", "o1"], [/pullover/, "Costas", "pullover", "o1"],
    [/barra fixa|puxada|pulldown|graviton/, "Costas", "vpull", "o1c1"], [/remada/, "Costas", "hpull", "c1"],
    [/terra|stiff|good morning|hiperextensao/, "Isquiotibiais", "hinge", "l2q1"], [/flexora|nordica/, "Isquiotibiais", "kflex", "j1"],
    [/hip thrust|elevacao pelvica|gluteo/, "Glúteos", "hipext", "q1"], [/abdutora|abducao/, "Glúteos", "abd", "q1"],
    [/extensora/, "Quadríceps", "kext", "j2"], [/bulgaro|afundo|passada|lunge|step/, "Quadríceps", "lunge", "j1q1"],
    [/agachamento|leg press|hack/, "Quadríceps", "squat", "j2q1"]
  ];
  function inferEquip(n) {
    if (/elastico|band/.test(n)) return "E"; if (/smith/.test(n)) return "S"; if (/maquina|mesa|cadeira|peck|leg press|hack|polia|pulley|cabo|puxada|pulldown/.test(n)) return /cabo|polia|pulley|puxada|pulldown/.test(n) ? "C" : "M";
    if (/halter/.test(n)) return "H"; if (/barra|terra|stiff/.test(n)) return "B"; return "P";
  }
  function lookup(name) {
    const n = norm(name);
    const hit = EXMAP.get(n); if (hit) return Object.assign({ known: true }, hit);
    for (const [re, muscle, pattern, st] of INFER) if (re.test(n)) return { name: String(name), muscle, pattern, equip: inferEquip(n), stress: parseStress(st), axial: /agachamento livre|terra/.test(n) ? 2 : 0, bp: /terra|agachamento livre|leg press/.test(n) ? 2 : 1, supine: /supino|testa/.test(n), prone: /deitad/.test(n), flex: /abdominal/.test(n), known: false };
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Limitações                                                          */
  /* ------------------------------------------------------------------ */
  const LIMITATIONS = [
    { id: "ombro", group: "Articulações", name: "Ombro", joint: "o", tip: "Prefira pegada neutra e amplitudes sem dor. Evite empurrar acima da cabeça, mergulhos e pegadas muito abertas." },
    { id: "cotovelo", group: "Articulações", name: "Cotovelo", joint: "c", tip: "Evite extensões de tríceps com o cotovelo muito flexionado acima da cabeça e roscas no banco Scott pesadas; cabos costumam ser mais tolerados." },
    { id: "punho", group: "Articulações", name: "Punho", joint: "u", tip: "Use pegada neutra, halteres ou cabos com corda; evite barra reta e flexões de braço no chão." },
    { id: "lombar", group: "Articulações", name: "Lombar", joint: "l", axial: 2, tip: "Prefira variações com apoio no peito ou nas costas e máquinas guiadas; evite carga axial alta e remadas curvadas livres." },
    { id: "joelho", group: "Articulações", name: "Joelho", joint: "j", tip: "Trabalhe na amplitude sem dor, com controle; leg press horizontal, step-up baixo e extensora parcial costumam ser mais tolerados." },
    { id: "quadril", group: "Articulações", name: "Quadril", joint: "q", tip: "Evite flexão profunda do quadril com carga; ajuste a amplitude e prefira máquinas." },
    { id: "tornozelo", group: "Articulações", name: "Tornozelo", joint: "t", tip: "Evite panturrilha em pé com carga alta e afundos; prefira variações sentadas e máquinas." },
    { id: "so_halteres", group: "Equipamento", name: "Só halteres", allow: ["H", "P"], tip: "Halteres e peso corporal." },
    { id: "so_maquinas", group: "Equipamento", name: "Só máquinas", allow: ["M", "C", "S"], tip: "Máquinas, cabos e Smith." },
    { id: "casa", group: "Equipamento", name: "Em casa", allow: ["H", "P", "E"], tip: "Halteres, elásticos e peso corporal." },
    { id: "sem_barra", group: "Equipamento", name: "Sem barra livre", deny: ["B"], tip: "Tudo menos barra livre." },
    { id: "hipertensao", group: "Condições", name: "Hipertensão", bp: 2, medical: true, tip: "Sem prender a respiração, sem séries até a falha e com intensidade moderada. Treine com a pressão controlada e liberação médica." },
    { id: "hernia", group: "Condições", name: "Hérnia de disco", axial: 1, flex: true, joint: "l", medical: true, tip: "Evite carga axial e flexão da coluna com carga. Siga a orientação do médico ou fisioterapeuta sobre amplitude e progressão." },
    { id: "gestacao", group: "Condições", name: "Gestação", bp: 2, axial: 2, supine: true, prone: true, flex: true, medical: true, tip: "Evite deitar de costas a partir do 2º trimestre, de bruços, prender a respiração e cargas axiais altas. Treine apenas com liberação e acompanhamento do obstetra." },
    { id: "posop", group: "Condições", name: "Pós-operatório", medical: true, tip: "Siga o protocolo do cirurgião e do fisioterapeuta. Marque também a articulação operada para o app filtrar os exercícios." }
  ];
  const LIMMAP = Object.fromEntries(LIMITATIONS.map(l => [l.id, l]));

  /* Verifica se um exercício é compatível com as limitações. */
  function check(exOrName, limitIds) {
    const ex = typeof exOrName === "string" ? lookup(exOrName) : exOrName;
    const out = { allowed: true, reasons: [], cautions: [] };
    if (!ex) return out;
    for (const id of limitIds || []) {
      const L = LIMMAP[id]; if (!L) continue;
      if (L.joint && ex.stress[L.joint] >= 2) { out.allowed = false; out.reasons.push(`alto estresse no ${JOINTS[L.joint]}`); }
      else if (L.joint && ex.stress[L.joint] === 1) out.cautions.push(`estresse moderado no ${JOINTS[L.joint]}`);
      if (L.axial != null && ex.axial >= L.axial) { out.allowed = false; out.reasons.push("carga axial na coluna"); }
      if (L.flex && ex.flex) { out.allowed = false; out.reasons.push("flexão da coluna com carga"); }
      if (L.bp != null && ex.bp >= L.bp) { out.allowed = false; out.reasons.push("alta exigência de pressão (prender a respiração)"); }
      if (L.supine && ex.supine) { out.allowed = false; out.reasons.push("posição deitada de costas"); }
      if (L.prone && ex.prone) { out.allowed = false; out.reasons.push("posição de bruços"); }
      if (L.allow && !L.allow.includes(ex.equip)) { out.allowed = false; out.reasons.push(`precisa de ${EQUIP[ex.equip]}`); }
      if (L.deny && L.deny.includes(ex.equip)) { out.allowed = false; out.reasons.push(`precisa de ${EQUIP[ex.equip]}`); }
    }
    out.reasons = [...new Set(out.reasons)]; out.cautions = [...new Set(out.cautions)];
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Vetores de exercício e substituições (similaridade via TensorFlow)  */
  /* ------------------------------------------------------------------ */
  function exVector(ex) {
    const v = [];
    MUSCLES.forEach(m => v.push(ex.muscle === m ? 3 : 0));
    PATTERN_IDS.forEach(p => v.push(ex.pattern === p ? 2 : 0));
    EQUIP_IDS.forEach(e => v.push(ex.equip === e ? 0.4 : 0));
    JOINT_IDS.forEach(j => v.push(ex.stress[j] * 0.25));
    v.push(ex.axial * 0.25, ex.bp * 0.15);
    return v;
  }
  function cosineScores(tf, target, cands) {
    const a = cands.map(exVector), t = exVector(target);
    if (tf) {
      return tf.tidy(() => {
        const M = tf.tensor2d(a), x = tf.tensor2d([t]);
        const Mn = M.div(M.norm("euclidean", 1, true).add(1e-8));
        const xn = x.div(x.norm("euclidean", 1, true).add(1e-8));
        return Array.from(tf.matMul(Mn, xn, false, true).dataSync());
      });
    }
    const nt = Math.hypot(...t) + 1e-8;
    return a.map(r => r.reduce((s, x, i) => s + x * t[i], 0) / ((Math.hypot(...r) + 1e-8) * nt));
  }
  /* Lista alternativas para um exercício respeitando as limitações. */
  function substitute(tf, name, limitIds, opts) {
    const o = Object.assign({ n: 8, extraNames: [] }, opts || {});
    const target = lookup(name);
    if (!target) return { target: null, alternatives: [], status: check(name, limitIds) };
    const pool = EXERCISES.slice();
    (o.extraNames || []).forEach(n => { if (!EXMAP.has(norm(n))) { const x = lookup(n); if (x) pool.push(x); } });
    const cands = pool.filter(e => norm(e.name) !== norm(target.name) && (e.muscle === target.muscle || e.pattern === target.pattern));
    const sims = cosineScores(tf, target, cands);
    const limJoints = (limitIds || []).map(id => LIMMAP[id] && LIMMAP[id].joint).filter(Boolean);
    const scored = cands.map((e, i) => {
      const st = check(e, limitIds);
      let score = sims[i];
      limJoints.forEach(j => { score -= 0.12 * e.stress[j]; });
      if (e.muscle !== target.muscle) score -= 0.25;
      const reasons = [];
      if (e.muscle === target.muscle && e.pattern === target.pattern) reasons.push("mesmo músculo e movimento");
      else if (e.muscle === target.muscle) reasons.push(`mesmo músculo (${e.muscle.toLowerCase()})`);
      else reasons.push(`mesmo movimento (${PATTERNS[e.pattern]})`);
      limJoints.forEach(j => { if (e.stress[j] < target.stress[j]) reasons.push(`menos carga no ${JOINTS[j]}`); });
      if (e.equip !== target.equip) reasons.push(`usa ${EQUIP[e.equip]}`);
      return { name: e.name, muscle: e.muscle, equip: EQUIP[e.equip], score: Math.round(score * 1000) / 1000, allowed: st.allowed, cautions: st.cautions, blockedBy: st.reasons, reasons };
    }).sort((a, b) => (b.allowed - a.allowed) || (b.score - a.score));
    return { target: { name: target.name, muscle: target.muscle, pattern: PATTERNS[target.pattern], equip: EQUIP[target.equip], known: target.known !== false }, status: check(target, limitIds), alternatives: scored.filter(x => x.allowed).slice(0, o.n), blocked: scored.filter(x => !x.allowed).slice(0, 4) };
  }

  /* ------------------------------------------------------------------ */
  /* Programas (metadados para o modelo)                                 */
  /* ------------------------------------------------------------------ */
  const PROGRAM_IDS = ["abcdef", "fst7", "y3t", "dc", "hd", "gvt", "bg", "ppl", "ul", "fb", "mob", "cardio"];
  // days: frequência que o programa pede; lvl: anos mínimos; mins: duração típica; vol: +1 volume, −1 intensidade;
  // g: aderência a objetivos [hipertrofia, força, saúde]; spine/bp: risco para coluna e pressão; rec: exigência de recuperação; bar: depende de barra/máquinas
  const PMETA = {
    abcdef: { days: 6, lvl: 4, mins: 80, vol: 0.7, g: [1, 0.3, 0], spine: 0.3, bp: 0.3, rec: 0.8, bar: 0.5 },
    fst7: { days: 4, lvl: 1, mins: 75, vol: 0.6, g: [1, 0.2, 0], spine: 0.3, bp: 0.3, rec: 0.6, bar: 0.5 },
    y3t: { days: 4, lvl: 1, mins: 70, vol: 0.5, g: [1, 0.5, 0], spine: 0.4, bp: 0.4, rec: 0.6, bar: 0.6 },
    dc: { days: 3, lvl: 4, mins: 50, vol: -0.8, g: [1, 0.6, 0], spine: 0.7, bp: 0.9, rec: 0.7, bar: 0.9 },
    hd: { days: 2, lvl: 1, mins: 40, vol: -1, g: [0.7, 0.7, 0], spine: 0.5, bp: 0.9, rec: 0.3, bar: 0.8 },
    gvt: { days: 3, lvl: 1, mins: 60, vol: 1, g: [0.9, 0.3, 0], spine: 0.7, bp: 0.5, rec: 0.6, bar: 0.9 },
    bg: { days: 4, lvl: 4, mins: 60, vol: -0.9, g: [0.9, 0.8, 0], spine: 0.8, bp: 0.9, rec: 0.6, bar: 0.9 },
    ppl: { days: 6, lvl: 1, mins: 70, vol: 0.4, g: [1, 0.4, 0], spine: 0.4, bp: 0.3, rec: 0.7, bar: 0.4 },
    ul: { days: 4, lvl: 0, mins: 65, vol: 0.2, g: [0.9, 0.7, 0.1], spine: 0.4, bp: 0.3, rec: 0.4, bar: 0.3 },
    fb: { days: 3, lvl: 0, mins: 75, vol: 0.3, g: [0.8, 0.5, 0.3], spine: 0.3, bp: 0.3, rec: 0.3, bar: 0.2 },
    mob: { days: 1, lvl: 0, mins: 20, vol: 0, g: [0, 0, 1], spine: 0, bp: 0, rec: 0, bar: 0 },
    cardio: { days: 3, lvl: 0, mins: 35, vol: 0, g: [0, 0, 0.9], spine: 0, bp: 0.1, rec: 0.1, bar: 0 }
  };
  const GOALS = ["hipertrofia", "forca", "saude"];
  const VOL_IDS = ["red", "pad", "alto"], INT_IDS = ["mod", "pad", "alta"];

  /* ------------------------------------------------------------------ */
  /* Sinais extraídos do histórico                                        */
  /* sessions: [{date:"AAAA-MM-DD", prog, day, sets:{exId:[{kg,reps,done}]}, notes:{sleep,energy,pain}}] */
  /* ------------------------------------------------------------------ */
  const dayMs = 864e5;
  const toDate = iso => new Date(iso + "T12:00:00");
  const isoAdd = (iso, n) => { const d = toDate(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const e1 = (kg, reps) => (kg != null && reps != null && reps > 0 ? kg * (1 + reps / 30) : null);
  function slope(xs, ys) {
    const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let nu = 0, de = 0; xs.forEach((x, i) => { nu += (x - mx) * (ys[i] - my); de += (x - mx) ** 2; });
    return de ? nu / de : 0;
  }
  function signalsFromSessions(sessions, opts) {
    const o = Object.assign({ today: new Date().toISOString().slice(0, 10), active: null, plannedPerWeek: 4 }, opts || {});
    const list = (sessions || []).filter(s => s && s.date && s.date <= o.today);
    const missing = [];
    const since28 = isoAdd(o.today, -28), since42 = isoAdd(o.today, -42), since35 = isoAdd(o.today, -35);
    const recent = list.filter(s => s.date >= since28);
    const nums = (arr, k) => arr.map(s => s.notes && s.notes[k]).filter(v => typeof v === "number" && isFinite(v));
    const sl = nums(recent, "sleep"), en = nums(recent, "energy");
    const sleep = sl.length ? sl.reduce((a, b) => a + b, 0) / sl.length : (missing.push("sono"), 7);
    const energy = en.length ? en.reduce((a, b) => a + b, 0) / en.length : (missing.push("energia"), 3);
    const trained = new Set(recent.filter(s => Object.values(s.sets || {}).some(a => (a || []).some(x => x && x.done))).map(s => s.date));
    let adherence;
    if (!list.length) { adherence = 0.7; missing.push("adesão"); }
    else adherence = Math.min(1, trained.size / Math.max(1, (o.plannedPerWeek || 4) * 4));
    const pain = recent.filter(s => s.notes && typeof s.notes.pain === "string" && s.notes.pain.trim() && !/^nenhum/i.test(s.notes.pain.trim())).length;
    const byEx = {};
    list.filter(s => s.date >= since42).forEach(s => {
      for (const [id, arr] of Object.entries(s.sets || {})) {
        if (s.swaps && s.swaps[id]) continue;
        const f = (arr || [])[0], v = f && e1(f.kg, f.reps); if (v == null) continue;
        (byEx[id] = byEx[id] || []).push({ date: s.date, v });
      }
    });
    const slopes = []; let fatigue = 0;
    Object.values(byEx).forEach(pts => {
      pts.sort((a, b) => (a.date < b.date ? -1 : 1));
      if (pts.length >= 2) {
        const t0 = toDate(pts[0].date).getTime(), xs = pts.map(p => (toDate(p.date).getTime() - t0) / dayMs / 7), ys = pts.map(p => p.v);
        if (xs[xs.length - 1] > 0) { const m = ys.reduce((a, b) => a + b, 0) / ys.length; slopes.push(100 * slope(xs, ys) / m); }
      }
      const last = pts.filter(p => p.date >= since35).slice(-3);
      if (last.length === 3 && last[1].v < last[0].v - 0.05 && last[2].v < last[1].v - 0.05) fatigue++;
    });
    const progress = slopes.length ? slopes.reduce((a, b) => a + b, 0) / slopes.length : (missing.push("progresso"), 0.3);
    let weeks = 0;
    if (o.active) {
      const mine = list.filter(s => s.prog === o.active).map(s => s.date).sort();
      if (mine.length) weeks = Math.max(0, (toDate(o.today) - toDate(mine[0])) / dayMs / 7);
    }
    return { sleep: +sleep.toFixed(2), energy: +energy.toFixed(2), adherence: +adherence.toFixed(2), pain, progress: +progress.toFixed(2), fatigue, weeks: +weeks.toFixed(1), sessions28: trained.size, missing };
  }

  /* ------------------------------------------------------------------ */
  /* Vetor de entrada do modelo                                          */
  /* profile: {years, days, minutes, goal, pref(−1 volume … +1 intensidade), limits:[ids], current:programId} */
  /* ------------------------------------------------------------------ */
  const clip = (v, a, b) => Math.max(a, Math.min(b, v));
  function limitFlags(limits) {
    const L = limits || [];
    return {
      joints: L.filter(id => LIMMAP[id] && LIMMAP[id].group === "Articulações").length,
      spine: L.includes("lombar") || L.includes("hernia") ? 1 : 0,
      hyp: L.includes("hipertensao") || L.includes("gestacao") ? 1 : 0,
      equip: L.includes("so_halteres") || L.includes("casa") ? 1 : L.includes("sem_barra") ? 0.5 : 0
    };
  }
  const FEATURE_NAMES = ["anos", "dias", "minutos", "obj_hipertrofia", "obj_forca", "obj_saude", "pref_intensidade", "sono", "energia", "adesao", "progresso", "fadiga", "dor", "lim_articulares", "coluna", "pressao", "equip_limitado", "semanas_programa"].concat(PROGRAM_IDS.map(p => "atual_" + p));
  function features(profile, sig) {
    const p = profile || {}, s = sig || {}, f = limitFlags(p.limits);
    const v = [
      clip((+p.years || 0) / 10, 0, 1), clip(((+p.days || 4) - 2) / 5, 0, 1), clip(((+p.minutes || 60) - 30) / 90, 0, 1),
      p.goal === "hipertrofia" ? 1 : 0, p.goal === "forca" ? 1 : 0, p.goal === "saude" ? 1 : 0,
      clip(((+p.pref || 0) + 1) / 2, 0, 1),
      clip(((s.sleep != null ? s.sleep : 7) - 5) / 4, 0, 1), clip(((s.energy != null ? s.energy : 3) - 1) / 4, 0, 1),
      clip(s.adherence != null ? s.adherence : 0.7, 0, 1), clip((s.progress != null ? s.progress : 0.3) / 4 + 0.5, 0, 1),
      clip((s.fatigue || 0) / 3, 0, 1), clip((s.pain || 0) / 4, 0, 1),
      clip(f.joints / 3, 0, 1), f.spine, f.hyp, f.equip, clip((s.weeks || 0) / 16, 0, 1)
    ];
    PROGRAM_IDS.forEach(id => v.push(p.current === id ? 1 : 0));
    return v;
  }
  const INPUT_DIM = FEATURE_NAMES.length;

  /* ------------------------------------------------------------------ */
  /* Professor: regras de evidência que geram os rótulos de treino       */
  /* ------------------------------------------------------------------ */
  function recoveryIndex(s) {
    const sl = clip(((s.sleep != null ? s.sleep : 7) - 5) / 4, 0, 1), en = clip(((s.energy != null ? s.energy : 3) - 1) / 4, 0, 1);
    return clip(0.4 * sl + 0.3 * en + 0.3 * (1 - clip((s.fatigue || 0) / 3, 0, 1)) - 0.1 * clip((s.pain || 0) / 4, 0, 1), 0, 1);
  }
  function programScores(p, s) {
    const f = limitFlags(p.limits), gi = Math.max(0, GOALS.indexOf(p.goal)), R = recoveryIndex(s);
    const years = +p.years || 0, days = +p.days || 4, mins = +p.minutes || 60, pref = +p.pref || 0;
    const prog = s.progress != null ? s.progress : 0.3, adh = s.adherence != null ? s.adherence : 0.7;
    return PROGRAM_IDS.map(id => {
      const m = PMETA[id]; let sc = 3 * m.g[gi];
      sc += days < m.days ? -2.5 * (m.days - days) : -0.25 * (days - m.days);
      if (years < m.lvl) sc -= Math.min(4, 2.5 * (m.lvl - years));
      if (years < 1 && Math.abs(m.vol) > 0.7) sc -= 1.5; // métodos extremos não são para quem está começando
      sc -= Math.abs(mins - m.mins) / 25;
      sc -= 1.2 * pref * m.vol;
      sc += R < 0.6 ? -2 * (0.6 - R) * m.rec * 2 : 0.3 * m.rec * (R - 0.6);
      sc -= 3 * f.spine * m.spine + 0.5 * f.joints * m.spine * 0.5;
      sc -= 3 * f.hyp * m.bp;
      sc -= 1.8 * f.equip * m.bar;
      if (p.current === id) {
        if (prog > 0.3 && adh > 0.7) sc += 2;
        if (prog <= 0.05 && (s.weeks || 0) > 8) sc -= 2;
        if (adh < 0.5) sc -= 1;
      }
      if (adh < 0.5 && m.days > 3) sc -= 0.8 * (m.days - 3);
      return sc;
    });
  }
  function teacherVolume(p, s) {
    const R = recoveryIndex(s), mins = +p.minutes || 60, adh = s.adherence != null ? s.adherence : 0.7, prog = s.progress != null ? s.progress : 0.3;
    if (R < 0.45 || (s.fatigue || 0) >= 2 || mins < 50 || adh < 0.5) return 0;
    if (prog <= 0.1 && R > 0.7 && mins >= 75 && (+p.years || 0) >= 2 && !limitFlags(p.limits).hyp) return 2;
    return 1;
  }
  function teacherIntensity(p, s) {
    const f = limitFlags(p.limits), R = recoveryIndex(s);
    if (f.hyp || f.spine || (+p.years || 0) < 1 || (s.fatigue || 0) >= 2 || (s.pain || 0) >= 2) return 0;
    if ((+p.pref || 0) > 0.3 && R > 0.65 && (+p.years || 0) >= 3) return 2;
    return 1;
  }
  function teacher(p, s, noise, rnd) {
    const sc = programScores(p, s).map(v => v + (noise ? gauss(rnd) * noise : 0));
    return { program: sc.indexOf(Math.max(...sc)), volume: teacherVolume(p, s), intensity: teacherIntensity(p, s) };
  }

  /* Gerador de perfis sintéticos (semente fixa para reprodutibilidade). */
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function sampleCase(r) {
    const pick = (arr, w) => { let x = r() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x <= 0) return arr[i]; } return arr[arr.length - 1]; };
    const limits = [];
    LIMITATIONS.filter(l => l.group === "Articulações").forEach(l => { if (r() < 0.07) limits.push(l.id); });
    const eq = pick([null, "so_halteres", "so_maquinas", "casa", "sem_barra"], [0.75, 0.06, 0.06, 0.07, 0.06]); if (eq) limits.push(eq);
    if (r() < 0.1) limits.push("hipertensao"); if (r() < 0.06) limits.push("hernia");
    const profile = {
      years: +(r() < 0.25 ? r() * 1.5 : r() * 10).toFixed(1), days: 2 + Math.floor(r() * 6), minutes: 30 + Math.floor(r() * 19) * 5,
      goal: pick(GOALS, [0.65, 0.2, 0.15]), pref: +(r() * 2 - 1).toFixed(2), limits,
      current: r() < 0.2 ? null : PROGRAM_IDS[Math.floor(r() * PROGRAM_IDS.length)]
    };
    const sig = {
      sleep: +(4.5 + r() * 4.5).toFixed(1), energy: +(1 + r() * 4).toFixed(1), adherence: +Math.min(1, 0.2 + r() * 0.9).toFixed(2),
      progress: +(r() * 3 - 1.5).toFixed(2), fatigue: pick([0, 1, 2, 3], [0.6, 0.25, 0.1, 0.05]), pain: pick([0, 1, 2, 3, 4], [0.6, 0.2, 0.1, 0.06, 0.04]),
      weeks: +(r() * 20).toFixed(1)
    };
    return { profile, sig };
  }
  function generateDataset(n, seed, noise) {
    const r = mulberry32(seed || 42), X = [], Y = [], V = [], I = [];
    for (let i = 0; i < n; i++) {
      const { profile, sig } = sampleCase(r), t = teacher(profile, sig, noise == null ? 0.6 : noise, r);
      X.push(features(profile, sig)); Y.push(t.program); V.push(t.volume); I.push(t.intensity);
    }
    return { X, Y, V, I };
  }

  /* ------------------------------------------------------------------ */
  /* Modelo TensorFlow (MLP com três saídas)                              */
  /* ------------------------------------------------------------------ */
  const ARCH = { hidden: [64, 32] };
  function buildModel(tf) {
    const inp = tf.input({ shape: [INPUT_DIM], name: "entrada" });
    let h = tf.layers.dense({ units: ARCH.hidden[0], activation: "relu", name: "oculta1", kernelRegularizer: tf.regularizers.l2({ l2: 1e-4 }) }).apply(inp);
    h = tf.layers.dense({ units: ARCH.hidden[1], activation: "relu", name: "oculta2" }).apply(h);
    const prog = tf.layers.dense({ units: PROGRAM_IDS.length, activation: "softmax", name: "programa" }).apply(h);
    const vol = tf.layers.dense({ units: 3, activation: "softmax", name: "volume" }).apply(h);
    const int = tf.layers.dense({ units: 3, activation: "softmax", name: "intensidade" }).apply(h);
    const model = tf.model({ inputs: inp, outputs: [prog, vol, int], name: "coach" });
    model.compile({ optimizer: tf.train.adam(0.005), loss: ["categoricalCrossentropy", "categoricalCrossentropy", "categoricalCrossentropy"], metrics: ["accuracy"] });
    return model;
  }
  async function trainModel(tf, data, opts) {
    const o = Object.assign({ epochs: 30, batchSize: 64, onEpoch: null }, opts || {});
    const model = buildModel(tf);
    const xs = tf.tensor2d(data.X), yp = tf.oneHot(tf.tensor1d(data.Y, "int32"), PROGRAM_IDS.length).toFloat(), yv = tf.oneHot(tf.tensor1d(data.V, "int32"), 3).toFloat(), yi = tf.oneHot(tf.tensor1d(data.I, "int32"), 3).toFloat();
    const hist = await model.fit(xs, [yp, yv, yi], { epochs: o.epochs, batchSize: o.batchSize, shuffle: true, validationSplit: 0.1, verbose: 0, callbacks: o.onEpoch ? { onEpochEnd: o.onEpoch } : undefined });
    tf.dispose([xs, yp, yv, yi]);
    return { model, history: hist.history };
  }
  function exportWeights(model) {
    const out = { inputDim: INPUT_DIM, programs: PROGRAM_IDS, arch: ARCH, layers: {} };
    ["oculta1", "oculta2", "programa", "volume", "intensidade"].forEach(n => {
      const l = model.getLayer(n), [k, b] = l.getWeights();
      out.layers[n] = { kernel: Array.from(k.dataSync()).map(x => +x.toFixed(5)), kshape: k.shape, bias: Array.from(b.dataSync()).map(x => +x.toFixed(5)) };
    });
    return out;
  }
  function modelFromWeights(tf, W) {
    const model = buildModel(tf);
    Object.entries(W.layers).forEach(([n, w]) => model.getLayer(n).setWeights([tf.tensor2d(w.kernel, w.kshape), tf.tensor1d(w.bias)]));
    return model;
  }
  /* Inferência sem TensorFlow (reserva), com os mesmos pesos. */
  function forwardPlain(W, x) {
    const dense = (v, w, act) => { const [inD, outD] = w.kshape, o = new Array(outD).fill(0); for (let j = 0; j < outD; j++) { let s = w.bias[j]; for (let i = 0; i < inD; i++) s += v[i] * w.kernel[i * outD + j]; o[j] = s; } return act === "relu" ? o.map(z => Math.max(0, z)) : softmax(o); };
    const softmax = z => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
    const h1 = dense(x, W.layers.oculta1, "relu"), h2 = dense(h1, W.layers.oculta2, "relu");
    return [dense(h2, W.layers.programa), dense(h2, W.layers.volume), dense(h2, W.layers.intensidade)];
  }
  async function predictProbs(tf, model, x) {
    const outs = tf.tidy(() => model.predict(tf.tensor2d([x])));
    const arr = await Promise.all(outs.map(t => t.data()));
    outs.forEach(t => t.dispose());
    return arr.map(a => Array.from(a));
  }

  /* ------------------------------------------------------------------ */
  /* Recomendação completa + explicações                                 */
  /* ------------------------------------------------------------------ */
  function explain(id, p, s) {
    const m = PMETA[id], out = [], f = limitFlags(p.limits), R = recoveryIndex(s);
    if ((+p.days || 0) >= m.days && m.days > 1) out.push(m.days === +p.days ? `Usa exatamente os seus ${p.days} dias.` : `Pede ${m.days} dias; você tem ${p.days} disponíveis.`);
    if ((+p.years || 0) >= m.lvl && m.lvl >= 4) out.push("Compatível com seu nível avançado.");
    if (m.lvl === 0 && (+p.years || 0) < 2) out.push("Adequado para quem ainda está construindo a base.");
    if (Math.abs((+p.minutes || 60) - m.mins) <= 15) out.push(`Sessões de cerca de ${m.mins} min, perto do seu tempo.`);
    if (p.goal === "forca" && m.g[1] >= 0.7) out.push("Boa ênfase em força.");
    if (p.goal === "saude" && m.g[2] >= 0.9) out.push("Alinhado ao objetivo de saúde e condicionamento.");
    if ((+p.pref || 0) > 0.3 && m.vol < 0) out.push("Combina com sua preferência por séries mais intensas.");
    if ((+p.pref || 0) < -0.3 && m.vol > 0.3) out.push("Combina com sua preferência por mais séries.");
    if (R < 0.5 && m.rec <= 0.4) out.push("Exige pouca recuperação, bom para o seu momento de sono e energia.");
    if ((f.spine || f.hyp) && m.spine <= 0.4 && m.bp <= 0.4) out.push("Mais fácil de adaptar às suas limitações.");
    if (f.equip && m.bar <= 0.3) out.push("Funciona bem com equipamento limitado.");
    if (p.current === id && (s.progress || 0) > 0.3) out.push("Você está progredindo nele; mudar agora não é necessário.");
    if (p.current && p.current !== id && (s.progress || 0) <= 0.05 && (s.weeks || 0) > 8) out.push("Seu programa atual estagnou após mais de 8 semanas; variar o estímulo pode ajudar.");
    return out.slice(0, 4);
  }
  const VOL_TXT = { red: "Volume reduzido", pad: "Volume padrão", alto: "Volume alto" }, INT_TXT = { mod: "Intensidade moderada", pad: "Intensidade padrão", alta: "Intensidade alta" };
  function settingsReasons(vi, ii, p, s) {
    const out = [], R = recoveryIndex(s), f = limitFlags(p.limits);
    if (vi === 0) { if (R < 0.45) out.push("sono, energia ou fadiga indicam recuperação baixa"); if ((s.adherence || 1) < 0.5) out.push("menos sessões feitas que o planejado"); if ((+p.minutes || 60) < 50) out.push("pouco tempo por sessão"); }
    if (vi === 2) out.push("progresso parado com boa recuperação e tempo disponível");
    if (ii === 0) { if (f.hyp) out.push("hipertensão ou gestação pedem intensidade moderada"); if (f.spine) out.push("coluna pede evitar falha em compostos"); if ((s.fatigue || 0) >= 2) out.push("sinais de fadiga em vários exercícios"); if ((s.pain || 0) >= 2) out.push("relatos de dor articular"); if ((+p.years || 0) < 1) out.push("menos de 1 ano de treino"); }
    if (ii === 2) out.push("preferência por intensidade com boa recuperação e experiência");
    return out;
  }
  function assemble(probs, p, s) {
    const [pp, vp, ip] = probs;
    const programs = PROGRAM_IDS.map((id, i) => ({ id, prob: +pp[i].toFixed(4) })).sort((a, b) => b.prob - a.prob);
    const vi = vp.indexOf(Math.max(...vp)), ii = ip.indexOf(Math.max(...ip));
    return {
      programs: programs.map(x => Object.assign(x, { reasons: explain(x.id, p, s) })),
      volume: { id: VOL_IDS[vi], label: VOL_TXT[VOL_IDS[vi]], prob: +vp[vi].toFixed(4) },
      intensity: { id: INT_IDS[ii], label: INT_TXT[INT_IDS[ii]], prob: +ip[ii].toFixed(4) },
      settingsReasons: settingsReasons(vi, ii, p, s),
      teacher: (() => { const t = teacher(p, s, 0); return { program: PROGRAM_IDS[t.program], volume: VOL_IDS[t.volume], intensity: INT_IDS[t.intensity] }; })(),
      signals: s
    };
  }
  async function recommend(tf, model, W, profile, sig) {
    const x = features(profile, sig);
    const probs = tf && model ? await predictProbs(tf, model, x) : forwardPlain(W, x);
    return assemble(probs, profile, sig);
  }

  return {
    VERSION: "1.0.0", MUSCLES, PATTERNS, EQUIP, JOINTS, EXERCISES, LIMITATIONS, LIMMAP, PROGRAM_IDS, PMETA, GOALS, VOL_IDS, INT_IDS,
    FEATURE_NAMES, INPUT_DIM, lookup, check, substitute, signalsFromSessions, features, teacher, programScores, generateDataset,
    buildModel, trainModel, exportWeights, modelFromWeights, forwardPlain, predictProbs, recommend, assemble, explain, mulberry32, norm
  };
});
