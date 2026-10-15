'use strict';
// Hikâye yönetmeni: bölümler, Lion Lion ağı, ölü noktalar, seri katil takvimi,
// Yellow Bea'nın tuzakları, şüphe göstergesi ve final.

const STORY = {};

// ---------------------------------------------------------------- kurulum
STORY.init = function (st) {
  const r = U.rng(st.seed * 13 + 5);
  const lion = r.pick(POP.lionCandidates);
  const bea = r.pick(POP.beaCandidates);
  const used = new Set([lion.id, bea.id, ...POP.lionCandidates.map((p) => p.id), ...POP.beaCandidates.map((p) => p.id)]);
  const pool = POP.people.filter((p) => CASES.eligible(p) && !used.has(p.id) && p.age >= 24 && p.age <= 64 && /^h\d+$/.test(p.home));
  const handlerPref = pool.filter((p) => /memuru|müdürü|editör|vardiya|avukat|emlak/.test(p.job));
  const handlers = r.shuffle(handlerPref.length >= 2 ? handlerPref : pool).slice(0, 2);
  handlers.forEach((h) => used.add(h.id));
  const agents = r.shuffle(pool.filter((p) => !used.has(p.id))).slice(0, 4);
  agents.forEach((a) => used.add(a.id));
  const members = {};
  members[lion.id] = { rank: 0, code: DATA.NET.lionCodename, boss: null };
  members[bea.id] = { rank: 1, code: DATA.NET.beaCodename, boss: lion.id };
  handlers.forEach((h, i) => { members[h.id] = { rank: 2, code: DATA.NET.handlerCodenames[i], boss: bea.id }; });
  agents.forEach((a, i) => { members[a.id] = { rank: 3, code: DATA.NET.fieldCodenames[i], boss: handlers[i < 2 ? 0 : 1].id }; });
  // Bea'nın 3 izi: aday listesinde yalnızca ona uyan özellikler
  const cands = POP.beaCandidates;
  const keys = DATA.ATTR_KEYS.filter((k) => k !== 'hair' && !CASES.NONE_VALS.has(bea.attrs[k]));
  let combo = null;
  for (const c of r.shuffle(combos(keys, 3))) {
    if (cands.every((q) => q === bea || c.some((k) => q.attrs[k] !== bea.attrs[k]))) { combo = c; break; }
  }
  if (!combo) {
    combo = r.shuffle(keys).slice(0, 3);
    st.popFix = st.popFix || {};
    for (const q of cands) if (q !== bea && combo.every((k) => q.attrs[k] === bea.attrs[k])) {
      const nv = DATA.ATTRS[combo[0]].values.find((v) => v !== bea.attrs[combo[0]]);
      q.attrs[combo[0]] = nv;
      (st.popFix[q.id] = st.popFix[q.id] || {})[combo[0]] = nv;
    }
  }
  // Gizli odalar
  const secrets = {};
  for (const id of Object.keys(members)) { const p = POP.get(id); if (/^h\d+$/.test(p.home) || p.home === 'mansion' || p.home === 'vineyard') secrets[p.home] = 'net'; }
  const decoys = r.shuffle(WORLD.houses.map((h) => h.id).filter((h) => !secrets[h])).slice(0, 5);
  decoys.forEach((h, i) => { secrets[h] = i % 2 ? 'wine' : 'panic'; });
  st.secrets = secrets;
  st.story = {
    ch: 1, flags: {}, lion: lion.id, bea: bea.id, members, exposed: {}, alert: 0,
    beaTraits: combo, beaKnown: [], beaRoom: false, codeKnown: false,
    drops: [], suspicion: 0, arrests: 0, frames: [], nextFrame: null, fdefIdx: r.int(0, DATA.FRAMES.length - 1),
    lionClue: false, finalDay: null, done: false, seen: {},
  };
  // Ajanların bilgisi “yalnızca üstü”: arayüzde de bu şekilde gösterilir
};

