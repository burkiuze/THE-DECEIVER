'use strict';
// Nüfus: 150+ kasabalı. Her birinin evi, işi, görünüşü, fiziksel özellikleri,
// ilişkileri ve saatlik programı var. Programlar deterministiktir (gün + saat + kişi).

const POP = { people: [], byId: {} };

const SKINS = ['#f2c9a0', '#eebf98', '#e3b98f', '#d9a77c', '#c99872', '#a8724f', '#8d5b3e', '#6b4430'];
const CLOTH = ['#7a2f3a', '#3a5a8a', '#3a6b4a', '#8a6b3d', '#5a3a6b', '#2f4f4f', '#b36b4a', '#4b555e', '#9a3a5a', '#c9a24a', '#5a7ec9', '#6b8a3a', '#e8dcc8', '#2b2430', '#c96f4a', '#4a8a8a', '#a33a2e', '#d9b07a'];
const PANTS = ['#2b2430', '#3b3f4a', '#4b3626', '#2c3e66', '#5b4a3a', '#1f2a33', '#6b6b5a'];
const EYES = ['#3a2a2a', '#3a6ad2', '#3a8a5a', '#6b4a2a', '#5a5a6a'];
const REL_LABEL = { spouse: 'eşi', child: 'çocuğu', parent: 'ebeveyni', sibling: 'kardeşi', roommate: 'ev arkadaşı', coworker: 'iş arkadaşı', neighbor: 'komşusu', friend: 'arkadaşı', enemy: 'husumetlisi' };
POP.REL_LABEL = REL_LABEL;

POP.get = (id) => POP.byId[id];
POP.alive = () => POP.people.filter((p) => p.alive && !p.jailed && !p.gone);

function makeSpec(r, p) {
  const f = p.g === 'f';
  const old = p.age >= 62;
  const hairName = p.attrs.hair;
  const s = { skin: r.pick(SKINS), hair: DATA.HAIR_COLORS[hairName], eyeColor: r.pick(EYES), top: r.pick(CLOTH), bottom: r.pick(PANTS), shoes: r.pick(['#2d2a2a', '#5a3a22', '#1a1a1a', '#7a4a2a', '#e8e6df']) };
  if (f) { s.female = true; s.hairStyle = r.pick(['long', 'bob', 'bun', 'ponytail', 'braids', 'short', 'afro', 'long']); if (r.chance(0.35)) { s.dress = true; s.bottom = r.pick(CLOTH); } if (r.chance(0.3)) s.earrings = r.pick(['#e8c35a', '#c0c6cc']); if (r.chance(0.3)) s.lips = r.pick(['#b8434a', '#a33a5a', '#c96f6a']); }
  else { s.hairStyle = old && r.chance(0.5) ? 'bald' : r.pick(['short', 'slick', 'short', 'spiky', 'buzz', 'afro', 'curly']); if (s.hairStyle === 'curly' && hairName === 'sarı') s.hairStyle = 'short'; if (r.chance(0.35)) { s.beard = s.hair; s.beardStyle = r.pick(['full', 'mustache', 'goatee', 'stubble']); } }
  if (old) s.old = true;
  if (r.chance(0.2)) s.glasses = true;
  if (r.chance(0.3)) s.jacket = r.pick(PANTS.concat(['#6b4426', '#7d8a96', '#4a5a3a']));
  if (r.chance(0.12)) s.scarf = r.pick(CLOTH);
  if (!f && r.chance(0.12)) s.stripes = SH(s.top, -0.25);
  // mesleğe göre giyim
  const j = p.job;
  if (j === 'polis memuru') { s.top = '#2c3e66'; s.bottom = '#2c3e66'; s.uniform = true; s.hat = { type: 'police', color: '#1f2d4d' }; s.jacket = null; s.dress = false; }
  if (/FBI|CIA|savcı|Senatör|Müdür|banka müdürü|Başkanı/.test(j)) { s.jacket = r.pick(['#1f2a33', '#2b2430', '#3b3f4a']); s.top = '#f4f1ea'; s.tie = r.pick(['#7a2f3a', '#2c3e66', '#2b2f38']); s.bottom = s.jacket; s.dress = false; if (r.chance(0.3)) s.glasses = 'sun'; }
  if (j === 'aşçı') { s.top = '#f4f1ea'; s.apron = '#e8e6df'; }
  if (j === 'barista' || j === 'garson' || j === 'bakkal') s.apron = r.pick(['#4b3626', '#2f5a4a', '#3a6b4a']);
  if (j === 'balıkçı' || j === 'liman işçisi') { s.top = r.pick(['#f07a2a', '#2f6b9a', '#4a5a3a']); s.bottom = '#2c3e66'; s.hat = { type: 'beanie', color: r.pick(['#a33a2e', '#2c3e66', '#4a5a3a']) }; s.dress = false; }
  if (j === 'rahip') { s.top = '#1f1b20'; s.bottom = '#1f1b20'; s.jacket = null; s.scarf = null; s.tie = null; s.collar = true; s.dress = false; }
  if (j === 'bağ işçisi' || j === 'fener bekçisi') s.hat = { type: r.pick(['sunhat', 'cowboy', 'cap']), color: r.pick(['#d9b07a', '#8a6b3d', '#a33a2e']) };
  if (j === 'emekli' && !f && r.chance(0.4)) s.hat = { type: 'fedora', color: r.pick(['#5a4a3a', '#3b3f4a', '#8a7a5a']) };
  if (j === 'öğrenci' && r.chance(0.4)) s.hat = { type: 'cap', color: r.pick(CLOTH) };
  if (j === 'ressam' && r.chance(0.6)) s.hat = { type: 'beanie', color: r.pick(CLOTH) };
  return s;
}

