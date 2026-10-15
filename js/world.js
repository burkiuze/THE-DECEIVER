'use strict';
// Dünya: 128x96 karoluk şehir haritası, iş yerleri, evler, iç mekânlar ve gizli odalar.

const WORLD = { maps: {}, BUILDINGS: [], houses: [] };

const MW = 128, MH = 96;
const HROADS = [14, 30, 46, 62, 78];
const VROADS = [16, 36, 56, 76, 96, 112];
const COLS = [[3, 15], [18, 35], [38, 55], [58, 75], [78, 95], [98, 111], [114, 124]];
const ROWS = [[3, 13], [16, 29], [32, 45], [48, 61], [64, 77]];

// Blok yerleşimi: [satır][sütun]
const LAYOUT = [
  ['forest', [['mansion', 14, 8]], [['vineyard', 8, 6], 'vines'], [['fbi', 12, 8]], [['cityhall', 12, 8]], 'cemetery', ['H']],
  [['H', 'H'], [['station', 10, 8], ['lab', 5, 6]], [['cafe', 7, 5], ['hotel', 8, 9]], [['bar', 7, 5], ['restaurant', 8, 6]], [['bank', 8, 7], ['library', 7, 6]], ['H', 'H'], ['H']],
  [['H', 'H'], ['H', 'H'], 'park', [['gallery', 8, 5], ['shop', 7, 5]], ['H', 'H'], ['H', 'H'], ['H']],
  [['H', 'H'], ['H', 'H'], [['church', 8, 9], ['school', 7, 6]], [['newspaper', 7, 5], 'H'], ['H', 'H'], ['H', 'H'], ['H']],
  [['H', 'H'], ['H', 'H'], ['H', 'H'], [['market', 9, 5], 'H'], [['warehouse', 14, 7]], ['H', 'H'], 'lighthouse'],
];

WORLD.building = (id) => WORLD.BUILDINGS.find((b) => b.id === id);
WORLD.isSolid = function (m, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
  return m.solid[ty * m.w + tx] === 1;
};