function combos(arr, k) {
  const out = [];
  const rec = (start, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); } };
  rec(0, []);
  return out;
}

STORY.member = (pid) => G.state.story.members[pid];
STORY.isMember = (pid) => !!G.state.story.members[pid];
STORY.agents = () => Object.entries(G.state.story.members).filter(([, m]) => m.rank === 3).map(([id]) => id);
STORY.handlers = () => Object.entries(G.state.story.members).filter(([, m]) => m.rank === 2).map(([id]) => id);
STORY.codeOf = (pid) => (STORY.member(pid) || {}).code;

// ---------------------------------------------------------------- ara sahneler
STORY.interlude = async function (key, vars) {
  const s = G.state.story;
  const lines = (DATA.INTERLUDES[key] || []).map(([a, b, t]) => [sub(a, vars), sub(b, vars), sub(t, vars)]);
  await UI.interlude(lines);
  s.seen[key] = (s.seen[key] || 0) + 1;
};
function sub(t, v) { return String(t).replace(/\{(\w)\}/g, (m, k) => (v && v[k]) || '?'); }

// ---------------------------------------------------------------- gün başı
// Gece olanlar: seri katil, Bea tuzağı, ölü nokta takvimi, yeni dava
STORY.night = function (st, newsOut) {
  const s = st.story;
  const day = st.day; // yeni günün numarası
  // seri katil
  const se = st.serial;
  // aktif davanın şüphelileri ve tanığı öldürülmez (dava bozulmasın)
  const cur = st.current && st.cases[st.current];
  const protect = cur && cur.status !== 'closed' ? cur.suspects.map((x) => x.pid).concat([cur.witness.pid]) : [];
  if (se && se.status === 'active' && se.nextKill != null && day - 1 >= se.nextKill) {
    const ex = Object.keys(s.members).concat([se.killer], protect);
    const res = CASES.serialKill(se, day - 1, st.seed * 7 + se.kills * 104729 + day, ex);
    se.kills += 1;
    se.scenes.push(res.scene.id);
    st.scenes[res.scene.id] = res.scene;
    G.killPerson(res.victim.id);
    for (const w of res.scene.witnesses) G.overridePerson(w.pid, day, 8 * 60, 20 * 60, 'near:' + res.scene.place);
    se.nextKill = day - 1 + (se.kills >= 3 ? DIFF().serialGapLate : DIFF().serialGap);
    newsOut.push({ kind: 'serial', scene: res.scene.id });
    if (se.kills >= DIFF().maxKills) { se.status = 'escaped'; newsOut.push({ kind: 'serialEscaped' }); }
  }
  // Bea tuzağı
  if (s.ch >= 3 && !s.done && s.nextFrame != null && day - 1 >= s.nextFrame && s.members[s.bea] && !s.exposed[s.bea]) {
    const agent = STORY.agents().find((a) => !s.exposed[a] && CASES.eligible(POP.get(a)));
    if (agent) {
      const fdef = DATA.FRAMES[s.fdefIdx % DATA.FRAMES.length];
      s.fdefIdx++;
      const okV = (p) => CASES.eligible(p) && !s.members[p.id] && !protect.includes(p.id) && (!se || p.id !== se.killer) && /^h\d+$/.test(p.home);
      const recent = (st.talked || []).filter((pid) => okV(POP.get(pid)));
      const victimId = recent.length ? recent[recent.length - 1] : U.rng(day).pick(POP.people.filter(okV)).id;
      // Bea akıllıdır: Jade'in tanıksız olduğu saati seçer
      let tod = 22, best = 99;
      for (let hh = 20; hh <= 25; hh += 0.5) { const n = G.jadeWitnesses(day - 1, hh * 60).length; if (n < best) { best = n; tod = hh; } }
      const sc = CASES.frameKill(fdef, agent, victimId, day - 1, tod, st.seed + day * 31);
      st.scenes[sc.id] = sc;
      G.killPerson(victimId);
      s.frames.push({ id: sc.caseId, sceneId: sc.id, fdef: fdef.id, day: day - 1, tod, agent, alibi: false, analysis: false, agentFound: false });
      s.suspicion = Math.min(100, s.suspicion + DIFF().frameSusp);
      s.nextFrame = day - 1 + DIFF().frameGap;
      newsOut.push({ kind: 'frame', scene: sc.id });
    }
  }
  // şüphe zamanla azalır
  if (s.suspicion > 0 && !newsOut.some((n) => n.kind === 'frame')) s.suspicion = Math.max(0, s.suspicion - DIFF().decay);
};

