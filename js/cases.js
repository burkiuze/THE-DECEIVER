'use strict';
// Dava motoru: olay yerleri (ceset, ipuçları, cesetteki eşyalar, tanıklar),
// sıradan davalar, seri katil cinayetleri ve Yellow Bea'nın tuzak cinayetleri.

const CASES = {};
const NONE_VALS = new Set(['içmiyor', 'belirgin koku yok', 'aracı yok']);
CASES.NONE_VALS = NONE_VALS;

const MOTIVE_BY_REL = {
  spouse: ['kiskanclik', 'miras'], child: ['miras', 'borc'], parent: ['miras', 'intikam'], sibling: ['miras', 'borc'],
  roommate: ['borc', 'santaj'], coworker: ['rekabet', 'santaj'], neighbor: ['intikam', 'borc'], friend: ['borc', 'kiskanclik', 'santaj'],
  enemy: ['intikam', 'rekabet'], acq: ['santaj', 'borc', 'rekabet'],
};

// Olay yerine göre “iz” (soğuk okumada şüpheliyi olay yerine bağlayan detay)
CASES.trace = function (place) {
  if (DATA.SCENE_INFO[place]) return DATA.SCENE_INFO[place].trace;
  if (/^h\d+$/.test(place)) return {
    clue: ['Halı lifleri', 'Kurbanın evindeki el dokuması halı, basan herkesin paçasına renkli lifler bırakıyor.'],
    obs: 'Pantolonunun paçasına renkli, el dokuması halı lifleri yapışmış.',
    right: 'Kurbanın evine girmiş', wrong: ['Halısını yıkamaya vermiş', 'Evde tüylü bir kedi besliyor'],
  };
  if (place === 'park') return {
    clue: ['Kırmızı çakıl', 'Parkın göl kıyısındaki yolu kırmızı çakılla kaplı; ayakkabılara takılıyor.'],
    obs: 'Ayakkabısının tabanına kırmızı çakıl taşları sıkışmış.', right: 'Parktaki olay yerinden geçmiş', wrong: ['Bahçesine çakıl döşetmiş', 'İnşaatta çalışıyor'],
  };
  if (place === 'docks') return {
    clue: ['Zift ve tuz', 'İskele tahtaları zift kokuyor; deniz tuzu her yere yapışıyor.'],
    obs: 'Ellerinde zift lekesi, ceketinde kurumuş tuz izi var.', right: 'Gece iskeleye gitmiş', wrong: ['Tekne boyamış', 'Balık tutmayı seviyor'],
  };
  if (place === 'cemetery') return {
    clue: ['Mezarlık toprağı', 'Mezarlığın toprağı siyah, nemli ve kokulu.'],
    obs: 'Ayakkabısında siyah, nemli, mezarlık toprağı var.', right: 'Mezarlıktaki olay yerine gitmiş', wrong: ['Bahçe işleri yapmış', 'Saksı değiştirmiş'],
  };
  const nm = (DATA.PLACES[place] || { short: place }).short;
  return {
    clue: ['Cila kokusu', `${nm} zeminleri keskin kokulu, özel bir cilayla siliniyor.`],
    obs: 'Ayakkabılarından keskin bir zemin cilası kokusu geliyor.', right: `${nm} içine girmiş`, wrong: ['Evini temizletmiş', 'Ayakkabısını boyatmış'],
  };
};

CASES.eligible = function (p) {
  return p && p.alive && !p.jailed && !p.gone && !p.guest;
};