// ------------------------------------------------------------------------------
// Kasaba
// ------------------------------------------------------------------------------
WORLD.buildTown = function () {
  const W = MW, H = MH;
  const m = {
    id: 'town', kind: 'town', name: DATA.TOWN, w: W, h: H,
    tiles: new Array(W * H).fill('grass'), solid: new Uint8Array(W * H), reserved: new Uint8Array(W * H),
    acts: {}, objects: [], doors: [], lights: [], zones: {}, smoke: [], spots: {},
  };
  const idx = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const tile = (x, y) => (inb(x, y) ? m.tiles[idx(x, y)] : 'grass');
  const set = (x, y, t) => { if (inb(x, y)) m.tiles[idx(x, y)] = t; };
  const res = (x, y) => { if (inb(x, y)) m.reserved[idx(x, y)] = 1; };
  const solid = (x, y) => { if (inb(x, y)) m.solid[idx(x, y)] = 1; };
  const rect = (x0, y0, x1, y1, fn) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(x, y); };
  const r = U.rng(9091);
  const addObj = (kind, img, x, y, base, extra) => { const o = Object.assign({ kind, img, x, y, base }, extra || {}); m.objects.push(o); return o; };

  // --- yollar
  for (const y of HROADS) rect(3, y, 124, y + 1, (x, yy) => set(x, yy, 'road'));
  for (const x of VROADS) rect(x, 3, x + 1, 79, (xx, y) => set(xx, y, 'road'));
  // --- liman şeridi, kumsal, deniz
  rect(3, 80, 124, 80, (x, y) => set(x, y, 'plank'));
  rect(0, 81, W - 1, 84, (x, y) => set(x, y, 'sand'));
  rect(0, 85, W - 1, H - 1, (x, y) => set(x, y, y > 88 ? 'deep' : 'water'));
  for (const dx of [62, 84, 104]) rect(dx, 81, dx + 2, 91, (x, y) => set(x, y, 'plank'));
  // --- blokların kaldırımları
  for (let ri = 0; ri < ROWS.length; ri++) for (let ci = 0; ci < COLS.length; ci++) {
    const [x0, x1] = COLS[ci], [y0, y1] = ROWS[ri];
    rect(x0, y0, x1, y1, (x, y) => {
      if (tile(x - 1, y) === 'road' || tile(x + 1, y) === 'road' || tile(x, y - 1) === 'road' || tile(x, y + 1) === 'road') { set(x, y, 'sidewalk'); res(x, y); }
    });
  }
  // kavşaklarda yaya geçidi
  for (const hy of HROADS) for (const vx of VROADS) {
    if (hy > 79) continue;
    for (const yy of [hy, hy + 1]) { if (tile(vx - 1, yy) === 'road') set(vx - 1, yy, 'crosswalkV'); if (tile(vx + 2, yy) === 'road') set(vx + 2, yy, 'crosswalkV'); }
    for (const xx of [vx, vx + 1]) { if (tile(xx, hy - 1) === 'road') set(xx, hy - 1, 'crosswalkH'); if (tile(xx, hy + 2) === 'road') set(xx, hy + 2, 'crosswalkH'); }
  }

  // --- binalar
  let houseN = 0;
  const placeBuilding = (b) => {
    WORLD.BUILDINGS.push(b);
    b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
    rect(b.x - 1, b.y - 1, b.x + b.w, b.y + b.h, res);
    rect(b.x, b.y, b.x + b.w - 1, b.y + b.h - 1, solid);
    m.solid[idx(b.door.x, b.door.y)] = 0;
    m.doors.push({ x: b.door.x, y: b.door.y, to: b.id });
    b.img = ART.building(b);
    addObj('building', b.img, b.x * TS - b.imgPad, b.y * TS - 20, (b.y + b.h) * TS, { b });
    if (b.chimneyAt) m.smoke.push(b.chimneyAt);
    for (const w of b.windows) m.lights.push({ x: w.x, y: w.y, r: 22, win: true });
    m.lights.push({ x: (b.door.x + 0.5) * TS, y: (b.door.y + 0.8) * TS, r: 24 });
  };
  for (let ri = 0; ri < ROWS.length; ri++) for (let ci = 0; ci < COLS.length; ci++) {
    const cell = LAYOUT[ri][ci];
    const [x0, x1] = COLS[ci], [y0, y1] = ROWS[ri];
    if (typeof cell === 'string') { m.zones[cell] = { x0, x1, y0, y1 }; continue; }
    const list = [];
    let vines = false;
    const innerW = x1 - x0 - 1;
    for (const it of cell) {
      if (it === 'vines') { vines = true; continue; }
      if (it === 'H') { const n = cell.filter((q) => q === 'H').length; list.push({ house: true, w: innerW >= 12 + (n - 1) * 4 ? 6 : 5, h: 6 }); }
      else list.push({ id: it[0], style: it[0], w: it[1], h: it[2] });
    }
    const total = list.reduce((s, b) => s + b.w, 0);
    const gaps = list.length - 1;
    const gap = list.length > 1 ? Math.max(1, Math.floor((innerW - total - (vines ? 6 : 0)) / (gaps + 1))) : 0;
    let x = x0 + 1 + Math.max(0, Math.floor((innerW - total - gap * gaps - (vines ? 6 : 0)) / 2));
    if (list.length === 2 && list.every((b) => b.house)) x = x0 + 1 + Math.floor((innerW - total - gap) / 2);
    for (const spec of list) {
      const b = Object.assign({}, spec, { x, y: y1 - spec.h, block: [ri, ci] });
      if (b.house) {
        const n = houseN++;
        b.id = 'h' + n; b.style = 'house'; b.houseN = n;
        b.pal = ART.HOUSE_PAL[U.hash('pal', n) % ART.HOUSE_PAL.length];
        b.chimney = U.hrand('ch', n) < 0.55;
        b.flowerbox = U.hrand('fb', n) < 0.5;
        const street = DATA.STREETS[ri % DATA.STREETS.length];
        DATA.PLACES[b.id] = { name: `${street} No ${10 + ci * 7 + (x % 5)}`, short: `Ev ${n + 1}` };
        WORLD.houses.push(b);
      }
      placeBuilding(b);
      x += b.w + gap;
    }
    if (vines) {
      const vx0 = x, vx1 = x1 - 2;
      for (let vx = vx0; vx <= vx1; vx += 2) for (let vy = y0 + 2; vy <= y1 - 2; vy++) {
        set(vx, vy, 'soil'); set(vx + 1, vy, 'soil'); res(vx, vy); res(vx + 1, vy);
        solid(vx, vy);
        addObj('vine', ART.prop('vine'), vx * TS, vy * TS - 12, (vy + 1) * TS);
      }
    }
  }

  // --- park
  const P = m.zones.park;
  {
    const cx = Math.floor((P.x0 + P.x1) / 2), cy = Math.floor((P.y0 + P.y1) / 2);
    rect(P.x0 + 1, cy, P.x1 - 1, cy + 1, (x, y) => { set(x, y, 'path'); res(x, y); });
    rect(cx, P.y0 + 1, cx + 1, P.y1 - 1, (x, y) => { set(x, y, 'path'); res(x, y); });
    // gölet
    rect(P.x0 + 2, P.y0 + 2, P.x0 + 7, P.y0 + 5, (x, y) => {
      const corner = (x === P.x0 + 2 || x === P.x0 + 7) && (y === P.y0 + 2 || y === P.y0 + 5);
      if (!corner) { set(x, y, 'water'); solid(x, y); }
      res(x, y);
    });
    rect(P.x0 + 1, P.y0 + 1, P.x0 + 8, P.y0 + 6, res);
    // çeşme
    rect(cx - 1, cy - 1, cx + 2, cy + 2, (x, y) => { set(x, y, 'plaza'); res(x, y); });
    rect(cx - 1, cy, cx + 2, cy + 1, solid);
    addObj('fountain', ART.prop('fountain'), cx * TS - 16, cy * TS - 18, (cy + 2) * TS, { anim: 'fountain' });
    // çardak
    const gx = P.x1 - 6, gy = P.y1 - 5;
    rect(gx, gy + 1, gx + 2, gy + 2, solid); rect(gx - 1, gy - 2, gx + 3, gy + 3, res);
    addObj('gazebo', ART.prop('gazebo'), gx * TS - 4, gy * TS - 26, (gy + 3) * TS);
    // banklar ve çiçekler
    [[cx - 4, cy - 1], [cx + 4, cy + 3], [cx - 5, cy + 3], [cx + 3, cy - 2]].forEach(([x, y]) => {
      if (m.reserved[idx(x, y)] || m.reserved[idx(x + 1, y)]) return;
      solid(x, y); solid(x + 1, y); res(x, y); res(x + 1, y);
      addObj('bench', ART.prop('bench'), x * TS, y * TS - 4, (y + 1) * TS);
    });
    [[P.x0 + 10, P.y0 + 2], [P.x0 + 12, P.y0 + 2], [P.x1 - 3, P.y0 + 3], [P.x0 + 3, P.y1 - 3]].forEach(([x, y], i) => {
      if (m.reserved[idx(x, y)]) return;
      solid(x, y); res(x, y); addObj('flowerbed', ART.prop('flowerbed', i % 2), x * TS, y * TS, (y + 1) * TS);
    });
    // telefon kulübesi (ölü nokta)
    const bx = P.x0 + 1, by = P.y1 - 2;
    solid(bx, by); res(bx, by); res(bx, by + 1);
    addObj('phonebooth', ART.prop('phonebooth'), bx * TS - 1, by * TS - 20, (by + 1) * TS);
    m.acts[bx + ',' + by] = 'drop:booth';
    m.spots.booth = [bx, by + 1];
    m.spots.parkCenter = [cx, cy + 3];
    WORLD.parkArea = P;
  }

  // --- mezarlık
  const C = m.zones.cemetery;
  {
    const gateX = Math.floor((C.x0 + C.x1) / 2);
    for (let x = C.x0 + 1; x <= C.x1 - 1; x++) for (const y of [C.y0 + 1, C.y1 - 1]) {
      if (y === C.y1 - 1 && Math.abs(x - gateX) <= 1) continue;
      solid(x, y); res(x, y); addObj('ironfence', ART.prop('ironfence'), x * TS, y * TS - 4, (y + 1) * TS - 2);
    }
    for (let y = C.y0 + 2; y <= C.y1 - 2; y++) for (const x of [C.x0 + 1, C.x1 - 1]) { solid(x, y); res(x, y); addObj('ironfence', ART.prop('ironfence'), x * TS, y * TS - 4, (y + 1) * TS - 2); }
    rect(gateX - 1, C.y0 + 2, gateX + 1, C.y1 - 1, (x, y) => { set(x, y, 'path'); res(x, y); });
    // türbe
    const tx = gateX - 1, ty = C.y0 + 2;
    rect(tx, ty, tx + 2, ty + 2, solid); rect(tx - 1, ty, tx + 3, ty + 3, res);
    addObj('crypt', ART.prop('crypt'), tx * TS, ty * TS - 4, (ty + 3) * TS);
    m.acts[(tx + 1) + ',' + (ty + 2)] = 'drop:crypt';
    m.spots.crypt = [tx + 1, ty + 3];
    for (let y = C.y0 + 3; y <= C.y1 - 3; y += 2) for (let x = C.x0 + 3; x <= C.x1 - 3; x += 2) {
      if (Math.abs(x - gateX) <= 2) continue;
      solid(x, y); res(x, y);
      addObj('grave', ART.prop(U.hrand('gv', x, y) < 0.2 ? 'cross' : 'grave', (x + y) % 2), x * TS + 1, y * TS - 4, (y + 1) * TS - 1);
    }
    rect(C.x0, C.y0, C.x1, C.y1, (x, y) => res(x, y));
  }

  // --- deniz feneri
  const L = m.zones.lighthouse;
  {
    const lx = L.x0 + 4, ly = L.y1 - 3;
    rect(lx, ly - 1, lx + 1, ly, solid); rect(lx - 1, ly - 2, lx + 2, ly + 1, res);
    addObj('lighthouse', ART.prop('lighthouse'), lx * TS - 4, ly * TS - 76, (ly + 1) * TS);
    m.lights.push({ x: lx * TS + 16, y: ly * TS - 60, r: 90, beacon: true });
    const bx = lx + 3, by = ly + 1;
    solid(bx, by); solid(bx + 1, by); res(bx, by); res(bx + 1, by);
    addObj('bench', ART.prop('bench'), bx * TS, by * TS - 4, (by + 1) * TS);
    m.acts[bx + ',' + by] = 'drop:bench'; m.acts[(bx + 1) + ',' + by] = 'drop:bench';
    m.spots.bench = [bx, by + 1];
    rect(L.x0, L.y0, L.x1, L.y1, res);
  }

  // --- liman: tekneler ve direkler
  [[59, 86, '#f4f1ea'], [66, 87, '#c9d9e8'], [81, 86, '#e8dcc8'], [88, 87, '#f4f1ea'], [101, 86, '#d9e6c8'], [108, 87, '#f4f1ea']].forEach(([x, y, col]) => {
    rect(x, y, x + 2, y + 1, solid);
    addObj('boat', ART.prop('boat', col), x * TS - 4, y * TS - 4, (y + 2) * TS, { bob: true });
  });
  for (const dx of [62, 84, 104]) for (const y of [84, 88, 91]) { addObj('post', ART.prop('post'), (dx - 1) * TS + 8, y * TS - 4, (y + 1) * TS); addObj('post', ART.prop('post'), (dx + 3) * TS, y * TS - 4, (y + 1) * TS); }
  rect(0, 85, W - 1, H - 1, (x, y) => { if (tile(x, y) === 'water' || tile(x, y) === 'deep') solid(x, y); });
  // liman sandıkları
  [[66, 80], [70, 80], [90, 80], [93, 80], [108, 80]].forEach(([x, y], i) => { solid(x, y + 1); addObj('crates', ART.prop(i % 2 ? 'crates' : 'barrel'), x * TS, (y + 1) * TS - 6, (y + 2) * TS); });
  m.zones.docks = { x0: 58, x1: 110, y0: 80, y1: 84 };

  // --- orman ve kenarlar
  const addTree = (x, y, v) => { solid(x, y); addObj('tree', ART.tree(v), x * TS - 10, y * TS - 32, (y + 1) * TS); };
  for (let y = 0; y < 81; y++) for (let x = 0; x < W; x++) {
    const border = x < 3 || x > 124 || y < 3;
    if (!border) continue;
    solid(x, y); res(x, y);
    if ((x + y * 3) % 2 === 0) addTree(x, y, r.chance(0.4) ? 2 : r.pick([0, 0, 1, 4]));
  }
  const F = m.zones.forest;
  rect(F.x0, F.y0, F.x1, F.y1, (x, y) => { if (m.tiles[idx(x, y)] !== 'grass') return; res(x, y); if ((x + y) % 2 === 0 || r.chance(0.2)) addTree(x, y, r.chance(0.6) ? 2 : 5); });
  // mezarlıkta karanlık çamlar
  [[C.x0 + 2, C.y0 + 2], [C.x1 - 2, C.y0 + 2], [C.x0 + 2, C.y1 - 3], [C.x1 - 2, C.y1 - 3]].forEach(([x, y]) => { m.reserved[idx(x, y)] = 0; if (!m.solid[idx(x, y)]) addTree(x, y, 5); });

  // --- ev bahçeleri: posta kutusu, çit, ağaçlar, kulübe, havuz
  for (const b of WORLD.houses) {
    const n = b.houseN;
    const mx = b.door.x + 2, my = b.door.y;
    if (!m.solid[idx(mx, my)] && tile(mx, my) === 'grass') { solid(mx, my); addObj('mailbox', ART.prop('mailbox', b.pal.door), mx * TS + 3, my * TS - 4, (my + 1) * TS - 1); }
    for (const dx of [-2, -3]) { const x = b.door.x + dx; if (!m.solid[idx(x, my)] && tile(x, my) === 'grass') { set(x, my, 'flowers'); } }
    const yardTop = ROWS[b.block[0]][0] + 1, yardBot = b.y - 2;
    if (yardBot - yardTop >= 1) {
      const rr = U.rng(U.hash('yard', n));
      for (let i = 0; i < 3; i++) {
        const x = rr.int(b.x, b.x + b.w - 1), y = rr.int(yardTop, yardBot);
        if (m.solid[idx(x, y)] || m.reserved[idx(x, y)] && tile(x, y) !== 'grass') continue;
        if (i === 0 && rr.chance(0.35)) { if (x + 1 < b.x + b.w && !m.solid[idx(x + 1, y)]) { solid(x, y); solid(x + 1, y); addObj('shed', ART.prop('shed'), x * TS - 1, y * TS - 18, (y + 1) * TS); } continue; }
        if (rr.chance(0.6)) addTree(x, y, rr.pick([0, 1, 4, 3]));
        else { solid(x, y); addObj('bush', ART.prop('bush', rr.int(0, 2)), x * TS - 2, y * TS - 4, (y + 1) * TS - 2); }
      }
    }
    rect(b.x, yardTop, b.x + b.w - 1, b.y - 1, (x, y) => { if (tile(x, y) === 'grass') set(x, y, 'yard'); });
  }

  // --- rastgele ağaç/çalı/çiçek (boş çimenlerde)
  for (let y = 3; y < 80; y++) for (let x = 3; x < W - 3; x++) {
    const i = idx(x, y);
    if (m.reserved[i] || m.solid[i] || (m.tiles[i] !== 'grass' && m.tiles[i] !== 'yard')) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t = tile(x + dx, y + dy);
      if (t === 'road' || t === 'sidewalk' || t === 'path' || t === 'plaza') near = true;
    }
    const roll = r.next();
    if (!near && roll < 0.08) addTree(x, y, r.pick([0, 0, 1, 2, 4]));
    else if (!near && roll < 0.11) { solid(x, y); addObj('bush', ART.prop('bush', r.int(0, 2)), x * TS - 2, y * TS - 4, (y + 1) * TS - 2); }
    else if (roll < 0.15) m.tiles[i] = 'flowers';
    else if (roll < 0.155) { solid(x, y); addObj('rock', ART.prop(r.chance(0.5) ? 'rock' : 'stump'), x * TS, y * TS + 2, (y + 1) * TS - 2); }
  }

  // --- sokak lambaları, hidrantlar, çöp kutuları
  for (let ri = 0; ri < ROWS.length; ri++) for (let ci = 0; ci < COLS.length; ci++) {
    const [x0, x1] = COLS[ci], [y0, y1] = ROWS[ri];
    for (let x = x0 + 2; x <= x1 - 2; x += 6) {
      for (const y of [y0, y1]) {
        if (tile(x, y) !== 'sidewalk' || m.solid[idx(x, y)]) continue;
        if (m.doors.some((d) => Math.abs(d.x - x) <= 1 && Math.abs(d.y - y) <= 1)) continue;
        const k = U.hash('sp', x, y) % 7;
        solid(x, y);
        if (k < 4) {
          addObj('lamp', ART.prop('lamp'), x * TS + 2, y * TS - 22, (y + 1) * TS - 1);
          m.lights.push({ x: x * TS + 8, y: y * TS - 16, r: 58 });
        } else if (k === 4) addObj('hydrant', ART.prop('hydrant'), x * TS + 3, y * TS, (y + 1) * TS - 1);
        else if (k === 5) addObj('trash', ART.prop('trash'), x * TS + 2, y * TS, (y + 1) * TS - 1);
        else m.solid[idx(x, y)] = 0;
      }
    }
  }
  // gazete kutusu ve otobüs durakları
  const nb = WORLD.building('newspaper');
  if (nb) { const x = nb.door.x - 2, y = nb.door.y + 1; if (!m.solid[idx(x, y)]) { solid(x, y); addObj('newsbox', ART.prop('newsbox'), x * TS + 2, y * TS - 4, (y + 1) * TS - 1); } }
  [[24, 29], [84, 45]].forEach(([x, y]) => { if (tile(x, y) !== 'sidewalk') return; solid(x, y); solid(x + 1, y); addObj('busstop', ART.prop('busstop'), x * TS - 1, y * TS - 20, (y + 1) * TS); });

  // --- Jade'in arabası (karakolun önünde)
  const st = WORLD.building('station');
  const cx = st.x + 1, cy = st.y + st.h + 1;
  set(cx, cy, 'parking'); set(cx + 1, cy, 'parking'); solid(cx, cy); solid(cx + 1, cy);
  m.acts[cx + ',' + cy] = 'car'; m.acts[(cx + 1) + ',' + cy] = 'car';
  addObj('car', ART.prop('jadecar'), cx * TS - 4, cy * TS - 10, (cy + 1) * TS, { jade: true });
  // park etmiş arabalar
  const carCols = ['#c0392b', '#2c3e66', '#e8e6df', '#3a6b4a', '#d9a03a', '#5a4a6b', '#2b2b30'];
  let parked = 0;
  for (let k = 0; k < 400 && parked < 14; k++) {
    const hy = HROADS[r.int(0, 4)];
    const x = r.int(5, 120), y = hy + 1;
    if (tile(x, y) !== 'road' || tile(x + 1, y) !== 'road') continue;
    if (VROADS.some((vx) => x >= vx - 4 && x <= vx + 5)) continue;
    if (m.solid[idx(x, y)] || m.solid[idx(x + 1, y)]) continue;
    solid(x, y); solid(x + 1, y);
    addObj('car', ART.prop('car', carCols[parked % carCols.length]), x * TS - 2, y * TS - 8, (y + 1) * TS);
    parked++;
  }

  // --- zemin tuvali
  const [gc, gg] = ART.canvas(W * TS, H * TS);
  const gr = U.rng(777);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = m.tiles[idx(x, y)];
    if (t === 'crosswalkV' || t === 'crosswalkH') ART.groundTile(gg, 'crosswalk', x * TS, y * TS, gr, x, y, { vertical: t === 'crosswalkV' });
    else if (t === 'sidewalk') ART.groundTile(gg, t, x * TS, y * TS, gr, x, y, { n: tile(x, y - 1).startsWith('cross') ? 'road' : tile(x, y - 1), s: tile(x, y + 1).startsWith('cross') ? 'road' : tile(x, y + 1), w: tile(x - 1, y).startsWith('cross') ? 'road' : tile(x - 1, y), e: tile(x + 1, y).startsWith('cross') ? 'road' : tile(x + 1, y) });
    else ART.groundTile(gg, t, x * TS, y * TS, gr, x, y);
  }
  // yol orta çizgileri
  gg.fillStyle = '#e8c35a';
  for (const hy of HROADS) for (let x = 3; x < 125; x++) {
    if (VROADS.some((vx) => x >= vx - 1 && x <= vx + 2)) continue;
    if (x % 2 === 0) gg.fillRect(x * TS + 2, (hy + 1) * TS - 1, 10, 2);
  }
  for (const vx of VROADS) for (let y = 3; y < 79; y++) {
    if (HROADS.some((hy) => y >= hy - 1 && y <= hy + 2)) continue;
    if (y % 2 === 0) gg.fillRect((vx + 1) * TS - 1, y * TS + 2, 2, 10);
  }
  // kıyı köpüğü
  gg.fillStyle = '#e6f2f8';
  for (let x = 0; x < W; x++) if (tile(x, 85) === 'water') gg.fillRect(x * TS, 85 * TS, TS, 2);
  // bina gölgeleri
  gg.fillStyle = 'rgba(20,30,10,0.22)';
  for (const b of WORLD.BUILDINGS) gg.fillRect((b.x + b.w) * TS, (b.y + 1) * TS, 6, (b.h - 1) * TS);
  for (const o of m.objects) if (o.kind === 'tree') { gg.fillStyle = 'rgba(20,40,10,0.18)'; gg.beginPath(); gg.ellipse(o.x + 20, o.base - 3, 12, 4, 0, 0, Math.PI * 2); gg.fill(); }
  m.ground = gc;
  return m;
};