// ---------------------------------------------------------------- olaylar
STORY.onCaseSolved = async function (c) {
  const st = G.state, s = st.story;
  if (c.net) {
    const C = POP.get(c.culprit);
    s.exposed[C.id] = true;
    if (!s.codeKnown) {
      s.codeKnown = true;
      await UI.say(G.cast('jade'), `${C.first}, cebindeki bu ikinci telefon... Sadece bir numara kayıtlı. Ve tek bir kelime: “LION LION.”`);
      await UI.say(G.cast('boss'), 'Lion Lion mı? Bu bir şifre. Jade, bu iş tek bir cinayetten büyük.');
      await STORY.interlude('arrest', { B: STORY.codeOf(s.members[C.id].boss) });
    }
    const h = s.members[C.id].boss;
    STORY.scheduleDrop(h, `${C.first} ${C.last} adlı ajanın telefonu`);
    if (s.ch < 2) STORY.startChapter2();
  }
};

STORY.startChapter2 = function () {
  const st = G.state, s = st.story;
  s.ch = 2;
  if (!st.serial) {
    st.serial = CASES.startSerial(st.seed * 3 + 77, Object.keys(s.members));
    st.serial.nextKill = st.day; // bu gece
    if (st.secrets[POP.get(st.serial.killer).home]) delete st.secrets[POP.get(st.serial.killer).home];
    st.secrets[POP.get(st.serial.killer).home] = 'killer';
  }
  UI.toast('Yeni bölüm: Aslan Ağı', 'good');
};

STORY.scheduleDrop = function (handlerId, source) {
  const st = G.state, s = st.story;
  if (s.exposed[handlerId] || s.drops.some((d) => d.handler === handlerId && !d.done)) return;
  const spot = DATA.NET.dropSpots[U.hash(st.seed, handlerId, s.drops.length) % DATA.NET.dropSpots.length];
  const d = { id: 'drop' + s.drops.length, handler: handlerId, spot: spot.id, label: spot.label, day: st.day + 1, hour: 22, done: false, seen: false, source };
  s.drops.push(d);
  const msg = `“${DATA.NET.code}. Teslimat: ${spot.label}, ${DATA.DAYS[(d.day - 1) % 7]} saat 22.00. — ${STORY.codeOf(handlerId)}”`;
  G.msg('Ajanın telefonu', msg.replace(/[“”]/g, ''), true);
  G.addEvidence('net', d.id, 'Ölü nokta mesajı', `${source} içinden çıkan mesaj: ${msg}`);
  UI.toast(`Ölü nokta: ${spot.label}, Gün ${d.day} saat 22.00`, 'good');
};

// Ölü noktada bekleme: oyuncu yakındaysa el koyucu belirir
STORY.checkDrops = function () {
  const st = G.state, s = st.story;
  if (!s || G.map.id !== 'town') return;
  for (const d of s.drops) {
    if (d.done || d.seen || st.day !== d.day) continue;
    const t = st.time / 60;
    if (t < 21.5 || t > 22.6) continue;
    const spot = WORLD.maps.town.spots[d.spot];
    const dist = Math.hypot(G.player.x / TS - spot[0], G.player.y / TS - spot[1]);
    if (dist > 9) continue;
    d.seen = true;
    G.runScript(() => STORY.dropScene(d));
  }
};