// Olay yerindeki boş karolar ve ceset konumu
function sceneTiles(place, r) {
  if (['park', 'docks', 'cemetery'].includes(place)) {
    const m = WORLD.maps.town;
    const z = m.zones[place];
    const tiles = [];
    for (let y = z.y0 + 1; y <= z.y1 - 1; y++) for (let x = z.x0 + 1; x <= z.x1 - 2; x++) if (!m.solid[y * m.w + x] && !m.solid[y * m.w + x + 1] && m.tiles[y * m.w + x] !== 'water') tiles.push([x, y]);
    const body = r.pick(tiles);
    const near = tiles.filter(([x, y]) => Math.abs(x - body[0]) + Math.abs(y - body[1]) <= 6 && !(y === body[1] && (x === body[0] || x === body[0] + 1)));
    return { map: 'town', body, free: r.shuffle(near) };
  }
  const m = WORLD.getMap(place);
  const free = m.free.filter(([x, y]) => y >= 3 && y <= m.h - 3);
  const set = new Set(m.free.map(([x, y]) => x + ',' + y));
  const bodyOpts = free.filter(([x, y]) => set.has((x + 1) + ',' + y));
  const body = r.pick(bodyOpts.length ? bodyOpts : free);
  const rest = m.free.filter(([x, y]) => !(y === body[1] && (x === body[0] || x === body[0] + 1)));
  return { map: place, body, free: r.shuffle(rest) };
}

CASES.attrClue = function (key, v) {
  const cl = CASES.attrClue0(key, v);
  if (cl && CASES.hiddenAll) cl.hidden = true;
  return cl;
};
CASES.attrClue0 = function (key, v) {
  if (key === 'shoe') return { id: 'shoe', attr: 'shoe', title: 'Ayak izi', text: `Yerde çamurlu bir ayakkabı izi. Ölçtün: ${v} numara.` };
  if (key === 'smoke') return { id: 'smoke', attr: 'smoke', title: 'Sigara izmariti', text: `Kurban sigara içmezmiş. Yerdeki izmaritin markası: ${v}.` };
  if (key === 'hair') return { id: 'hair', attr: 'hair', hidden: true, title: 'Yabancı saç teli', text: `Kurbanın yakasında ona ait olmayan, ${v} bir saç teli.` };
  if (key === 'scent') return { id: 'scent', attr: 'scent', hidden: true, title: 'Parfüm kokusu', text: `Havada hafif bir ${v} kokusu var. Kurban bu kokuyu kullanmazmış.` };
  return null;
};

// Temel olay yeri kurucusu
CASES.makeScene = function (o) {
  const r = U.rng(o.seed);
  const t = sceneTiles(o.place, r);
  const v = POP.get(o.victim);
  const K = o.killer ? POP.get(o.killer) : null;
  const sc = {
    id: o.id, caseId: o.caseId, kind: o.kind, place: o.place, map: t.map, body: t.body,
    victim: o.victim, killer: o.killer, method: o.method, weapon: o.weapon,
    day: o.day, tod: o.tod, found: {}, searched: {}, autopsy: false, visited: false,
    clues: [], items: [], witnesses: [], traces: o.traces || [], frame: o.frame || null,
  };
  const take = () => t.free.shift() || t.body;
  for (const key of sc.traces) { const cl = CASES.attrClue(key, K.attrs[key]); if (cl) sc.clues.push(cl); }
  if (o.trace) { const tr = CASES.trace(o.place); sc.clues.push({ id: 'trace', title: tr.clue[0], text: tr.clue[1] }); }
  for (const f of r.shuffle(DATA.FLAVOR_CLUES).slice(0, o.flavor == null ? 2 : o.flavor)) sc.clues.push({ id: 'fl_' + f.id, title: f.title, text: f.text(o.tod) });
  for (const extra of o.extraClues || []) sc.clues.push(extra);
  for (const cl of sc.clues) { const p = take(); cl.x = p[0]; cl.y = p[1]; }
  if (o.safe) {
    const m = WORLD.getMap(o.place);
    const top = t.free.filter(([x, y]) => y === 2 && keepsConnected(m, x, y));
    if (top.length) { sc.safe = { x: top[0][0], y: top[0][1] }; t.free = t.free.filter((q) => q !== top[0]); }
  }
  // cesetteki eşyalar
  const pockets = r.shuffle(DATA.POCKETS);
  let pk = 0;
  const item = (title, text, extra) => sc.items.push(Object.assign({ id: 'it' + sc.items.length, pocket: pockets[pk++ % pockets.length], title, text }, extra || {}));
  item('Cüzdan', `${v.name} adına kimlik, ${r.int(40, 400)}$ nakit ve bir aile fotoğrafı. Hiçbir şey alınmamış: soygun değil.`);
  for (const it of o.items || []) item(it.title, it.text, it);
  return sc;
};