function makeAttrs(r, g, age) {
  const A = DATA.ATTRS;
  return {
    shoe: g === 'f' ? r.int(36, 41) : r.int(40, 46),
    hand: r.chance(0.17) ? 'sol' : 'sağ',
    smoke: r.chance(0.32) ? r.pick(A.smoke.values) : A.smoke.none,
    hair: age >= 62 ? (r.chance(0.8) ? 'kır' : r.pick(A.hair.values)) : r.pick(['sarı', 'siyah', 'siyah', 'kızıl', 'kahverengi', 'kahverengi']),
    scent: r.chance(0.55) ? r.pick(A.scent.values) : A.scent.none,
    vehicle: r.chance(0.8) ? r.pick(A.vehicle.values) : 'aracı yok',
  };
}

POP.generate = function (seed) {
  const r = U.rng(seed);
  POP.people = []; POP.byId = {};
  const usedFull = new Set();
  const surnames = r.shuffle(DATA.SURNAMES);
  let sIdx = 0;
  let nid = 0;
  const mkPerson = (o) => {
    let first, tries = 0;
    do { first = r.pick(o.g === 'f' ? DATA.NAMES_F : DATA.NAMES_M); tries++; } while ((usedFull.has(first + ' ' + o.last) || (o.avoid && o.avoid.has(first))) && tries < 60);
    usedFull.add(first + ' ' + o.last);
    if (o.avoid) o.avoid.add(first);
    const p = {
      id: 'p' + (nid++), first, last: o.last, name: first + ' ' + o.last, g: o.g, age: o.age,
      home: o.home, job: null, work: null, alive: true, rel: [], household: o.home,
      phone: '555-0' + String(100 + nid).padStart(3, '0'),
      personality: r.pick(Object.keys(DATA.PERSONALITY)),
      night: r.chance(0.3), social: r.next(),
    };
    p.attrs = makeAttrs(r, p.g, p.age);
    POP.people.push(p); POP.byId[p.id] = p;
    return p;
  };
  const link = (a, b, type, typeBack) => { a.rel.push({ id: b.id, type }); b.rel.push({ id: a.id, type: typeBack || type }); };

  const homes = WORLD.houses.map((h) => h.id);
  const sizeW = [[2, 15], [3, 26], [4, 30], [5, 19], [6, 10]];
  const households = [];
  for (const home of homes) households.push({ home, size: U.weighted(sizeW, r.next()) });
  households.push({ home: 'mansion', size: 5, rich: true });
  households.push({ home: 'vineyard', size: 3, work: 'vineyard' });
  households.push({ home: 'hotel', size: 8, guests: true });
  for (const hh of households) {
    const last = surnames[sIdx++ % surnames.length];
    const avoid = new Set();
    const members = [];
    if (hh.guests) {
      for (let i = 0; i < hh.size; i++) members.push(mkPerson({ g: r.chance(0.5) ? 'f' : 'm', age: r.int(25, 70), last: surnames[(sIdx++) % surnames.length], home: hh.home }));
      members.forEach((m) => { m.guest = true; });
      continue;
    }
    const head = mkPerson({ g: r.chance(0.5) ? 'f' : 'm', age: r.int(26, 82), last, home: hh.home, avoid });
    members.push(head);
    if (hh.size === 1) continue;
    const type = r.next();
    if (type < 0.72) {
      const sp = mkPerson({ g: head.g === 'f' ? 'm' : 'f', age: U.clamp(head.age + r.int(-6, 6), 22, 88), last: r.chance(0.8) ? last : surnames[(sIdx++) % surnames.length], home: hh.home, avoid });
      link(head, sp, 'spouse'); members.push(sp);
      for (let i = 2; i < hh.size; i++) {
        if (head.age > 45 && r.chance(0.8)) {
          const ch = mkPerson({ g: r.chance(0.5) ? 'f' : 'm', age: U.clamp(head.age - r.int(22, 32), 18, 60), last, home: hh.home, avoid });
          link(head, ch, 'parent', 'child'); link(sp, ch, 'parent', 'child');
          members.filter((m) => m !== head && m !== sp && m.rel.some((x) => x.type === 'child')).forEach((sib) => { if (sib !== ch) link(sib, ch, 'sibling'); });
          members.push(ch);
        } else {
          const ot = mkPerson({ g: r.chance(0.5) ? 'f' : 'm', age: U.clamp(head.age + r.int(-5, 25), 20, 92), last: r.chance(0.6) ? last : surnames[(sIdx++) % surnames.length], home: hh.home, avoid });
          link(head, ot, ot.last === last ? 'sibling' : 'roommate'); members.push(ot);
        }
      }
    } else {
      for (let i = 1; i < hh.size; i++) {
        const sib = mkPerson({ g: r.chance(0.5) ? 'f' : 'm', age: U.clamp(head.age + r.int(-8, 8), 19, 90), last: r.chance(0.5) ? last : surnames[(sIdx++) % surnames.length], home: hh.home, avoid });
        members.forEach((m) => link(m, sib, m.last === sib.last ? 'sibling' : 'roommate'));
        members.push(sib);
      }
    }
    if (hh.rich) members.forEach((m) => { m.rich = true; });
    if (hh.work) members.forEach((m) => { if (m.age < 70) { m.job = 'bağ sahibi'; m.work = 'vineyard'; } });
  }
  // nüfus en az 152 olsun
  while (POP.people.length < 152) {
    const home = r.pick(homes);
    const host = POP.people.find((p) => p.home === home);
    const p = mkPerson({ g: r.chance(0.5) ? 'f' : 'm', age: r.int(20, 75), last: host ? host.last : r.pick(DATA.SURNAMES), home });
    if (host) link(host, p, host.last === p.last ? 'sibling' : 'roommate');
  }

  // --- özel makamlar (ağ için)
  const adults = () => POP.people.filter((p) => !p.job && p.age >= 30 && p.age <= 66 && !p.guest);
  const special = (job, work) => { const p = r.pick(adults()); p.job = job; p.work = work; p.special = true; return p; };
  POP.lionCandidates = [special('FBI Saha Ofisi Müdürü', 'fbi'), special('Belediye Başkanı', 'cityhall'), special('Senatör', 'cityhall')];
  const senator = POP.lionCandidates[2];
  const mansionP = POP.people.filter((p) => p.home === 'mansion');
  if (mansionP.length) { senator.home = 'mansion'; senator.rich = true; }
  POP.beaCandidates = [special('FBI özel ajanı', 'fbi'), special('FBI İç İşler ajanı', 'fbi'), special('Başsavcı', 'cityhall'), special('CIA irtibat subayı', 'fbi'), special('Belediye danışmanı', 'cityhall')];

  // --- iş yerleri
  for (const [place, roles] of Object.entries(DATA.WORKPLACES)) {
    for (const [job, n] of roles) for (let i = 0; i < n; i++) {
      const pool = adults().filter((p) => p.age <= 64);
      if (!pool.length) break;
      const p = r.pick(pool); p.job = job; p.work = place;
    }
  }
  for (const p of POP.people) {
    if (p.job) continue;
    if (p.age >= 65) p.job = 'emekli';
    else if (p.age <= 21) p.job = 'öğrenci';
    else p.job = r.pick(DATA.FREE_JOBS.filter((j) => j !== 'emekli' && j !== 'öğrenci'));
    if (p.guest) p.job = 'otel misafiri';
  }
  // iş arkadaşları
  const byWork = {};
  for (const p of POP.people) if (p.work) (byWork[p.work] = byWork[p.work] || []).push(p);
  for (const list of Object.values(byWork)) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) link(list[i], list[j], 'coworker');
  // komşular (aynı bloktaki evler)
  for (const h of WORLD.houses) for (const h2 of WORLD.houses) {
    if (h2.houseN <= h.houseN || h.block[0] !== h2.block[0] || Math.abs(h.block[1] - h2.block[1]) > 1) continue;
    const a = POP.people.filter((p) => p.home === h.id), b = POP.people.filter((p) => p.home === h2.id);
    for (const x of a) for (const y of b) if (r.chance(0.5)) link(x, y, 'neighbor');
  }
  // arkadaşlar ve düşmanlar
  for (const p of POP.people) {
    const k = r.int(1, 3);
    for (let i = 0; i < k; i++) { const q = r.pick(POP.people); if (q !== p && !p.rel.some((x) => x.id === q.id)) link(p, q, 'friend'); }
    if (r.chance(0.3)) { const q = r.pick(POP.people); if (q !== p && !p.rel.some((x) => x.id === q.id)) link(p, q, 'enemy'); }
  }
  // görünüş
  for (const p of POP.people) p.spec = makeSpec(U.rng(U.hash(seed, p.id, 'spec')), p);
  // akşam tercihleri
  for (const p of POP.people) {
    const young = p.age < 40;
    p.eve = [['home', 40], ['bar', young ? 16 : 6], ['restaurant', p.rich ? 14 : 8], ['cafe', 9], ['park', 8], ['friend', 10], ['walk', 6]];
    p.dayAct = [['home', 30], ['park', 16], ['cafe', 10], ['library', 8], ['shop', 8], ['walk', 14], ['church', 4]];
  }
};