STORY.dropScene = async function (d) {
  const H = POP.get(d.handler);
  const spot = WORLD.maps.town.spots[d.spot];
  await UI.say(null, 'Karanlıkta bir gölge yaklaşıyor... Jade bir ağacın arkasına saklanıyor.');
  const n = G.mkNpc({ id: 'dropper', name: '???', spec: H.spec, tx: spot[0] + 3, ty: spot[1] + 1, dir: 2 });
  n.temp = true;
  G.npcs.push(n);
  await G.walkNpc(n, spot[0], spot[1]);
  await U.sleep(500);
  await UI.say(null, 'Gölge bir zarf bırakıyor, etrafına bakınıyor...');
  if (G.state.focus >= 10) {
    const i = await UI.choose(G.cast('jade'), 'Ne yapmalıyım?', ['[Gözlem • 10 odak] Dikkatle izle', 'Sessizce bekle', 'Üstüne atla!']);
    if (i === 0) {
      G.state.focus -= 10; SFX.focus(); G.observeFx = 1;
      const vis = [`Saçı: ${H.attrs.hair}`, `Üstünde ${CASES.colorName(H.spec.jacket || H.spec.top)} bir ceket/gömlek`, `Cinsiyet: ${H.g === 'f' ? 'kadın' : 'erkek'}`, `Uzaklaşırken ${H.attrs.vehicle === 'aracı yok' ? 'yürüyerek gitti' : 'bir ' + H.attrs.vehicle + ' ile gitti'}`];
      await UI.say(null, 'Jade her ayrıntıyı hafızasına kazıyor: ' + vis.join(' • ') + '.');
      G.addEvidence('net', 'dropwatch_' + d.id, 'Ölü noktadaki kişi', `${STORY.codeOf(d.handler)} kod adlı kişi: ${vis.join('; ')}.`);
    } else if (i === 2) {
      await UI.say(null, 'Gölge Jade’i fark ediyor ve karanlıkta kayboluyor! Ağ şimdi tetikte.');
      G.state.story.alert = Math.min(100, G.state.story.alert + 30);
      G.npcs = G.npcs.filter((x) => x !== n);
      d.done = true;
      STORY.reschedule(d);
      return;
    } else {
      await UI.say(null, 'Jade nefesini tutuyor. Gölge, yüzünü göstermeden uzaklaşıyor.');
      G.addEvidence('net', 'dropwatch_' + d.id, 'Ölü noktadaki kişi', `${STORY.codeOf(d.handler)} kod adlı kişi geldi ama yüzünü göremedin. Saçı ${H.attrs.hair} gibiydi.`);
    }
  }
  await G.walkNpc(n, spot[0] + 8, spot[1] + 2);
  G.npcs = G.npcs.filter((x) => x !== n);
  d.done = true;
  await UI.say(null, 'Zarfı alıyorsun. İçinde daktiloyla yazılmış emirler var.');
  G.addEvidence('net', 'envelope_' + d.id, 'Ölü noktadaki zarf', `“${DATA.NET.code}. Danışmanın kanepesini izle. Sarı Arı memnun değil. — ${STORY.codeOf(d.handler)}” Zarftaki koku: ${H.attrs.scent}.`);
  if (!G.state.story.beaHeard) { G.state.story.beaHeard = true; UI.toast('Yeni kod adı: “Sarı Arı” (Yellow Bea?)', 'good'); }
};

STORY.reschedule = function (d) {
  const s = G.state.story;
  const nd = Object.assign({}, d, { id: 'drop' + s.drops.length, day: G.state.day + 2, done: false, seen: false });
  s.drops.push(nd);
  G.addEvidence('net', nd.id, 'Yeni ölü nokta', `Ağ buluşmayı erteledi: ${nd.label}, Gün ${nd.day} saat 22.00.`);
};

