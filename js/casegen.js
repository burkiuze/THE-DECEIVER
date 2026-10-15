'use strict';
// Dava üreticisi. Her dava tohumdan (seed) üretilir ve şu garantileri verir:
//  * Olay yerindeki 3 fiziksel iz (ayak izi, saç, sigara, koku, el, araç arasından)
//    yalnızca katille TAM eşleşir; masumların her biri en az birinde uyuşmaz.
//  * Diğer ipuçları (mazeret, parmak izi, şifreli not, kasa) tek başına iki kişiyi
//    işaret eder; oyuncunun ipuçlarını birleştirerek düşünmesi gerekir.

const CASEGEN = {};

const SCENE_WORD = { mansion: 'MALIKANEYE', warehouse: 'DEPOYA', gallery: 'GALERIYE', vineyard: 'BAG EVINE', hotel: 'OTELE', bar: 'BARA' };
const SKINS = ['#f2c9a0', '#eebf98', '#e3b98f', '#d9a77c', '#c99872', '#a8724f', '#8d5b3e', '#6b4430'];
const CLOTHES = ['#7a2f3a', '#3a5a8a', '#3a6b4a', '#8a6b3d', '#5a3a6b', '#2f4f4f', '#b36b4a', '#4b555e', '#9a3a5a', '#c9a24a', '#5a7ec9', '#6b8a3a', '#e8dcc8', '#2b2430'];
const BOTTOMS = ['#2b2430', '#3b3f4a', '#4b3626', '#2c3e66', '#5b4a3a', '#1f2a33'];

CASEGEN.makeSpec = function (r, gender, hairName) {
  const female = gender === 'f';
  const hair = DATA.HAIR_COLORS[hairName];
  const styles = female ? ['long', 'bun', 'ponytail', 'short'] : (hairName === 'kır' ? ['bald', 'short', 'slick'] : ['short', 'slick', 'short']);
  const spec = {
    skin: r.pick(SKINS), hair, hairStyle: r.pick(styles),
    top: r.pick(CLOTHES), bottom: r.pick(BOTTOMS), shoes: r.pick(['#2d2a2a', '#5a3a22', '#1a1a1a', '#7a4a2a']),
  };
  if (female) { spec.female = true; if (r.chance(0.4)) { spec.dress = true; spec.bottom = r.pick(CLOTHES); } }
  if (r.chance(0.45)) spec.jacket = r.pick(BOTTOMS.concat(['#6b4426', '#7d8a96']));
  if (!female && r.chance(0.3)) spec.beard = hair;
  if (r.chance(0.2)) spec.glasses = true;
  return spec;
};

function pickNames(r, count) {
  const pool = DATA.NAMES_M.map((n) => ({ n, g: 'm' })).concat(DATA.NAMES_F.map((n) => ({ n, g: 'f' })));
  const byInit = {};
  for (const p of pool) (byInit[p.n[0]] = byInit[p.n[0]] || []).push(p);
  const shared = Object.keys(byInit).filter((k) => byInit[k].length >= 2);
  const init = r.pick(shared);
  const pair = r.shuffle(byInit[init]).slice(0, 2);
  const used = new Set(pair.map((p) => p.n));
  const others = r.shuffle(pool.filter((p) => p.n[0] !== init));
  const rest = [];
  const usedInit = new Set();
  for (const p of others) {
    if (rest.length >= count) break;
    if (used.has(p.n) || usedInit.has(p.n[0])) continue;
    rest.push(p); usedInit.add(p.n[0]);
  }
  return { culprit: pair[0], twin: pair[1], rest };
}

function containsPattern(grid, pat) {
  const n = grid.length, ph = pat.length, pw = pat[0].length;
  for (let y = 0; y + ph <= n; y++) for (let x = 0; x + pw <= n; x++) {
    let ok = true;
    for (let j = 0; j < ph && ok; j++) for (let i = 0; i < pw; i++) if (grid[y + j][x + i] !== pat[j][i]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}
CASEGEN.containsPattern = containsPattern;

function genPrints(r, ids, culpritId, twinId) {
  const N = 6, S = 4;
  const rand = () => Array.from({ length: N }, () => Array.from({ length: N }, () => r.int(0, S - 1)));
  for (let attempt = 0; attempt < 200; attempt++) {
    const grids = {};
    ids.forEach((id) => { grids[id] = rand(); });
    const pat = [[r.int(0, S - 1), r.int(0, S - 1), r.int(0, S - 1)], [r.int(0, S - 1), r.int(0, S - 1), r.int(0, S - 1)]];
    const place = (g) => { const y = r.int(0, N - 2), x = r.int(0, N - 3); for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) g[y + j][x + i] = pat[j][i]; };
    place(grids[culpritId]); place(grids[twinId]);
    const ok = ids.every((id) => containsPattern(grids[id], pat) === (id === culpritId || id === twinId));
    if (ok) return { grids, partial: pat, matches: [culpritId, twinId].sort() };
  }
  throw new Error('parmak izi üretilemedi');
}

function scoreCode(g, code) {
  let p = 0, w = 0;
  for (let i = 0; i < 3; i++) { if (g[i] === code[i]) p++; else if (code.includes(g[i])) w++; }
  return [p, w];
}
CASEGEN.scoreCode = scoreCode;

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
      const fb = scoreCode(g, code);
      const next = cands.filter((x) => { const s = scoreCode(g, x); return s[0] === fb[0] && s[1] === fb[1]; });
      if (next.length === cands.length) continue;
      if (next.length === 1 && hints.length < 3) continue; // en az 4 ipucu olsun
      hints.push({ g, p: fb[0], w: fb[1] });
      cands = next;
    }
    if (cands.length === 1 && hints.length >= 4) return { code, hints };
  }
  throw new Error('kasa şifresi üretilemedi');
}