// ---------------------------------------------------------------- program
// Kişinin (gün, dakika) anındaki konumu: harita id'si, 'park', 'walk', 'lighthouse', 'docks'
POP.where = function (p, day, minute) {
  if (!p.alive || p.jailed || p.gone) return null;
  if (p.overrides && p.overrides.length) {
    const abs = (day - 1) * 1440 + minute;
    for (const o of p.overrides) if (abs >= o.from && abs < o.to) return o.place;
  }
  const dow = (day - 1) % 7; // 0=Pazartesi ... 6=Pazar
  const sunday = dow === 6;
  const m = minute % (26 * 60);
  const pick = (pairs, tag) => {
    const v = U.weighted(pairs, U.hrand(p.id, day, tag));
    if (v === 'friend') { const fr = p.rel.filter((x) => x.type === 'friend').map((x) => POP.byId[x.id]).filter((q) => q && q.alive && q.home); return fr.length ? fr[U.hash(p.id, day, 'fr') % fr.length].home : 'home'; }
    return v;
  };
  const res = (v) => (v === 'home' ? p.home : v);
  if (m < 7 * 60 || m >= 23.5 * 60) {
    if (m >= 23.5 * 60 && m < 25 * 60 && p.night && pick([['bar', 1], ['home', 2]], 'late') === 'bar') return 'bar';
    return p.home;
  }
  if (m < 8 * 60) return p.home;
  const worker = p.work && !sunday && p.job !== 'emekli';
  if (m < 12 * 60) return worker ? p.work : res(pick(sunday ? [['church', 30], ['home', 30], ['park', 20], ['walk', 20]] : p.dayAct, 'am'));
  if (m < 13 * 60) {
    if (worker && U.hrand(p.id, day, 'lw') < 0.55) return p.work;
    return res(pick([['restaurant', 20], ['cafe', 20], ['park', 20], ['home', 25], ['walk', 15]], 'lunch'));
  }
  if (m < 18 * 60) return worker ? p.work : res(pick(p.dayAct, 'pm'));
  if (m < 21.5 * 60) {
    const v = pick(p.eve, 'eve');
    if (v === 'restaurant' || v === 'cafe' || v === 'park' || v === 'walk') return m < 20 * 60 ? v : res(pick([['home', 3], ['bar', 1]], 'eve2'));
    return res(v);
  }
  const ev = pick(p.eve, 'eve');
  if (ev === 'bar') return 'bar';
  return p.home;
};

// İnsan okunur konum
POP.placeName = function (pl) {
  if (!pl) return 'bilinmiyor';
  if (pl === 'walk') return 'sokakta yürüyüşte';
  if (DATA.PLACES[pl]) return DATA.PLACES[pl].name;
  return pl;
};

POP.relOf = function (a, b) {
  const x = a.rel.find((r0) => r0.id === b.id);
  return x ? x.type : null;
};

POP.relations = function (p) {
  return p.rel.map((x) => ({ p: POP.byId[x.id], type: x.type })).filter((x) => x.p);
};

// Veritabanı araması (Grace): yalnızca kayıtlı bilgiler
POP.search = function (f) {
  return POP.people.filter((p) => {
    if (!p.alive || p.gone) return false;
    if (f.g && p.g !== f.g) return false;
    if (f.hair && p.attrs.hair !== f.hair) return false;
    if (f.shoe && p.attrs.shoe !== +f.shoe) return false;
    if (f.vehicle && p.attrs.vehicle !== f.vehicle) return false;
    if (f.ageMin && p.age < +f.ageMin) return false;
    if (f.ageMax && p.age > +f.ageMax) return false;
    if (f.work && p.work !== f.work) return false;
    return true;
  });
};