function keepsConnected(m, tx, ty) {
  const W = m.w, H = m.h;
  const seen = new Set();
  const q = [[m.door.x, H - 2]];
  seen.add(m.door.x + ',' + (H - 2));
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || (nx === tx && ny === ty) || m.solid[ny * W + nx]) continue;
      const k = nx + ',' + ny;
      if (seen.has(k)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return m.free.every(([x, y]) => (x === tx && y === ty) || seen.has(x + ',' + y));
}

// Bir kişinin o gece yakınında olan tanıklar (komşular)
CASES.neighborsOf = function (place) {
  if (!/^h\d+$/.test(place)) return [];
  const h = WORLD.building(place);
  return WORLD.houses.filter((x) => x.id !== place && x.block[0] === h.block[0] && Math.abs(x.block[1] - h.block[1]) <= 1)
    .flatMap((x) => POP.people.filter((p) => p.home === x.id && CASES.eligible(p)));
};

// Telefon kaydı metni
CASES.phoneLog = function (calls) {
  return 'Son aramalar: ' + calls.map((c) => `${U.hm(c.t)} — ${c.num} (${c.dur} dk)`).join(' • ');
};

// =====================================================================================
// SIRADAN DAVA (şüpheliler kurbanın çevresinden seçilir)
// =====================================================================================
CASES.genStandard = function (seed, num, day, opts) {
  opts = opts || {};
  const excluded = new Set(opts.exclude || []);
  for (let attempt = 0; attempt < 80; attempt++) {
    const r = U.rng(seed + attempt * 7919);
    const elig = POP.people.filter((p) => CASES.eligible(p) && !excluded.has(p.id) && !p.special);
    let C, victim;
    if (opts.agent) {
      C = POP.get(opts.agent);
      const prefer = elig.filter((p) => p !== C && /gazeteci|muhasebeci|veznedar|memuru|editör|avukat/.test(p.job));
      victim = r.pick(prefer.length ? prefer : elig.filter((p) => p !== C));
    } else {
      victim = r.pick(elig);
    }
    if (!victim) continue;
    const rels = POP.relations(victim).filter((x) => CASES.eligible(x.p) && !excluded.has(x.p.id) && !x.p.special && x.p !== C);
    const pool = r.shuffle(rels);
    const suspects = [];
    if (C) suspects.push({ p: C, type: (POP.relOf(victim, C)) || 'acq' });
    for (const x of pool) { if (suspects.length >= 4) break; if (!suspects.some((s) => s.p === x.p)) suspects.push(x); }
    while (suspects.length < 4) {
      const q = r.pick(elig);
      if (q !== victim && !suspects.some((s) => s.p === q)) suspects.push({ p: q, type: 'acq' });
    }
    if (!C) {
      const cands = suspects.filter((s) => !(opts.netMembers || []).includes(s.p.id));
      if (!cands.length) continue;
      C = r.pick(cands).p;
    }
    const innocents = suspects.filter((s) => s.p !== C);
    // olay yeri izleri: yalnızca katile tam uyan 3 özellik
    const keys = DATA.ATTR_KEYS.filter((k) => !NONE_VALS.has(C.attrs[k]));
    let best = null, bestScore = -1;
    for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) for (let c = b + 1; c < keys.length; c++) {
      const combo = [keys[a], keys[b], keys[c]];
      let ok = true, score = 0;
      for (const s of innocents) {
        const m = combo.filter((k) => s.p.attrs[k] === C.attrs[k]).length;
        if (m === 3) { ok = false; break; }
        score += m;
      }
      if (!ok) continue;
      score += r.next();
      if (score > bestScore) { bestScore = score; best = combo; }
    }
    if (!best) continue;
    const sceneAttrs = best;
    const method = sceneAttrs.includes('hand') ? r.pick(['kunt', 'bicak', 'bogma']) : r.pick(DATA.METHOD_KEYS);
    // olay yeri
    let place = victim.home;
    const roll = r.next();
    if (roll < 0.22 && ['cafe', 'bar', 'hotel', 'gallery', 'warehouse', 'vineyard', 'mansion', 'restaurant', 'library', 'shop', 'market'].includes(victim.work)) place = victim.work;
    else if (roll < 0.42) place = r.pick(['park', 'docks', 'cemetery']);
    if (place === 'hotel' && victim.home === 'hotel') place = 'hotel';
    const h = r.pick([20, 21, 22, 23]);
    const alibiPlaces = DATA.ALIBI_PLACES.filter((p) => p !== place);
    const motives = new Set();
    const roles = r.shuffle(['RH', 'A', 'B']);
    const reads = r.shuffle(DATA.COLD_READS);
    const trace = CASES.trace(place);
    const sus = suspects.map((s, i) => {
      const role = s.p === C ? 'C' : roles.pop();
      let mot = r.pick(MOTIVE_BY_REL[s.type] || MOTIVE_BY_REL.acq);
      if (motives.has(mot)) mot = r.pick(DATA.MOTIVE_KEYS.filter((m) => !motives.has(m)));
      motives.add(mot);
      const relLabel = s.type === 'acq' ? 'tanıdığı' : POP.REL_LABEL[s.type];
      const o = { pid: s.p.id, role, motive: mot, relation: relLabel };
      if (role === 'RH') o.alibi = { place: null, claim: 'Evdeydim. Yalnızdım. Biraz kitap okudum, erkenden yattım. Bunu kimse doğrulayamaz, biliyorum.' };
      else {
        const pl = r.pick(alibiPlaces), arrive = h - r.pick([1, 1.5]);
        o.alibi = { place: pl, claim: `${DATA.ALIBI_CLAIM[pl]}. Saat ${U.hm(arrive)} civarı gittim, gece yarısına kadar oradaydım.` };
        if (role === 'A') { o.alibi.truth = `Evet, saat ${U.hm(arrive)} civarı geldi ve gece yarısına kadar buradaydı. Bir an bile ayrılmadı, gözüm üstündeydi.`; o.alibi.ok = true; }
        else if (role === 'C') { o.alibi.truth = `Saat ${U.hm(arrive)} civarı geldi, doğru. Ama ${U.hm(h - 1 / 3)} gibi bir telefon aldı ve aceleyle çıktı. Bir daha da dönmedi.`; o.alibi.ok = false; }
        else { o.alibi.truth = `Saat ${U.hm(arrive)} civarı geldi. Ama ${U.hm(h - 0.5)} gibi hesabı ödeyip çıktı; gece yarısına kadar kalmadı, eminim.`; o.alibi.ok = false; }
      }
      if (role === 'C') o.read = { obs: trace.obs, right: trace.right, wrong: trace.wrong.slice(), trace: true, secret: 'Ben... evet, oraya uğramıştım. Birkaç gün önce. Hepsi bu, başka bir şey yok.' };
      else if (role === 'RH') o.read = { obs: trace.obs, right: trace.right, wrong: trace.wrong.slice(), trace: true, secret: 'Tamam! O gün öğleden sonra uğradım. Tartıştık, sonra çıktım gittim. Akşam evdeydim, yemin ederim!' };
      else if (role === 'A') o.read = Object.assign({}, reads[0]);
      else o.read = Object.assign({}, reads[1], { altAlibi: true });
      return o;
    });
    const order = r.shuffle(sus.map((s) => s.pid));
    sus.forEach((s) => { const k = order.indexOf(s.pid); s.gossipAbout = order[(k + 1) % order.length]; });
    const S = Object.fromEntries(sus.map((s) => [s.role, s]));
    const twinRole = r.pick(['RH', 'A', 'B']);
    const feats = r.shuffle(['print', 'cipher', 'safe']).slice(0, num >= 3 ? 3 : 2);
    const id = 'c' + num;
    const c = {
      id, type: 'standard', num, title: r.pick(DATA.SCENE_INFO[place] ? DATA.SCENE_INFO[place].titles : ['Sessiz Sokak', 'Son Akşam', 'Kapalı Perdeler', 'Gece Ziyaretçisi', 'Soğuk Çay', 'Yarım Kalan Mektup', 'Kırık Pencere', 'Unutulan Şemsiye']),
      victim: victim.id, culprit: C.id, suspects: sus, method, weapon: method === 'kunt' ? (DATA.SCENE_INFO[place] ? DATA.SCENE_INFO[place].weapon : 'ağır bir şamdan') : DATA.METHODS[method].weapon,
      sceneAttrs, culpritVals: Object.fromEntries(sceneAttrs.map((k) => [k, C.attrs[k]])), tod: h, day,
      feats: { print: feats.includes('print'), cipher: feats.includes('cipher'), safe: feats.includes('safe') && !['park', 'docks', 'cemetery'].includes(place) },
      net: !!opts.agent, status: 'pending', wrong: 0,
      k: { sus: Object.fromEntries(sus.map((s) => [s.pid, { motive: false, alibi: false, gossip: false, read: false, readOk: false, checked: false, out: false, heard: [] }])), print: false, cipher: false, safe: false },
    };
    // parmak izi / şifre / kasa
    if (c.feats.print) {
      const twin = r.pick(sus.filter((s) => s.role !== 'C' && s.role !== twinRole)).pid;
      c.print = genPrints(r, sus.map((s) => s.pid), C.id, twin);
    }
    if (c.feats.cipher) {
      // şifreli not: katilin baş harfi + bir masumun baş harfi aynı olmalı ki tek başına çözdürmesin
      // imza: katilin ad ya da soyad baş harfi; ama mümkünse bir masumla ortak olanı seçilir
      const ascii = (ch) => ch.replace('İ', 'I').replace('Ş', 'S').replace('Ç', 'C').replace('Ö', 'O').replace('Ü', 'U').replace('Ğ', 'G');
      const inn = innocents.map((s) => s.p);
      let ini = null;
      if (inn.some((q) => q.first[0] === C.first[0])) ini = C.first[0];
      else if (inn.some((q) => q.last[0] === C.last[0])) ini = C.last[0];
      const sign = ini ? ` -${ascii(ini)}.` : '';
      const plain = `BU GECE SAAT ${U.hm(h + 0.25)} GIBI BULUSALIM. KONUSMAMIZ LAZIM. KIMSEYE SOYLEME.${sign}`;
      const shift = r.int(3, 11);
      c.cipher = { plain, shift, text: CASES.caesar(plain, shift), initial: ini ? ascii(ini) : null };
    }
    if (c.feats.safe) c.safe = Object.assign(genSafe(r), { doc: r.shuffle([DATA.MOTIVES[S.C.motive].doc(C.name), DATA.MOTIVES[S.RH.motive].doc(POP.get(S.RH.pid).name)]) });
    // telefon kaydı
    const calls = [
      { t: h - 0.75, num: C.phone, dur: 2 },
      { t: h - 3, num: POP.get(S.RH.pid).phone, dur: r.int(3, 9) },
      { t: r.pick([10.25, 11.5, 14.1, 16.4]), num: POP.get(S.A.pid).phone, dur: r.int(1, 6) },
    ];
    const items = [{ title: 'Telefon', text: CASES.phoneLog(calls), kind: 'phone', nums: calls.map((x) => x.num) }];
    const earlier = r.pick(['cafe', 'restaurant', 'shop', 'bar']);
    items.push({ title: 'Makbuz', text: `${DATA.PLACES[earlier].name} — saat ${U.hm(h - 2.5)}. “2 kişilik” yazıyor.` });
    if (c.feats.cipher) items.push({ title: 'Şifreli not', text: 'Ceket astarına sıkıştırılmış, harfleri karışık bir not. Bir tür kaydırma şifresi olabilir.', kind: 'cipher', hidden: true });
    if (c.net) items.push({ title: 'Buruşuk kâğıt', text: '“LION LION — Teslimat tamam. Konuşursa sorun.” El yazısı değil, daktilo.', kind: 'lion', hidden: true });
    const extra = [];
    if (c.feats.print) extra.push({ id: 'print', title: 'Kısmi parmak izi', text: 'Masadaki kadehte kısmi bir parmak izi. Laboratuvarda Sam karşılaştırabilir.' });
    c.sceneId = 's_' + id;
    const scene = CASES.makeScene({ id: c.sceneId, caseId: id, kind: 'standard', seed: seed + attempt, place, victim: victim.id, killer: C.id, method, weapon: c.weapon, day, tod: h, traces: sceneAttrs, trace: true, items, extraClues: extra, safe: c.feats.safe });
    if (c.feats.safe && !scene.safe) c.feats.safe = false;
    // komşu tanık
    const nbs = CASES.neighborsOf(place).filter((p) => !sus.some((s) => s.pid === p.id));
    const wit = nbs.length ? r.pick(nbs) : r.pick(elig.filter((p) => p !== victim && !sus.some((s) => s.pid === p.id)));
    c.witness = {
      pid: wit.id,
      text: sceneAttrs.includes('vehicle')
        ? `O gece saat ${U.hm(h + 0.4)} civarı bir motor sesi duydum. Pencereden baktım: bir ${C.attrs.vehicle} hızla uzaklaştı. Plakasını göremedim.`
        : `O gece saat ${U.hm(h + 0.4)} civarı bir kapı çarptı, sonra hızlı adım sesleri. Sis vardı, kimseyi seçemedim.`,
    };
    return { c, scene };
  }
  return null;
};