// Ağ üyesini ifşa etme (Şef'e)
STORY.exposeMember = async function (pid) {
  const st = G.state, s = st.story;
  const p = POP.get(pid);
  const mem = s.members[pid];
  const boss = G.cast('boss');
  if (!mem || s.exposed[pid]) {
    st.rep = Math.max(0, st.rep - 2);
    s.alert = Math.min(100, s.alert + 25);
    if (s.ch >= 3) s.suspicion = Math.min(100, s.suspicion + 10);
    SFX.bad();
    await UI.say(boss, `${p.name} ile ilgili hiçbir şey çıkmadı, Jade. Masum birini suçladın ve bu yüzden konuşulacağız. (İtibar −2)`);
    return false;
  }
  if (mem.rank <= 1) return false;
  s.exposed[pid] = true;
  G.jail(pid);
  SFX.good();
  st.rep += 3;
  for (const fr of s.frames) if (fr.agent === pid && !fr.agentFound) {
    fr.agentFound = true;
    s.suspicion = Math.max(0, s.suspicion - 30);
    G.addEvidence('frame', 'agentfound_' + fr.id, 'Tuzağı kuran yakalandı', `${p.name} (${mem.code}), Gün ${fr.day} gecesi işlenen tuzak cinayetini Yellow Bea’nın emriyle işledi. (Şüphe −30)`);
  }
  await UI.say(boss, `${p.name} gözaltında. Telefonundaki şifreli mesajlar senin dediğini doğruluyor. Kod adı: “${mem.code}”.`);
  if (mem.rank === 2) {
    const mine = Object.entries(s.members).filter(([, m]) => m.boss === pid).map(([, m]) => m.code);
    await UI.say({ name: p.name, spec: p.spec }, `Kimseyi tanımam! Bana emirler geliyordu, ben de aşağıya iletiyordum. Benim adamlarım: ${mine.join(' ve ')}. Yüzlerini hiç görmedim.`);
    await UI.say({ name: p.name, spec: p.spec }, '“Yellow Bea” imzalı emirler... Bir kere telefonu açık kaldı. Arkadan bir ses duydum.');
    STORY.revealBeaTrait();
    if (s.ch < 3) { s.ch = 3; s.nextFrame = st.day; UI.toast('Yeni bölüm: Yellow Bea', 'good'); await STORY.interlude('bea_rise', {}); }
  } else {
    await UI.say({ name: p.name, spec: p.spec }, 'Bana sadece mesaj gelirdi. Bırakılacak zarflar, silinecek izler. Göndereni hiç görmedim.');
    STORY.scheduleDrop(mem.boss, `${p.name} adlı ajanın telefonu`);
  }
  G.addEvidence('net', 'exposed_' + pid, 'İfşa edildi: ' + mem.code, `${p.name} (${p.job}) — ağdaki kod adı “${mem.code}”. Üstü: ${STORY.codeOf(mem.boss)}.`);
  return true;
};

STORY.revealBeaTrait = function () {
  const s = G.state.story;
  const k = s.beaTraits.find((t) => !s.beaKnown.includes(t));
  if (!k) return null;
  s.beaKnown.push(k);
  const B = POP.get(s.bea);
  const v = B.attrs[k];
  const txt = { shoe: `Yellow Bea ${v} numara ayakkabı giyiyor (ofisindeki ayak izi).`, hand: `Yellow Bea ${v === 'sol' ? 'SOLAK' : 'sağ elini kullanıyor'} (emirlerdeki imza eğimi).`, smoke: `Yellow Bea ${v} içiyor (telefonun arka planında çakmak sesi ve marka).`, scent: `Yellow Bea’nın zarflarında ${v} kokusu var.`, vehicle: `Yellow Bea’nın aracı: ${v} (ölü noktada görülen).` }[k] || `Yellow Bea: ${k} = ${v}`;
  G.addEvidence('net', 'bea_' + k, 'Yellow Bea hakkında', txt);
  UI.toast('Yellow Bea hakkında yeni bir ipucu!', 'good');
  return k;
};