// ------------------------------------------------------------------------------
// İç mekânlar (sabit)
// ------------------------------------------------------------------------------
WORLD.INTERIORS = {
  station: {
    w: 24, h: 14, floor: 'wood', floorColors: ['#b98a5a', '#a37748'], wall: '#9fb0c2', wallStripe: true, wainscot: '#6b7a8a',
    furniture: [
      { t: 'window', x: 2, y: 0 }, { t: 'window', x: 13, y: 0 },
      { t: 'board', x: 8, y: 0, act: 'board' },
      { t: 'lionboard', x: 16, y: 0, act: 'lionboard' },
      { t: 'kitchen', x: 5, y: 1, act: 'tea' },
      { t: 'bookshelf', x: 21, y: 1 },
      { t: 'couch', x: 1, y: 4, act: 'couch' },
      { t: 'plant', x: 1, y: 2 }, { t: 'plant', x: 22, y: 11 }, { t: 'plant', x: 1, y: 11 },
      { t: 'rug', x: 13, y: 3, c: '#3d4a6b' },
      { t: 'desk', x: 15, y: 4 },
      { t: 'cdesk', x: 10, y: 4, act: 'computer' },
      { t: 'desk', x: 3, y: 8 }, { t: 'desk', x: 7, y: 8 },
      { t: 'chair', x: 4, y: 9 }, { t: 'chair', x: 8, y: 9 },
      { t: 'cabinet', x: 13, y: 8 }, { t: 'cabinet', x: 14, y: 8 },
      { t: 'cell', x: 19, y: 7, act: 'cell' }, { t: 'cell', x: 19, y: 10, act: 'cell' },
      { t: 'coatrack', x: 12, y: 1 }, { t: 'flag', x: 20, y: 1, c: '#3a6ad2' },
      { t: 'lamp', x: 18, y: 4 },
    ],
    spots: { boss: [16, 5, 0], grace: [10, 5, 1], kevin: [4, 10, 1], ray: [8, 10, 1], cell1: [20, 8, 0], cell2: [20, 11, 0] },
    spawn: [3, 6],
  },
  lab: {
    w: 16, h: 11, floor: 'tile', floorColors: ['#dfe6e8', '#c5cfd2'], wall: '#cfe0e3',
    furniture: [
      { t: 'morgue', x: 1, y: 0 },
      { t: 'slab', x: 3, y: 4, act: 'autopsy' },
      { t: 'labdesk', x: 10, y: 2, act: 'printlab' },
      { t: 'cabinet', x: 14, y: 2 }, { t: 'cabinet', x: 13, y: 7 },
      { t: 'plant', x: 14, y: 9 }, { t: 'plant2', x: 1, y: 9 },
      { t: 'window', x: 6, y: 0 }, { t: 'clock', x: 12, y: 0 },
    ],
    spots: { ortiz: [6, 4, 2], sam: [12, 4, 0] },
  },
  cafe: {
    w: 14, h: 10, floor: 'checker', floorColors: ['#e8dcc8', '#c9a882'], wall: '#d9a77c', wallStripe: true,
    furniture: [
      { t: 'bookshelf', x: 2, y: 0 }, { t: 'window', x: 8, y: 0 }, { t: 'window', x: 10, y: 0 },
      { t: 'counter', x: 1, y: 3 }, { t: 'coffee', x: 2, y: 3 }, { t: 'register', x: 4, y: 3 },
      { t: 'ctable', x: 8, y: 3 }, { t: 'ctable', x: 11, y: 3 }, { t: 'ctable', x: 8, y: 6 }, { t: 'ctable', x: 11, y: 6 },
      { t: 'stool', x: 9, y: 3 }, { t: 'stool', x: 12, y: 6 },
      { t: 'plant', x: 12, y: 2 }, { t: 'plant', x: 1, y: 8 },
    ],
    spots: { mia: [3, 2, 0], staff: [2, 2, 0] },
  },
  hotel: {
    w: 16, h: 11, floor: 'carpet', floorColors: ['#8a3a3a', '#7a2f30'], wall: '#e7c9a3', wallStripe: true, wainscot: '#7a2f3a',
    furniture: [
      { t: 'keyboard', x: 3, y: 0 }, { t: 'elevator', x: 12, y: 0 }, { t: 'window', x: 7, y: 0 },
      { t: 'reception', x: 2, y: 3 },
      { t: 'rug', x: 9, y: 5, c: '#c9a24a' },
      { t: 'sofa', x: 10, y: 4, c: '#3a5a4a' }, { t: 'sofa', x: 10, y: 7, c: '#3a5a4a' },
      { t: 'plant', x: 1, y: 2 }, { t: 'plant', x: 14, y: 2 }, { t: 'plant2', x: 14, y: 9 },
      { t: 'lamp', x: 1, y: 8 },
    ],
    spots: { hector: [4, 2, 0], staff: [5, 2, 0] },
  },
  bar: {
    w: 14, h: 10, floor: 'wood', floorColors: ['#6b4426', '#5a3820'], wall: '#4b2e1c', wallPattern: 'brick',
    furniture: [
      { t: 'bottles', x: 1, y: 0 },
      { t: 'counter5', x: 1, y: 3, c: '#5a3820' },
      { t: 'stool', x: 1, y: 4 }, { t: 'stool', x: 3, y: 4 }, { t: 'stool', x: 5, y: 4 },
      { t: 'jukebox', x: 12, y: 1 },
      { t: 'ctable', x: 9, y: 3 },
      { t: 'pooltable', x: 8, y: 6 },
      { t: 'plant', x: 1, y: 8 },
    ],
    spots: { lou: [3, 2, 0], staff: [5, 2, 0] },
  },
  restaurant: {
    w: 16, h: 11, floor: 'parquet', floorColors: ['#b07a4a', '#9a6a3e'], wall: '#e8d9b8', wallStripe: true, wainscot: '#2f5a4a',
    furniture: [
      { t: 'window', x: 2, y: 0 }, { t: 'window', x: 6, y: 0 }, { t: 'painting', x: 10, y: 0, c: '#a33a2e' }, { t: 'painting', x: 12, y: 0, c: '#3a6b4a' },
      { t: 'counter', x: 11, y: 3, c: '#2f5a4a' },
      { t: 'ctable', x: 2, y: 4, c: '#f4f1ea' }, { t: 'ctable', x: 5, y: 4, c: '#f4f1ea' }, { t: 'ctable', x: 8, y: 4, c: '#f4f1ea' },
      { t: 'ctable', x: 2, y: 7, c: '#f4f1ea' }, { t: 'ctable', x: 5, y: 7, c: '#f4f1ea' }, { t: 'ctable', x: 8, y: 7, c: '#f4f1ea' },
      { t: 'plant', x: 14, y: 8 }, { t: 'plant2', x: 1, y: 2 },
    ],
    spots: { staff: [13, 2, 0] },
  },
  gallery: {
    w: 16, h: 10, floor: 'tile', floorColors: ['#f2f0ea', '#e2ded4'], wall: '#fbfaf7',
    furniture: [
      { t: 'artwall', x: 2, y: 0, c: '#3a6ad2' }, { t: 'artwall', x: 6, y: 0, c: '#d95f5f' }, { t: 'artwall', x: 10, y: 0, c: '#3aa04a' },
      { t: 'statue', x: 4, y: 4 }, { t: 'statue', x: 11, y: 4 },
      { t: 'bench', x: 7, y: 6 }, { t: 'easel', x: 13, y: 3 },
      { t: 'plant', x: 1, y: 2 }, { t: 'plant2', x: 14, y: 8 },
    ],
    spots: {},
  },
  mansion: {
    w: 20, h: 13, floor: 'parquet', floorColors: ['#7a4a2a', '#6b4024'], wall: '#d9c8a8', wallStripe: true, wainscot: '#6b4426',
    furniture: [
      { t: 'window', x: 4, y: 0 }, { t: 'fireplace', x: 9, y: 0 }, { t: 'window', x: 14, y: 0 },
      { t: 'bookshelf', x: 1, y: 1, c: 'shelf' }, { t: 'bookshelf', x: 17, y: 1 },
      { t: 'rug6', x: 7, y: 4, c: '#5a3a6b' },
      { t: 'sofa', x: 9, y: 4, c: '#7a2f3a' },
      { t: 'armchair', x: 7, y: 5, c: '#7a2f3a' }, { t: 'armchair', x: 12, y: 5, c: '#7a2f3a' },
      { t: 'piano', x: 2, y: 6 }, { t: 'gclock', x: 13, y: 1 }, { t: 'trophy', x: 15, y: 9 },
      { t: 'dining', x: 3, y: 9 },
      { t: 'plant', x: 1, y: 11 }, { t: 'plant', x: 18, y: 11 }, { t: 'lamp', x: 17, y: 6 },
    ],
    spots: {},
  },
  warehouse: {
    w: 20, h: 12, floor: 'concrete', floorColors: ['#9aa0a6', '#868c92'], wall: '#7d8a96', wallPattern: 'brick',
    furniture: [
      { t: 'rack', x: 6, y: 1 }, { t: 'rack', x: 10, y: 1 }, { t: 'rack', x: 14, y: 1 },
      { t: 'crate', x: 2, y: 3 }, { t: 'crate', x: 3, y: 3 }, { t: 'crate', x: 2, y: 4 },
      { t: 'crate', x: 16, y: 4 }, { t: 'crate', x: 17, y: 4 }, { t: 'crate', x: 17, y: 5 },
      { t: 'crate', x: 14, y: 9 }, { t: 'crate', x: 15, y: 9 },
      { t: 'barrel', x: 2, y: 8 }, { t: 'barrel', x: 3, y: 9 }, { t: 'barrel', x: 17, y: 9 },
      { t: 'forklift', x: 5, y: 6 }, { t: 'desk', x: 13, y: 6 },
    ],
    spots: { staff: [12, 7, 2] },
  },
  vineyard: {
    w: 16, h: 11, floor: 'stone', floorColors: ['#b5a58a', '#9a8a72'], wall: '#c9a882', wallPattern: 'brick',
    furniture: [
      { t: 'barrelrack', x: 1, y: 0, c: 'shelf' }, { t: 'window', x: 7, y: 0 }, { t: 'kitchen', x: 12, y: 0 },
      { t: 'table', x: 6, y: 4 }, { t: 'chair', x: 5, y: 4 }, { t: 'chair', x: 8, y: 5 },
      { t: 'grapes', x: 13, y: 7 }, { t: 'grapes', x: 14, y: 7 }, { t: 'barrel', x: 1, y: 8 }, { t: 'plant', x: 14, y: 3 },
    ],
    spots: {},
  },
  fbi: {
    w: 20, h: 12, floor: 'carpet', floorColors: ['#3a4a5e', '#33424f'], wall: '#c9ccd2', wainscot: '#1f2a44',
    furniture: [
      { t: 'flag', x: 1, y: 1, c: '#3a6ad2' }, { t: 'window', x: 3, y: 0 }, { t: 'evidence', x: 8, y: 0 }, { t: 'window', x: 13, y: 0 }, { t: 'flag', x: 18, y: 1, c: '#3a6ad2' },
      { t: 'cdesk', x: 3, y: 4 }, { t: 'cdesk', x: 8, y: 4 }, { t: 'cdesk', x: 13, y: 4 },
      { t: 'cdesk', x: 3, y: 8 }, { t: 'desk', x: 13, y: 8, c: '#4b3626' },
      { t: 'cabinet', x: 17, y: 4 }, { t: 'cabinet', x: 17, y: 5 }, { t: 'plant2', x: 1, y: 10 }, { t: 'plant2', x: 18, y: 10 },
    ],
    spots: {},
  },
  cityhall: {
    w: 20, h: 12, floor: 'checker', floorColors: ['#e8e2d0', '#5a5a66'], wall: '#ece4d2', wainscot: '#8a7a5a',
    furniture: [
      { t: 'flag', x: 8, y: 1, c: '#3a6ad2' }, { t: 'painting', x: 10, y: 0, c: '#8a7a5a' }, { t: 'flag', x: 11, y: 1, c: '#c94a4a' },
      { t: 'window', x: 2, y: 0 }, { t: 'window', x: 15, y: 0 },
      { t: 'counter5', x: 2, y: 4, c: '#6b4426' }, { t: 'desk', x: 13, y: 4, c: '#5a3a24' },
      { t: 'rug', x: 8, y: 7, c: '#7a2f3a' }, { t: 'bench', x: 3, y: 9 }, { t: 'bench', x: 14, y: 9 },
      { t: 'plant', x: 1, y: 10 }, { t: 'plant', x: 18, y: 10 }, { t: 'gclock', x: 18, y: 1 },
    ],
    spots: {},
  },
  bank: {
    w: 16, h: 11, floor: 'checker', floorColors: ['#e8e2d0', '#c9c0aa'], wall: '#dcd6c6', wainscot: '#2f3a4a',
    furniture: [
      { t: 'vault', x: 12, y: 0 }, { t: 'window', x: 2, y: 0 }, { t: 'clock', x: 7, y: 0 },
      { t: 'counter5', x: 2, y: 4, c: '#2f3a4a' }, { t: 'register', x: 3, y: 4 }, { t: 'register', x: 5, y: 4 },
      { t: 'desk', x: 11, y: 4, c: '#4b3626' }, { t: 'safe', x: 14, y: 3 },
      { t: 'bench', x: 3, y: 8 }, { t: 'plant', x: 1, y: 9 }, { t: 'plant', x: 14, y: 9 },
    ],
    spots: {},
  },
  library: {
    w: 16, h: 11, floor: 'parquet', floorColors: ['#a8743f', '#8a5a32'], wall: '#c9a882', wainscot: '#4b2e1c',
    furniture: [
      { t: 'bookshelf', x: 1, y: 1 }, { t: 'bookshelf', x: 3, y: 1 }, { t: 'window', x: 6, y: 0 }, { t: 'bookshelf', x: 9, y: 1 }, { t: 'bookshelf', x: 11, y: 1 }, { t: 'bookshelf', x: 13, y: 1 },
      { t: 'libshelf', x: 2, y: 5 }, { t: 'libshelf', x: 11, y: 5 },
      { t: 'table', x: 6, y: 5 }, { t: 'desk', x: 11, y: 8 }, { t: 'chair', x: 5, y: 6 }, { t: 'chair', x: 8, y: 6 },
      { t: 'plant', x: 1, y: 9 },
    ],
    spots: {},
  },
  church: {
    w: 16, h: 13, floor: 'stone', floorColors: ['#c9c3b8', '#b3ada0'], wall: '#e6e0d2',
    furniture: [
      { t: 'stainedglass', x: 3, y: 0 }, { t: 'altar', x: 6, y: 2 }, { t: 'stainedglass', x: 11, y: 0 },
      { t: 'pew', x: 2, y: 5 }, { t: 'pew', x: 10, y: 5 }, { t: 'pew', x: 2, y: 7 }, { t: 'pew', x: 10, y: 7 }, { t: 'pew', x: 2, y: 9 }, { t: 'pew', x: 10, y: 9 },
      { t: 'candles', x: 1, y: 2 }, { t: 'candles', x: 14, y: 2 }, { t: 'rug', x: 6, y: 4, c: '#a33a2e' },
    ],
    spots: {},
  },
  shop: {
    w: 14, h: 10, floor: 'tile', floorColors: ['#e8e2d0', '#d9d2c0'], wall: '#f2e2b0', wainscot: '#3a6b4a',
    furniture: [
      { t: 'shelf', x: 1, y: 2 }, { t: 'shelf', x: 5, y: 2 }, { t: 'shelf', x: 9, y: 2 },
      { t: 'shelf', x: 1, y: 5 }, { t: 'shelf', x: 5, y: 5 },
      { t: 'counter', x: 9, y: 6, c: '#3a6b4a' }, { t: 'register', x: 10, y: 6 }, { t: 'fridge', x: 12, y: 1 },
    ],
    spots: { staff: [11, 7, 1] },
  },
  market: {
    w: 16, h: 10, floor: 'concrete', floorColors: ['#b8c6cc', '#a3b1b8'], wall: '#d9e6ea',
    furniture: [
      { t: 'stall', x: 2, y: 3 }, { t: 'stall', x: 7, y: 3 }, { t: 'stall', x: 12, y: 3 },
      { t: 'barrel', x: 1, y: 7 }, { t: 'crate', x: 14, y: 7 }, { t: 'shelf', x: 6, y: 7, c: 'fish' },
    ],
    spots: {},
  },
  school: {
    w: 16, h: 11, floor: 'wood', floorColors: ['#c9a06a', '#b08a58'], wall: '#e8d9b8', wainscot: '#6b3a24',
    furniture: [
      { t: 'blackboard', x: 6, y: 0 }, { t: 'window', x: 1, y: 0 }, { t: 'window', x: 13, y: 0 }, { t: 'desk', x: 7, y: 3 },
      { t: 'schooldesk', x: 3, y: 5 }, { t: 'schooldesk', x: 6, y: 5 }, { t: 'schooldesk', x: 9, y: 5 }, { t: 'schooldesk', x: 12, y: 5 },
      { t: 'schooldesk', x: 3, y: 7 }, { t: 'schooldesk', x: 6, y: 7 }, { t: 'schooldesk', x: 9, y: 7 }, { t: 'schooldesk', x: 12, y: 7 },
      { t: 'bookshelf', x: 13, y: 1 }, { t: 'plant', x: 1, y: 9 },
    ],
    spots: {},
  },
  newspaper: {
    w: 14, h: 10, floor: 'concrete', floorColors: ['#b8b2a6', '#a8a296'], wall: '#d6d2c6', wallPattern: 'brick',
    furniture: [
      { t: 'press', x: 9, y: 1 }, { t: 'window', x: 2, y: 0 }, { t: 'board', x: 5, y: 0 },
      { t: 'typedesk', x: 2, y: 4 }, { t: 'typedesk', x: 6, y: 4 }, { t: 'typedesk', x: 2, y: 7 }, { t: 'cabinet', x: 12, y: 6 }, { t: 'boxes', x: 11, y: 8 },
    ],
    spots: {},
  },
};