function genPrints(r, ids, culpritId, twinId) {
  const N = 6, S = 4;
  const rand = () => Array.from({ length: N }, () => Array.from({ length: N }, () => r.int(0, S - 1)));
  for (let attempt = 0; attempt < 200; attempt++) {
    const grids = {};
    ids.forEach((id) => { grids[id] = rand(); });
    const pat = [[r.int(0, S - 1), r.int(0, S - 1), r.int(0, S - 1)], [r.int(0, S - 1), r.int(0, S - 1), r.int(0, S - 1)]];
    const place = (g) => { const y = r.int(0, N - 2), x = r.int(0, N - 3); for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) g[y + j][x + i] = pat[j][i]; };
    place(grids[culpritId]); place(grids[twinId]);
    if (ids.every((id) => CASES.containsPattern(grids[id], pat) === (id === culpritId || id === twinId))) return { grids, partial: pat, matches: [culpritId, twinId].sort() };
  }
  throw new Error('parmak izi üretilemedi');
}

CASES.containsPattern = function (grid, pat) {
  const n = grid.length, ph = pat.length, pw = pat[0].length;
  for (let y = 0; y + ph <= n; y++) for (let x = 0; x + pw <= n; x++) {
    let ok = true;
    for (let j = 0; j < ph && ok; j++) for (let i = 0; i < pw; i++) if (grid[y + j][x + i] !== pat[j][i]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
};

CASES.scoreCode = function (g, code) {
  let p = 0, w = 0;
  for (let i = 0; i < 3; i++) { if (g[i] === code[i]) p++; else if (code.includes(g[i])) w++; }
  return [p, w];
};

function genSafe(r) {
  const all = [];
  for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) for (let c = 0; c < 10; c++) if (a !== b && b !== c && a !== c) all.push([a, b, c]);
  for (let attempt = 0; attempt < 300; attempt++) {
    const code = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    let cands = all;
    const hints = [];
    let tries = 0;
    while (cands.length > 1 && hints.length < 6 && tries < 300) {
      tries++;
      const g = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
      if (g.join('') === code.join('')) continue;
      const fb = CASES.scoreCode(g, code);
      const next = cands.filter((x) => { const s = CASES.scoreCode(g, x); return s[0] === fb[0] && s[1] === fb[1]; });
      if (next.length === cands.length) continue;
      if (next.length === 1 && hints.length < 3) continue;
      hints.push({ g, p: fb[0], w: fb[1] });
      cands = next;
    }
    if (cands.length === 1 && hints.length >= 4) return { code, hints };
  }
  throw new Error('kasa şifresi üretilemedi');
}

CASES.hintText = function (h) {
  const n = ['hiç', 'Bir', 'İki', 'Üç'];
  if (h.p === 0 && h.w === 0) return 'Hiçbir rakam doğru değil.';
  const parts = [];
  if (h.p) parts.push(`${n[h.p]} rakam doğru ve doğru yerde`);
  if (h.w) parts.push(`${parts.length ? n[h.w].toLowerCase() : n[h.w]} rakam doğru ama yanlış yerde`);
  return parts.join('; ') + '.';
};

CASES.caesar = function (text, shift) {
  return text.replace(/[A-Z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift + 26) % 26) + 65));
};