// Yellow Bea'yı suçlama
STORY.accuseBea = async function (pid) {
  const st = G.state, s = st.story;
  const boss = G.cast('boss');
  const p = POP.get(pid);
  if (pid !== s.bea) {
    s.suspicion = Math.min(100, s.suspicion + 30);
    st.rep = Math.max(0, st.rep - 3);
    SFX.bad();
    await UI.say(boss, `${p.name} mi? Jade, o kişinin dosyası tertemiz ve şimdi FBI resmi şikâyette bulunuyor. Bu sana pahalıya patladı. (Şüphe +30, İtibar −3)`);
    await STORY.interlude('frame', { B: 'Çoban' });
    return;
  }
  if (!s.beaRoom) {
    s.suspicion = Math.min(100, s.suspicion + 15);
    await UI.say(boss, `${p.name}... ${p.job}. Haklı olabilirsin ama elimizde somut delil yok. Böyle birini ancak kendi evinde, kendi sakladığı şeylerle yakalarız. (Şüphe +15)`);
    await UI.say(G.cast('jade'), 'Gizli bir yeri olmalı. Lion Lion’un emirlerini sakladığı bir yer.');
    return;
  }
  s.exposed[pid] = true;
  G.jail(pid);
  s.suspicion = 0;
  st.rep += 10;
  SFX.good();
  await UI.say(G.cast('jade'), `Merhaba, ${p.first}. Ya da “Yellow Bea” mı demeliyim?`);
  await UI.say({ name: p.name, spec: p.spec }, 'Sen... Beni bulacağını hiç düşünmezdim, danışman. Ama Aslan’a asla ulaşamazsın.');
  await UI.say(G.cast('jade'), 'Ulaşmama gerek yok. O bana gelecek. Telefonun bende.');
  s.ch = 4;
  s.finalDay = st.day + 1;
  G.addEvidence('net', 'final', 'Son hamle', `Yellow Bea’nın telefonundan Aslan’a mesaj gönderildi: “${DATA.NET.code}. Deniz feneri, gece yarısı. Acil.” Gün ${s.finalDay}, saat 23.30–00.30 arası deniz fenerinin yanında ol.`);
  UI.toast('Final: Deniz feneri, gece yarısı!', 'good');
};

// Final: deniz feneri
STORY.checkFinal = function () {
  const st = G.state, s = st.story;
  if (!s || s.ch !== 4 || s.done || G.map.id !== 'town' || st.day !== s.finalDay) return;
  const t = st.time / 60;
  if (t < 23.5 || t > 24.6) return;
  const spot = WORLD.maps.town.spots.bench;
  if (Math.hypot(G.player.x / TS - spot[0], G.player.y / TS - spot[1]) > 8) return;
  s.finalSeen = true;
  s.finalDay = -1;
  G.runScript(() => STORY.finalScene());
};