// Ev iç mekânı üreticisi
function houseInterior(n) {
  const r = U.rng(U.hash('house', n));
  const walls = ['#a9c7e3', '#f2dd8a', '#e8c9d8', '#c9e3c8', '#e8d9b8', '#d6c8e8', '#f2d0b0'];
  const floors = [['wood', ['#c9a06a', '#b08a58']], ['wood', ['#a8743f', '#8a5a32']], ['parquet', ['#b07a4a', '#9a6a3e']], ['carpet', ['#8a9ab0', '#7a8aa0']], ['tile', ['#e8e2d0', '#d9d2c0']]];
  const fl = r.pick(floors);
  const cols = ['#5a7ec9', '#c94a4a', '#3a6b4a', '#a3762e', '#7a3a8a', '#e8b02e', '#5a6e9a'];
  const W = 14, H = 10;
  const f = [];
  const layout = r.int(0, 2);
  if (layout === 0) {
    f.push({ t: 'bed', x: 1, y: 1, c: r.pick(cols) }, { t: 'nightstand', x: 3, y: 2 }, { t: 'window', x: 5, y: 0 });
    f.push({ t: 'kitchen', x: 9, y: 1 }, { t: 'fridge', x: 11, y: 1 }, { t: 'stove', x: 12, y: 1 });
    f.push({ t: 'rug', x: 4, y: 5, c: r.pick(cols) }, { t: 'sofa', x: 5, y: 5, c: r.pick(cols) }, { t: 'ctable', x: 10, y: 5 }, { t: 'chair', x: 11, y: 5 });
    f.push({ t: 'bookshelf', x: 7, y: 1, c: 'shelf' }, { t: 'plant', x: 12, y: 8 }, { t: 'tv', x: 1, y: 6 });
  } else if (layout === 1) {
    f.push({ t: 'tv', x: 1, y: 0 }, { t: 'window', x: 4, y: 0 }, { t: 'bookshelf', x: 6, y: 1, c: 'shelf' }, { t: 'bed', x: 11, y: 1, c: r.pick(cols) });
    f.push({ t: 'roundrug', x: 3, y: 4, c: r.pick(cols) }, { t: 'armchair', x: 2, y: 4, c: r.pick(cols) }, { t: 'ctable', x: 4, y: 5 });
    f.push({ t: 'sink', x: 8, y: 5 }, { t: 'fridge', x: 10, y: 5 }, { t: 'dresser', x: 11, y: 4 }, { t: 'plant2', x: 1, y: 8 }, { t: 'painting', x: 9, y: 0, c: r.pick(cols) });
  } else {
    f.push({ t: 'wardrobe', x: 1, y: 1, c: 'shelf' }, { t: 'bed1', x: 3, y: 1, c: r.pick(cols) }, { t: 'bed1', x: 5, y: 1, c: r.pick(cols) }, { t: 'window', x: 7, y: 0 });
    f.push({ t: 'kitchen', x: 10, y: 1 }, { t: 'stove', x: 12, y: 1 }, { t: 'dining', x: 4, y: 5 }, { t: 'chair', x: 3, y: 6 }, { t: 'chair', x: 7, y: 6 });
    f.push({ t: 'sofa', x: 10, y: 6, c: r.pick(cols) }, { t: 'plant', x: 12, y: 8 }, { t: 'clock', x: 9, y: 0 }, { t: 'washer', x: 1, y: 7 });
  }
  return {
    w: W, h: H, floor: fl[0], floorColors: fl[1], wall: r.pick(walls), wallStripe: r.chance(0.5), wallPattern: r.chance(0.3) ? 'dots' : null,
    wainscot: r.chance(0.4) ? r.pick(['#6b4426', '#8a7a5a', '#5a6e9a']) : null,
    furniture: f, spots: {},
  };
}