// =====================================================================================
// SERİ KATİL
// =====================================================================================
CASES.startSerial = function (seed, exclude) {
  const r = U.rng(seed);
  const elig = POP.people.filter((p) => CASES.eligible(p) && !p.special && p.age >= 25 && p.age <= 62 && !exclude.includes(p.id) && /^h\d+$/.test(p.home));
  const killer = r.pick(elig);
  const sigIdx = r.int(0, DATA.SERIAL.signatures.length - 1);
  const order = r.shuffle(DATA.ATTR_KEYS.filter((k) => !NONE_VALS.has(killer.attrs[k]) && k !== 'vehicle' && k !== 'hand'));
  const patterns = [
    { id: 'alone', text: 'Kurbanların hepsi o gece evde YALNIZDI.', test: (p) => POP.people.filter((q) => q.home === p.home && q.alive).length <= 3 },
    { id: 'age', text: 'Kurbanların hepsi 40 yaşın üzerinde.', test: (p) => p.age > 40 },
    { id: 'walk', text: 'Kurbanlar akşam yürüyüşü yapmayı seven insanlar.', test: () => true },
  ];
  const pat = r.pick(patterns);
  return {
    id: 'serial', type: 'serial', killer: killer.id, name: DATA.SERIAL.names[sigIdx], sigIdx, order,
    pattern: { id: pat.id, text: pat.text }, scenes: [], kills: 0, nextKill: null, status: 'active', wrong: 0,
  };
};