STORY.finalScene = async function () {
  const st = G.state, s = st.story;
  const L = POP.get(s.lion);
  const spot = WORLD.maps.town.spots.bench;
  await UI.say(null, 'Gece yarısı. Fenerin ışığı denizi tarıyor. Bir araba duruyor; uzun paltolu bir figür yaklaşıyor.');
  const n = G.mkNpc({ id: 'lion', name: 'Aslan', spec: L.spec, tx: spot[0] + 5, ty: spot[1], dir: 2 });
  n.temp = true; G.npcs.push(n);
  await G.walkNpc(n, spot[0] + 2, spot[1]);
  const lw = { name: 'Aslan', spec: L.spec };
  const jade = G.cast('jade');
  let score = 0;
  let i = await UI.choose(lw, 'Kod?', ['Lion Lion.', 'Sarı Arı.', 'Aslan uyur.']);
  if (i === 0) score++;
  i = await UI.choose(lw, 'Sen Bea değilsin. Kimsin?', ['Bea yakalandı. Beni o gönderdi; onun yerini alacağım.', 'Ben Jade. Tutuklusun.', 'Bir yanlışlık oldu, gidiyorum.']);
  if (i === 0) score++;
  const cands = POP.lionCandidates;
  i = await UI.choose(jade, '(İçinden) Bea’nın gizli odasındaki mektubun mührünü hatırla. Aslan kim?', cands.map((c) => `${c.name} — ${c.job}`));
  const right = cands[i] === L;
  if (right) score++;
  if (score >= 2 && right) {
    await UI.say(jade, `${L.first} ${L.last}. ${L.job}. Kasabanın en güvenilir insanı. Ne hoş bir maske.`);
    await UI.say(lw, '...Lion Lion. Bunu bana kimse söyletemezdi. Sen nasıl...?');
    await UI.say(jade, 'İnsanlar yalan söyler. Ama mühürler yalan söylemez. Ve sen az önce kendini ele verdin.');
    await UI.say(G.cast('boss'), 'SSB! Kıpırdama! ...Jade, bu gece ömrümü yedin ama harika iş çıkardın.');
    s.exposed[L.id] = true; G.jail(L.id); s.done = true; s.ch = 5;
    st.rep += 20; st.money += 500;
    G.npcs = G.npcs.filter((x) => x !== n);
    SFX.good();
    await STORY.ending();
  } else {
    await UI.say(lw, 'Sen... Bea değilsin. Bea asla böyle konuşmazdı.');
    await UI.say(null, 'Figür arabaya atlayıp karanlıkta kayboluyor. Aslan kaçtı, ama Bea’nın telefonu hâlâ sende. Ağ seni artık tanıyor.');
    s.suspicion = Math.min(100, s.suspicion + 20);
    s.finalDay = st.day + 2;
    G.addEvidence('net', 'final2', 'İkinci şans', `Aslan kaçtı. Bea’nın telefonundan yeni bir mesaj gönderdin: Gün ${s.finalDay}, gece yarısı, deniz feneri. Bu sefer doğru kişiyi bil.`);
    await G.walkNpc(n, spot[0] + 10, spot[1] + 1);
    G.npcs = G.npcs.filter((x) => x !== n);
  }
};

STORY.ending = async function () {
  await UI.interlude([
    ['SSB', 'Basın', 'Aslan Ağı çöktü. Bir FBI-CIA yapılanmasının içindeki yozlaşmış hücre tamamen çözüldü.'],
    ['Lena', 'Jade', 'Bunu nasıl yaptın, gerçekten?'],
    ['Jade', 'Lena', 'Herkes bir yalan söyler. Ben sadece hangisinin önemli olduğunu bulurum.'],
    ['Lion Lion', '—', 'Bağlantı kesildi.'],
  ]);
  await UI.say(null, 'TEBRİKLER! Aslan Ağı’nı çökerttin. Oyun devam ediyor: kasabaya her gün yeni davalar gelmeye devam edecek.');
};

// Yellow Bea'nın kurgu delilini analiz (tuzak çözme)
STORY.analyzeFrame = async function (fr) {
  const fdef = DATA.FRAMES.find((f) => f.id === fr.fdef);
  const ok = await MINI.frameAnalysis(fdef);
  G.advance(20);
  if (ok) {
    fr.analysis = true;
    const s = G.state.story;
    s.suspicion = Math.max(0, s.suspicion - 25);
    SFX.good();
    await UI.say(G.cast('jade'), fdef.why);
    G.addEvidence('frame', 'an_' + fr.id, 'Kurgu delili çürütüldü: ' + fdef.title, fdef.why);
    const k = STORY.revealBeaTrait();
    if (k) await UI.say(G.cast('jade'), 'Bu tuzağı kuran kişi hakkında da bir şey öğrendim. Dosyaya bak.');
  }
};

// Jade'in o anki konumu için tanıklar
STORY.alibiQuestion = function (pidOrCast) {
  const s = G.state.story;
  const open = s.frames.filter((f) => !f.alibi);
  for (const fr of open) {
    const wits = G.jadeWitnesses(fr.day, fr.tod * 60);
    if (wits.includes(pidOrCast)) return { fr, yes: true };
  }
  return { fr: open[0], yes: false };
};