// Gizli oda iç mekânı
function secretInterior(kind) {
  const base = { w: 10, h: 8, floor: 'stone', floorColors: ['#5a5560', '#4a4550'], wall: '#3a3540', wallPattern: 'brick', edge: '#120c10', spots: {} };
  if (kind === 'killer') base.furniture = [{ t: 'photowall', x: 1, y: 0, act: 'secret_ev' }, { t: 'candles', x: 5, y: 2 }, { t: 'weapon', x: 6, y: 3, act: 'secret_ev' }, { t: 'trophy', x: 7, y: 0 }, { t: 'candles', x: 1, y: 5 }];
  else if (kind === 'net') base.furniture = [{ t: 'lionboard', x: 1, y: 0, act: 'secret_ev' }, { t: 'phones', x: 5, y: 2, act: 'secret_ev' }, { t: 'money', x: 7, y: 3 }, { t: 'safe', x: 8, y: 2, act: 'secret_ev' }, { t: 'cabinet', x: 1, y: 4 }];
  else if (kind === 'wine') { base.floorColors = ['#7a6a5a', '#6a5a4a']; base.furniture = [{ t: 'barrelrack', x: 1, y: 0 }, { t: 'barrel', x: 6, y: 2 }, { t: 'barrel', x: 7, y: 2 }, { t: 'grapes', x: 7, y: 4, act: 'secret_ev' }]; }
  else base.furniture = [{ t: 'boxes', x: 1, y: 2 }, { t: 'boxes', x: 2, y: 2 }, { t: 'shelf', x: 5, y: 2, c: 'shop', act: 'secret_ev' }, { t: 'lamp', x: 8, y: 4 }];
  return base;
}