CASES.serialPatternTest = function (id) {
  if (id === 'alone') return (p) => POP.people.filter((q) => q.home === p.home && q.alive).length <= 3;
  if (id === 'age') return (p) => p.age > 40;
  return () => true;
};

CASES.serialKill = function (serial, day, seed, exclude) {
  const r = U.rng(seed);
  const K = POP.get(serial.killer);
  const test = CASES.serialPatternTest(serial.pattern.id);
  const elig = POP.people.filter((p) => CASES.eligible(p) && p !== K && !p.special && !exclude.includes(p.id) && test(p));
  const victim = r.pick(elig.length ? elig : POP.people.filter((p) => CASES.eligible(p) && p !== K));
  const k = serial.kills;
  const outdoor = r.chance(0.4);
  const place = outdoor ? r.pick(['park', 'docks', 'cemetery']) : victim.home;
  const tod = r.pick([22, 23, 24]);
  const method = r.pick(['bogma', 'bicak', 'zehir']);
  const traces = [serial.order[k % serial.order.length]];
  if (k >= 2 && serial.order[(k + 1) % serial.order.length]) traces.push(serial.order[(k + 1) % serial.order.length]);
  const sig = DATA.SERIAL.signatures[serial.sigIdx];
  const items = [
    { title: sig.item, text: sig.text, kind: 'sig' },
    { title: 'Katilin notu', text: `Daktiloyla yazılmış: “${DATA.SERIAL.notes[Math.min(k, DATA.SERIAL.notes.length - 1)]}”`, kind: 'taunt', hidden: k > 0 },
  ];
  if (k >= 1) items.push({ title: 'Kopmuş düğme', text: `Kurbanın tırnaklarının arasında kopmuş bir düğme: rengi ${colorName(K.spec.jacket || K.spec.top)}. Katilin kıyafetinden olabilir.`, kind: 'button', hidden: true });
  const scene = CASES.makeScene({ id: 's_serial_' + (k + 1), caseId: 'serial', kind: 'serial', seed, place, victim: victim.id, killer: K.id, method, weapon: DATA.METHODS[method].weapon || 'ağır bir cisim', day, tod, traces, trace: false, items, flavor: 1 });
  // tanıklar: komşular ya da parkta/iskelede olanlar
  const pool = outdoor ? POP.people.filter((p) => CASES.eligible(p) && p !== K && p !== victim && /^h\d+$/.test(p.home)) : CASES.neighborsOf(place);
  const glimpses = r.shuffle(['gender', 'hair', 'vehicle', 'coat']).slice(0, k >= 2 ? 2 : 1);
  const wits = r.shuffle(pool).slice(0, glimpses.length);
  scene.witnesses = wits.map((w, i) => ({ pid: w.id, glimpse: glimpses[i], text: CASES.glimpseText(glimpses[i], K, tod) }));
  return { scene, victim };
};