CASEGEN.hintText = function (h) {
  const n = ['hiç', 'Bir', 'İki', 'Üç'];
  if (h.p === 0 && h.w === 0) return 'Hiçbir rakam doğru değil.';
  const parts = [];
  if (h.p) parts.push(`${n[h.p]} rakam doğru ve doğru yerde`);
  if (h.w) parts.push(`${parts.length ? n[h.w].toLowerCase() : n[h.w]} rakam doğru ama yanlış yerde`);
  return parts.join('; ') + '.';
};

function caesar(text, shift) {
  return text.replace(/[A-Z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift + 26) % 26) + 65));
}
CASEGEN.caesar = caesar;

// Kapıdan erişilebilirliği bozmadan katı bir nesne konabilir mi?
function keepsConnected(m, free, tx, ty) {
  const W = m.w, H = m.h;
  const blocked = (x, y) => (x === tx && y === ty) || m.solid[y * W + x];
  const seen = new Set();
  const start = [m.door.x, H - 2];
  const q = [start];
  seen.add(start.join(','));
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || blocked(nx, ny)) continue;
      const k = nx + ',' + ny;
      if (seen.has(k)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return free.every(([x, y]) => (x === tx && y === ty) || seen.has(x + ',' + y));
}

CASEGEN.generate = function (seed, num) {
  const r = U.rng(seed);
  const scene = r.pick(DATA.SCENE_PLACES);
  const info = DATA.SCENE_INFO[scene];
  const sceneAttrs = r.shuffle(DATA.ATTR_KEYS).slice(0, 3);
  const method = sceneAttrs.includes('hand')
    ? r.pick(DATA.METHOD_KEYS.filter((k) => DATA.METHODS[k].hand))
    : r.pick(DATA.METHOD_KEYS);
  const M = DATA.METHODS[method];
  const weapon = method === 'kunt' ? info.weapon : M.weapon;

  // --- isimler ve roller
  const names = pickNames(r, 4);
  const surnames = r.shuffle(DATA.SURNAMES);
  const victimP = names.rest[3];
  const roles = ['C', 'RH', 'A', 'B'];
  const twinRole = r.pick(['RH', 'A', 'B']);
  const people = { C: names.culprit };
  let restI = 0;
  for (const role of ['RH', 'A', 'B']) people[role] = role === twinRole ? names.twin : names.rest[restI++];

  // --- özellikler
  const A = DATA.ATTRS;
  const randVal = (key) => {
    if (key === 'hand') return r.chance(0.2) ? 'sol' : 'sağ';
    if (A[key].none && r.chance(0.45)) return A[key].none;
    return r.pick(A[key].values);
  };
  const diffVal = (key, v) => {
    if (key === 'hand') return v === 'sol' ? 'sağ' : 'sol';
    const opts = A[key].values.filter((x) => x !== v);
    if (A[key].none) opts.push(A[key].none, A[key].none);
    return r.pick(opts);
  };
  const culpritVals = {};
  for (const key of DATA.ATTR_KEYS) {
    if (key === 'hand') culpritVals.hand = sceneAttrs.includes('hand') ? (r.chance(0.65) ? 'sol' : 'sağ') : randVal('hand');
    else if (sceneAttrs.includes(key)) culpritVals[key] = r.pick(A[key].values);
    else culpritVals[key] = randVal(key);
  }
  const matchSets = {
    C: [0, 1, 2],
    RH: r.shuffle([0, 1, 2]).slice(0, 2),
    A: r.shuffle([0, 1, 2]).slice(0, 1),
    B: r.shuffle([0, 1, 2]).slice(0, r.int(1, 2)),
  };
  const motives = r.shuffle(DATA.MOTIVE_KEYS).slice(0, 4);
  const hangouts = r.shuffle(DATA.HANGOUTS.filter((p) => p !== scene)).slice(0, 4);
  const h = r.pick([20, 21, 22]);
  const alibiPlaces = DATA.ALIBI_PLACES.filter((p) => p !== scene);
  const reads = r.shuffle(DATA.COLD_READS);

  const suspects = roles.map((role, i) => {
    const p = people[role];
    const attrs = {};
    for (const key of DATA.ATTR_KEYS) {
      const si = sceneAttrs.indexOf(key);
      if (role === 'C') attrs[key] = culpritVals[key];
      else if (si >= 0) attrs[key] = matchSets[role].includes(si) ? culpritVals[key] : diffVal(key, culpritVals[key]);
      else attrs[key] = randVal(key);
    }
    const mot = motives[i];
    return {
      id: 's' + i, role, name: p.n + ' ' + surnames[i], first: p.n, gender: p.g,
      spec: CASEGEN.makeSpec(r, p.g, attrs.hair),
      motive: mot, relation: r.pick(DATA.MOTIVES[mot].rel),
      loc: hangouts[i], attrs,
    };
  });
  const S = Object.fromEntries(suspects.map((s) => [s.role, s]));

  // --- mazeretler
  for (const s of suspects) {
    if (s.role === 'RH') {
      s.alibi = { place: null, claim: 'Evdeydim. Yalnızdım. Biraz kitap okudum, erkenden yattım. Bunu kimse doğrulayamaz, biliyorum.' };
      continue;
    }
    const place = r.pick(alibiPlaces);
    const arrive = h - r.pick([1, 1.5]);
    s.alibi = {
      place,
      claim: `${DATA.ALIBI_CLAIM[place]}. Saat ${U.hm(arrive)} civarı gittim, gece yarısına kadar oradaydım.`,
    };
    if (s.role === 'A') {
      s.alibi.truth = `Evet, saat ${U.hm(arrive)} civarı geldi ve gece yarısına kadar buradaydı. Bir an bile ayrılmadı, gözüm üstündeydi.`;
      s.alibi.ok = true;
    } else if (s.role === 'C') {
      const left = h - 1 / 3;
      s.alibi.truth = `Saat ${U.hm(arrive)} civarı geldi, doğru. Ama ${U.hm(left)} gibi bir telefon aldı ve aceleyle çıktı. Bir daha da dönmedi.`;
      s.alibi.ok = false;
    } else {
      const left = h - 0.5;
      s.alibi.truth = `Saat ${U.hm(arrive)} civarı geldi. Ama ${U.hm(left)} gibi hesabı ödeyip çıktı; gece yarısına kadar kalmadı, eminim.`;
      s.alibi.ok = false;
    }
  }

  // --- soğuk okumalar
  const trace = info.trace;
  const traceRead = (secret) => ({ obs: trace.obs, right: trace.right, wrong: trace.wrong.slice(), secret, trace: true });
  S.C.read = traceRead('Ben... evet, oraya uğramıştım. Birkaç gün önce. Hepsi bu, başka bir şey yok.');
  S.RH.read = traceRead('Tamam! O gün öğleden sonra uğradım. Tartıştık, sonra çıktım gittim. Akşam evdeydim, yemin ederim!');
  S.A.read = Object.assign({}, reads[0]);
  S.B.read = Object.assign({}, reads[1], { altAlibi: true });

  // --- dedikodular (her şüpheli bir başkası hakkında konuşur)
  const order = r.shuffle(suspects.map((s) => s.id));
  suspects.forEach((s) => {
    const k = order.indexOf(s.id);
    s.gossipAbout = order[(k + 1) % order.length];
  });

  // --- ek özellikler (parmak izi, şifreli not, kasa)
  const featCount = num >= 3 ? 3 : 2;
  const featList = r.shuffle(['print', 'cipher', 'safe']).slice(0, featCount);
  const feats = { print: featList.includes('print'), cipher: featList.includes('cipher'), safe: featList.includes('safe') };

  const c = {
    seed, num,
    title: r.pick(info.titles),
    scene, method, weapon, tod: h,
    discovery: 6, bodyTemp: h + 7.5,
    sceneAttrs, culpritVals,
    victim: { name: victimP.n + ' ' + surnames[5], gender: victimP.g, job: r.pick(info.victimJobs) },
    finder: info.finder,
    suspects,
    feats,
  };

  if (feats.print) {
    const twin = r.pick(suspects.filter((s) => s.role !== 'C' && s.role !== twinRole)).id;
    c.print = genPrints(r, suspects.map((s) => s.id), S.C.id, twin);
  }
  if (feats.cipher) {
    const plain = `BU GECE SAAT ${U.hm(h + 0.25)} GIBI ${SCENE_WORD[scene]} GEL. KONUSMAMIZ LAZIM. KIMSEYE SOYLEME. -${S.C.first[0]}.`;
    const shift = r.int(3, 11);
    c.cipher = { plain, shift, text: caesar(plain, shift), initial: S.C.first[0] };
  }
  if (feats.safe) {
    const safe = genSafe(r);
    const lines = r.shuffle([DATA.MOTIVES[S.C.motive].doc(S.C.name), DATA.MOTIVES[S.RH.motive].doc(S.RH.name)]);
    c.safe = Object.assign(safe, { doc: lines });
  }

  // --- olay yeri ipuçları ve konumları
  const m = WORLD.maps[scene];
  let free = r.shuffle(WORLD.free[scene]);
  const clues = [];
  const take = () => free.shift();
  for (const key of sceneAttrs) {
    const v = culpritVals[key];
    if (key === 'shoe') clues.push({ id: 'shoe', attr: 'shoe', title: 'Ayak izi', text: `Yerde çamurlu bir ayakkabı izi. Ölçtün: ${v} numara.` });
    if (key === 'smoke') clues.push({ id: 'smoke', attr: 'smoke', title: 'Sigara izmariti', text: `Kurban sigara içmezmiş. Yerdeki izmaritin markası: ${v}.` });
    if (key === 'hair') clues.push({ id: 'hair', attr: 'hair', hidden: true, title: 'Yabancı saç teli', text: `Kurbanın yakasında ona ait olmayan, ${v} bir saç teli.` });
    if (key === 'scent') clues.push({ id: 'scent', attr: 'scent', hidden: true, title: 'Parfüm kokusu', text: `Perdelere sinmiş hafif bir ${v} kokusu. Kurban parfüm kullanmazmış.` });
  }
  clues.push({ id: 'trace', title: trace.clue[0], text: trace.clue[1] });
  const flavor = r.shuffle(DATA.FLAVOR_CLUES).slice(0, 2);
  for (const f of flavor) clues.push({ id: 'fl_' + f.id, title: f.title, text: f.text(h) });
  if (feats.print) clues.push({ id: 'print', title: 'Kısmi parmak izi', text: 'Masadaki kadehte net olmayan, kısmi bir parmak izi. Laboratuvarda Sam karşılaştırabilir.' });
  if (feats.cipher) clues.push({ id: 'cipher', hidden: true, title: 'Şifreli not', text: 'Kurbanın cebinden çıkan, harfleri karışık bir not. Bir tür kaydırma şifresi olabilir.' });
  for (const cl of clues) { const t = take(); cl.x = t[0]; cl.y = t[1]; }
  if (feats.safe) {
    const top = free.filter(([x, y]) => y === 2 && keepsConnected(m, WORLD.free[scene], x, y));
    const spot = top.length ? top[0] : free[0];
    free = free.filter((t) => t !== spot);
    c.safe.x = spot[0]; c.safe.y = spot[1];
  }
  c.clues = clues;

  // --- komşu tanık
  const nG = r.chance(0.5) ? 'f' : 'm';
  const nName = (nG === 'f' ? r.pick(['Bayan Odell', 'Bayan Finch', 'Bayan Lark']) : r.pick(['Bay Odell', 'Bay Finch', 'Bay Lark']));
  c.neighbor = {
    name: nName + ' (komşu)',
    spec: CASEGEN.makeSpec(r, nG, r.pick(['kır', 'kahverengi', 'siyah'])),
    text: sceneAttrs.includes('vehicle')
      ? `Gece saat ${U.hm(h + 0.4)} civarı bir motor sesi duydum. Pencereden baktım: kapının önünden bir ${culpritVals.vehicle} hızla uzaklaştı. Plakasını göremedim.`
      : `Gece saat ${U.hm(h + 0.4)} civarı bir kapı çarptı, sonra hızlı adım sesleri. Sis vardı, kimseyi seçemedim.`,
  };

  // --- son kontrol: olay yeri profiline yalnızca katil uymalı
  const fits = suspects.filter((s) => sceneAttrs.every((k) => s.attrs[k] === culpritVals[k]));
  if (fits.length !== 1 || fits[0].role !== 'C') throw new Error('dava tutarsız');

  c.suspects = r.shuffle(suspects);
  return c;
};

CASEGEN.newKnowledge = function (c) {
  const sus = {};
  for (const s of c.suspects) sus[s.id] = { met: false, motive: false, alibi: false, gossip: false, read: false, readOk: false, bg: false, checked: false, out: false, heard: [] };
  return {
    briefed: false, found: {}, autopsy: false, neighbor: false, sus,
    print: false, cipher: false, safe: false, evidence: [], notes: '', wrong: 0, sceneVisited: false,
  };
};