WORLD.makeInterior = function (id, def) {
  def.id = id;
  const W = def.w, H = def.h;
  const m = {
    id, kind: 'interior', name: (DATA.PLACES[id] || { name: id }).name, w: W, h: H,
    solid: new Uint8Array(W * H), reach: new Uint8Array(W * H), acts: {},
    door: { x: Math.floor(W / 2), y: H - 1 }, spots: def.spots || {}, objects: [], lights: [], def,
  };
  const idx = (x, y) => y * W + x;
  for (let x = 0; x < W; x++) { m.solid[idx(x, 0)] = 1; m.solid[idx(x, 1)] = 1; m.solid[idx(x, H - 1)] = 1; }
  for (let y = 0; y < H; y++) { m.solid[idx(0, y)] = 1; m.solid[idx(W - 1, y)] = 1; }
  m.solid[idx(m.door.x, H - 1)] = 0;
  for (const f of def.furniture) {
    const cat = ART.FURN[f.t];
    if (!cat) continue;
    for (let y = f.y; y < f.y + cat.h; y++) for (let x = f.x; x < f.x + cat.w; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (cat.solid === 'all' || (cat.solid === 'base' && y === f.y + cat.h - 1)) m.solid[idx(x, y)] = 1;
      if (cat.reach) m.reach[idx(x, y)] = 1;
      if (f.act) m.acts[x + ',' + y] = f.act;
      if (f.c === 'shelf') m.acts[x + ',' + y] = m.acts[x + ',' + y] || 'shelf';
    }
  }
  m.ground = ART.renderInterior(m, def);
  m.free = WORLD.freeTiles(m);
  return m;
};