function colorName(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx < 60) return 'siyah';
  if (mn > 200) return 'beyaz';
  if (mx - mn < 25) return mx > 150 ? 'açık gri' : 'koyu gri';
  if (r >= g && r >= b) return g > 150 ? 'sarı' : (b > 90 && r > 120 ? 'bordo' : (g > 90 ? 'turuncu' : 'kırmızı'));
  if (g >= r && g >= b) return 'yeşil';
  return r > 80 ? 'mor' : 'mavi';
}
CASES.colorName = colorName;

CASES.glimpseText = function (kind, K, tod) {
  const t = U.hm(tod + 0.3);
  if (kind === 'gender') return `Saat ${t} gibi pencereden baktım. Bir ${K.g === 'f' ? 'KADIN' : 'ERKEK'} siluetiydi, aceleyle uzaklaştı.`;
  if (kind === 'hair') return `Saat ${t} civarı sokak lambasının altından biri geçti. Saçları ${K.attrs.hair.toUpperCase()} renkteydi, ondan eminim.`;
  if (kind === 'vehicle') return K.attrs.vehicle === 'aracı yok' ? `Saat ${t} gibi biri yürüyerek uzaklaştı, araba sesi duymadım.` : `Saat ${t} gibi bir ${K.attrs.vehicle.toUpperCase()} köşeden döndü, farları kapalıydı.`;
  return `Saat ${t} gibi biri koşarak geçti. Üstünde ${colorName(K.spec.jacket || K.spec.top).toUpperCase()} bir ceket ya da gömlek vardı.`;
};

// =====================================================================================
// YELLOW BEA'NIN TUZAK CİNAYETİ (Jade'i suçlu göstermek için)
// =====================================================================================
CASES.frameKill = function (fdef, agentId, victimId, day, tod, seed) {
  const r = U.rng(seed);
  const victim = POP.get(victimId);
  const place = victim.home && /^h\d+$/.test(victim.home) ? victim.home : 'park';
  const method = r.pick(['kunt', 'bogma', 'zehir']);
  const items = [];
  const extra = [];
  if (fdef.id === 'card') items.push({ title: 'Kartvizit', text: fdef.text, kind: 'frame' });
  else if (fdef.id === 'cup' || fdef.id === 'tea') extra.push({ id: 'frame', title: fdef.title, text: fdef.text, frame: true });
  items.push({ title: 'Buruşuk kâğıt', text: '“LION LION.” Altında küçük, sarı bir arı çizimi var.', kind: 'lion', hidden: true });
  const A = POP.get(agentId);
  const traces = r.shuffle(['shoe', 'hair', 'smoke', 'scent'].filter((k) => !NONE_VALS.has(A.attrs[k]))).slice(0, 2);
  const scene = CASES.makeScene({ id: 's_frame_' + day, caseId: 'frame_' + day, kind: 'frame', seed, place, victim: victimId, killer: agentId, method, weapon: DATA.METHODS[method].weapon || 'ağır bir şamdan', day, tod, traces, trace: true, items, extraClues: extra, flavor: 1, frame: fdef.id });
  return scene;
};