// Kapıdan ulaşılabilen boş karolar
WORLD.freeTiles = function (m) {
  const W = m.w, H = m.h;
  const seen = new Uint8Array(W * H);
  const q = [[m.door.x, H - 2]];
  seen[(H - 2) * W + m.door.x] = 1;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const i = ny * W + nx;
      if (seen[i] || m.solid[i]) continue;
      seen[i] = 1; q.push([nx, ny]);
    }
  }
  const out = [];
  const taken = new Set();
  for (const k in m.spots) taken.add(m.spots[k][0] + ',' + m.spots[k][1]);
  for (let y = 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!seen[y * W + x]) continue;
    if (Math.abs(x - m.door.x) <= 1 && y >= H - 3) continue;
    if (taken.has(x + ',' + y)) continue;
    out.push([x, y]);
  }
  return out;
};

// İç mekânları tembel üret (35 ev + iş yerleri)
WORLD.getMap = function (id) {
  if (WORLD.maps[id]) return WORLD.maps[id];
  let def;
  if (id.startsWith('secret:')) {
    const [, host, kind] = id.split(':');
    def = secretInterior(kind);
    DATA.PLACES[id] = { name: 'Gizli oda (' + (DATA.PLACES[host] || { short: host }).short + ')', short: 'Gizli oda' };
    const m = WORLD.makeInterior(id, def);
    m.secretOf = host;
    WORLD.maps[id] = m;
    return m;
  }
  if (WORLD.INTERIORS[id]) def = WORLD.INTERIORS[id];
  else if (/^h\d+$/.test(id)) def = houseInterior(+id.slice(1));
  else return null;
  WORLD.maps[id] = WORLD.makeInterior(id, def);
  return WORLD.maps[id];
};

WORLD.init = function () {
  WORLD.BUILDINGS = []; WORLD.houses = []; WORLD.maps = {};
  WORLD.maps.town = WORLD.buildTown();
};

// Kasabada bir bölgenin yürünebilir karoları (NPC'ler için)
WORLD.townSpots = function (zone) {
  const m = WORLD.maps.town;
  const z = m.zones[zone];
  if (!z) return [];
  const out = [];
  for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) if (!m.solid[y * m.w + x]) out.push([x, y]);
  return out;
};
