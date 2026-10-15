'use strict';
// Haritalar: kasaba (dış mekân) ve bina iç mekânları. Çarpışma, kapılar, etkileşim karoları.

const WORLD = { maps: {} };

WORLD.BUILDINGS = [
  { id: 'cafe', x: 4, y: 9, w: 7, h: 5 },
  { id: 'hotel', x: 12, y: 6, w: 8, h: 8 },
  { id: 'station', x: 25, y: 5, w: 12, h: 8 },
  { id: 'lab', x: 44, y: 7, w: 8, h: 6 },
  { id: 'house1', x: 4, y: 21, w: 6, h: 5 },
  { id: 'gallery', x: 12, y: 21, w: 8, h: 5 },
  { id: 'bar', x: 44, y: 21, w: 8, h: 5 },
  { id: 'mansion', x: 4, y: 32, w: 12, h: 7 },
  { id: 'house2', x: 16, y: 34, w: 5, h: 5 },
  { id: 'vineyard', x: 25, y: 33, w: 8, h: 6 },
  { id: 'warehouse', x: 44, y: 32, w: 10, h: 7 },
];
for (const b of WORLD.BUILDINGS) {
  b.style = b.id;
  b.name = DATA.PLACES[b.id].name;
  b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
}
WORLD.building = (id) => WORLD.BUILDINGS.find((b) => b.id === id);

// ------------------------------------------------------------------------------
// Kasaba
// ------------------------------------------------------------------------------
WORLD.buildTown = function () {
  const W = 56, H = 44;
  const m = {
    id: 'town', kind: 'town', name: DATA.TOWN, w: W, h: H,
    tiles: new Array(W * H).fill('grass'),
    solid: new Uint8Array(W * H),
    reserved: new Uint8Array(W * H),
    acts: {}, objects: [], doors: [], lights: [],
  };
  const idx = (x, y) => y * W + x;
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) m.tiles[idx(x, y)] = t; };
  const res = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) m.reserved[idx(x, y)] = 1; };
  const rect = (x0, y0, x1, y1, fn) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(x, y); };

  // Yollar
  rect(2, 16, 53, 17, (x, y) => set(x, y, 'road'));
  rect(2, 29, 53, 30, (x, y) => set(x, y, 'road'));
  rect(2, 40, 53, 40, (x, y) => set(x, y, 'road'));
  rect(21, 2, 22, 40, (x, y) => set(x, y, 'road'));
  rect(40, 2, 41, 40, (x, y) => set(x, y, 'road'));
  // Karakol önü meydan
  rect(26, 13, 36, 15, (x, y) => set(x, y, 'plaza'));
  // Kumsal ve deniz
  rect(2, 41, 53, 41, (x, y) => set(x, y, 'sand'));
  rect(0, 42, W - 1, H - 1, (x, y) => set(x, y, 'water'));
  rect(46, 41, 48, H - 1, (x, y) => set(x, y, 'plank'));
  // Park göleti
  rect(27, 21, 34, 26, (x, y) => {
    const corner = (x === 27 || x === 34) && (y === 21 || y === 26);
    if (!corner) set(x, y, 'water');
  });
  rect(25, 19, 36, 27, res);
  // Bağ (üzüm sıraları)
  rect(34, 33, 38, 38, (x, y) => { set(x, y, 'soil'); res(x, y); });

  // Binalar
  for (const b of WORLD.BUILDINGS) {
    rect(b.x - 1, b.y - 1, b.x + b.w, b.y + b.h, res);
    rect(b.x, b.y, b.x + b.w - 1, b.y + b.h - 1, (x, y) => { m.solid[idx(x, y)] = 1; });
    m.solid[idx(b.door.x, b.door.y)] = 0;
    m.doors.push({ x: b.door.x, y: b.door.y, to: b.id });
    // Kapıdan yola giden patika
    let y = b.door.y + 1;
    while (y < H && m.tiles[idx(b.door.x, y)] !== 'road' && m.tiles[idx(b.door.x, y)] !== 'plaza') { set(b.door.x, y, 'road'); res(b.door.x, y); y++; }
    b.img = ART.building(b);
    m.objects.push({ kind: 'building', b, x: b.x * TS - 2, y: b.y * TS - 6, base: (b.y + b.h) * TS, img: b.img });
  }

  // Yol ve su karoları ayrılmış sayılır
  for (let i = 0; i < W * H; i++) if (m.tiles[i] !== 'grass') m.reserved[i] = 1;
  rect(0, 42, W - 1, H - 1, (x, y) => { if (m.tiles[idx(x, y)] === 'water') m.solid[idx(x, y)] = 1; });
  rect(27, 21, 34, 26, (x, y) => { if (m.tiles[idx(x, y)] === 'water') m.solid[idx(x, y)] = 1; });

  // Jade'in arabası
  const car = { x: 27, y: 13 };
  set(27, 13, 'plaza'); set(28, 13, 'plaza');
  m.solid[idx(27, 13)] = 1; m.solid[idx(28, 13)] = 1;
  m.acts['27,13'] = 'car'; m.acts['28,13'] = 'car';
  m.objects.push({ kind: 'car', x: car.x * TS - 2, y: car.y * TS - 8, base: (car.y + 1) * TS, img: ART.car() });

  // Üzüm asmaları
  const vineImg = ART.vine();
  for (let x = 34; x <= 38; x += 2) for (let y = 33; y <= 38; y++) {
    m.solid[idx(x, y)] = 1;
    m.objects.push({ kind: 'vine', x: x * TS, y: y * TS - 10, base: (y + 1) * TS, img: vineImg });
  }

  // Park bankları
  const benchImg = ART.bench();
  [[25, 23], [35, 19], [29, 27]].forEach(([x, y]) => {
    m.solid[idx(x, y)] = 1; m.solid[idx(x + 1, y)] = 1;
    m.objects.push({ kind: 'bench', x: x * TS, y: y * TS - 2, base: (y + 1) * TS, img: benchImg });
  });

  // Sokak lambaları
  const lampImg = ART.lamp();
  const lampSpots = [[8, 15], [19, 15], [24, 15], [38, 15], [43, 15], [52, 15], [8, 28], [19, 28], [24, 28], [38, 28], [43, 28], [52, 28], [12, 39], [23, 39], [39, 39], [42, 39], [20, 22], [42, 10], [23, 10], [39, 22]];
  for (const [x, y] of lampSpots) {
    if (m.solid[idx(x, y)] || m.tiles[idx(x, y)] !== 'grass') continue;
    m.solid[idx(x, y)] = 1; m.reserved[idx(x, y)] = 1;
    m.objects.push({ kind: 'lamp', x: x * TS + 3, y: y * TS - 18, base: (y + 1) * TS - 1, img: lampImg });
    m.lights.push({ x: x * TS + 8, y: y * TS - 14, r: 56 });
  }

  // Ağaçlar: kenar ormanı + rastgele
  const r = U.rng(4242);
  const trees = [ART.tree(0), ART.tree(1), ART.tree(2)];
  const bushImg = ART.bush();
  const addTree = (x, y, v) => {
    m.solid[idx(x, y)] = 1;
    m.objects.push({ kind: 'tree', x: x * TS - 9, y: y * TS - 26, base: (y + 1) * TS, img: trees[v] });
  };
  for (let y = 0; y < 42; y++) for (let x = 0; x < W; x++) {
    const border = x < 2 || x >= W - 2 || y < 2;
    if (border) {
      m.solid[idx(x, y)] = 1;
      if ((x + y) % 2 === 0 || y < 1) addTree(x, y, r.chance(0.35) ? 2 : r.int(0, 1));
      else m.solid[idx(x, y)] = 1;
    }
  }
  for (let y = 2; y < 41; y++) for (let x = 2; x < W - 2; x++) {
    const i = idx(x, y);
    if (m.reserved[i] || m.solid[i] || m.tiles[i] !== 'grass') continue;
    // ağaçların yol kenarına çok yakın olmaması için çevreyi kontrol et
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t = m.tiles[idx(x + dx, y + dy)];
      if (t === 'road' || t === 'plaza' || m.reserved[idx(x + dx, y + dy)] && t !== 'grass') near = true;
    }
    const roll = r.next();
    if (!near && roll < 0.07) addTree(x, y, r.pick([0, 0, 1, 2]));
    else if (!near && roll < 0.10) { m.solid[i] = 1; m.objects.push({ kind: 'bush', x: x * TS - 1, y: y * TS - 2, base: (y + 1) * TS - 2, img: bushImg }); }
    else if (roll < 0.16) m.tiles[i] = 'flowers';
  }
  // Park ağaçları
  [[25, 20], [36, 25], [26, 26], [35, 21], [33, 19]].forEach(([x, y]) => { if (!m.solid[idx(x, y)] && m.tiles[idx(x, y)] === 'grass') addTree(x, y, 1); });

  // Zemin tuvali
  const [gc, gg] = ART.canvas(W * TS, H * TS);
  const gr = U.rng(777);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ART.groundTile(gg, m.tiles[idx(x, y)], x * TS, y * TS, gr, { x, y });
  // kıyı çizgisi
  gg.fillStyle = '#d6eef8';
  for (let x = 0; x < W; x++) if (m.tiles[idx(x, 42)] === 'water') gg.fillRect(x * TS, 42 * TS, TS, 2);
  m.ground = gc;
  // Pencere ışıkları
  for (const b of WORLD.BUILDINGS) for (const w of b.windows) m.lights.push({ x: w.x, y: w.y, r: 22, win: true });
  for (const b of WORLD.BUILDINGS) m.lights.push({ x: (b.door.x + 0.5) * TS, y: (b.door.y + 0.7) * TS, r: 26 });
  return m;
};

// ------------------------------------------------------------------------------
// İç mekânlar
// ------------------------------------------------------------------------------
WORLD.INTERIORS = {
  station: {
    w: 20, h: 13, floor: 'wood', floorColors: ['#b98a5a', '#a37748'], wall: '#9fb0c2', wallStripe: true,
    furniture: [
      { t: 'window', x: 2, y: 0 }, { t: 'window', x: 13, y: 0 },
      { t: 'board', x: 8, y: 0, act: 'board' },
      { t: 'kitchen', x: 5, y: 1, act: 'tea' },
      { t: 'bookshelf', x: 17, y: 1 },
      { t: 'couch', x: 1, y: 4, act: 'couch' },
      { t: 'plant', x: 1, y: 2 }, { t: 'plant', x: 18, y: 10 }, { t: 'plant', x: 1, y: 10 },
      { t: 'rug', x: 13, y: 3, c: '#3d4a6b' },
      { t: 'desk', x: 15, y: 4 },
      { t: 'cdesk', x: 10, y: 4, act: 'computer' },
      { t: 'desk', x: 3, y: 8 }, { t: 'desk', x: 7, y: 8 },
      { t: 'chair', x: 4, y: 9 }, { t: 'chair', x: 8, y: 9 },
      { t: 'cabinet', x: 13, y: 8 }, { t: 'cabinet', x: 14, y: 8 },
      { t: 'lamp', x: 18, y: 4 },
    ],
    spots: { boss: [16, 5, 0], grace: [10, 5, 1], kevin: [4, 10, 1], ray: [8, 10, 1] },
    spawn: [3, 6],
  },
  lab: {
    w: 16, h: 11, floor: 'tile', floorColors: ['#dfe6e8', '#c5cfd2'], wall: '#cfe0e3',
    furniture: [
      { t: 'morgue', x: 1, y: 0 },
      { t: 'slab', x: 3, y: 4, act: 'autopsy' },
      { t: 'labdesk', x: 10, y: 2, act: 'printlab' },
      { t: 'cabinet', x: 14, y: 2 }, { t: 'cabinet', x: 13, y: 7 },
      { t: 'plant', x: 14, y: 9 }, { t: 'plant', x: 1, y: 9 },
      { t: 'window', x: 6, y: 0 },
    ],
    spots: { ortiz: [6, 4, 2], sam: [12, 4, 0] },
  },
  cafe: {
    w: 14, h: 10, floor: 'checker', floorColors: ['#e8dcc8', '#c9a882'], wall: '#d9a77c', wallStripe: true,
    furniture: [
      { t: 'bookshelf', x: 2, y: 0 }, { t: 'window', x: 8, y: 0 }, { t: 'window', x: 10, y: 0 },
      { t: 'counter', x: 1, y: 3 }, { t: 'coffee', x: 2, y: 3 },
      { t: 'ctable', x: 8, y: 3 }, { t: 'ctable', x: 11, y: 3 }, { t: 'ctable', x: 8, y: 6 }, { t: 'ctable', x: 11, y: 6 },
      { t: 'stool', x: 9, y: 3 }, { t: 'stool', x: 12, y: 6 },
      { t: 'plant', x: 12, y: 2 }, { t: 'plant', x: 1, y: 8 },
    ],
    spots: { mia: [3, 2, 0], guest: [10, 4, 0], guest2: [9, 7, 2] },
  },
  hotel: {
    w: 16, h: 11, floor: 'carpet', floorColors: ['#8a3a3a', '#7a2f30'], wall: '#e7c9a3', wallStripe: true,
    furniture: [
      { t: 'keyboard', x: 3, y: 0 }, { t: 'elevator', x: 12, y: 0 }, { t: 'window', x: 7, y: 0 },
      { t: 'reception', x: 2, y: 3 },
      { t: 'rug', x: 9, y: 5, c: '#c9a24a' },
      { t: 'sofa', x: 10, y: 4, c: '#3a5a4a' }, { t: 'sofa', x: 10, y: 7, c: '#3a5a4a' },
      { t: 'plant', x: 1, y: 2 }, { t: 'plant', x: 14, y: 2 }, { t: 'plant', x: 14, y: 9 },
      { t: 'lamp', x: 1, y: 8 },
    ],
    spots: { hector: [4, 2, 0], guest: [13, 6, 2], guest2: [6, 7, 0] },
    body: [10, 6],
  },
  bar: {
    w: 14, h: 10, floor: 'wood', floorColors: ['#6b4426', '#5a3820'], wall: '#4b2e1c',
    furniture: [
      { t: 'bottles', x: 1, y: 0 },
      { t: 'counter5', x: 1, y: 3, c: '#5a3820' },
      { t: 'stool', x: 1, y: 4 }, { t: 'stool', x: 3, y: 4 }, { t: 'stool', x: 5, y: 4 },
      { t: 'jukebox', x: 12, y: 1 },
      { t: 'ctable', x: 9, y: 3 },
      { t: 'pooltable', x: 8, y: 6 },
      { t: 'plant', x: 1, y: 8 },
    ],
    spots: { lou: [3, 2, 0], guest: [10, 4, 2], guest2: [4, 7, 0] },
    body: [4, 6],
  },
  gallery: {
    w: 16, h: 10, floor: 'tile', floorColors: ['#f2f0ea', '#e2ded4'], wall: '#fbfaf7',
    furniture: [
      { t: 'artwall', x: 2, y: 0, c: '#3a6ad2' }, { t: 'artwall', x: 6, y: 0, c: '#d95f5f' }, { t: 'artwall', x: 10, y: 0, c: '#3aa04a' },
      { t: 'statue', x: 4, y: 4 }, { t: 'statue', x: 11, y: 4 },
      { t: 'bench', x: 7, y: 6 },
      { t: 'easel', x: 13, y: 3 },
      { t: 'plant', x: 1, y: 2 }, { t: 'plant', x: 14, y: 8 },
    ],
    spots: { guest: [3, 7, 0], guest2: [12, 7, 2] },
    body: [8, 4],
  },
  mansion: {
    w: 18, h: 12, floor: 'wood', floorColors: ['#7a4a2a', '#6b4024'], wall: '#d9c8a8', wallStripe: true,
    furniture: [
      { t: 'window', x: 4, y: 0 }, { t: 'fireplace', x: 8, y: 0 }, { t: 'window', x: 12, y: 0 },
      { t: 'bookshelf', x: 1, y: 1 }, { t: 'bookshelf', x: 15, y: 1 },
      { t: 'rug6', x: 6, y: 4, c: '#5a3a6b' },
      { t: 'sofa', x: 8, y: 4, c: '#7a2f3a' },
      { t: 'armchair', x: 6, y: 5, c: '#7a2f3a' }, { t: 'armchair', x: 11, y: 5, c: '#7a2f3a' },
      { t: 'piano', x: 2, y: 6 },
      { t: 'gclock', x: 13, y: 1 },
      { t: 'plant', x: 1, y: 10 }, { t: 'plant', x: 16, y: 10 },
      { t: 'lamp', x: 15, y: 6 },
    ],
    spots: { guest: [4, 9, 0], guest2: [14, 8, 2] },
    body: [9, 8],
  },
  warehouse: {
    w: 18, h: 12, floor: 'concrete', floorColors: ['#9aa0a6', '#868c92'], wall: '#7d8a96',
    furniture: [
      { t: 'rack', x: 6, y: 1 }, { t: 'rack', x: 10, y: 1 },
      { t: 'crate', x: 2, y: 3 }, { t: 'crate', x: 3, y: 3 }, { t: 'crate', x: 2, y: 4 },
      { t: 'crate', x: 14, y: 3 }, { t: 'crate', x: 15, y: 3 }, { t: 'crate', x: 15, y: 4 },
      { t: 'crate', x: 13, y: 9 }, { t: 'crate', x: 14, y: 9 },
      { t: 'barrel', x: 2, y: 8 }, { t: 'barrel', x: 3, y: 9 }, { t: 'barrel', x: 16, y: 9 },
      { t: 'forklift', x: 5, y: 6 },
      { t: 'desk', x: 13, y: 6 },
    ],
    spots: { guest: [11, 6, 2], guest2: [3, 6, 0] },
    body: [9, 8],
  },
  vineyard: {
    w: 16, h: 11, floor: 'stone', floorColors: ['#b5a58a', '#9a8a72'], wall: '#c9a882',
    furniture: [
      { t: 'barrelrack', x: 1, y: 0 }, { t: 'window', x: 7, y: 0 },
      { t: 'kitchen', x: 12, y: 0 },
      { t: 'table', x: 6, y: 4 },
      { t: 'chair', x: 5, y: 4 }, { t: 'chair', x: 8, y: 5 },
      { t: 'grapes', x: 13, y: 7 }, { t: 'grapes', x: 14, y: 7 },
      { t: 'barrel', x: 1, y: 8 }, { t: 'plant', x: 14, y: 3 },
    ],
    spots: { guest: [4, 7, 0], guest2: [11, 6, 2] },
    body: [9, 8],
  },
  house1: {
    w: 12, h: 9, floor: 'wood', floorColors: ['#c9a06a', '#b08a58'], wall: '#a9c7e3', wallStripe: true,
    furniture: [
      { t: 'bed', x: 1, y: 1, c: '#5a7ec9' }, { t: 'tv', x: 7, y: 0 }, { t: 'window', x: 4, y: 0 },
      { t: 'rug', x: 3, y: 4, c: '#3a6ad2' }, { t: 'sofa', x: 4, y: 4, c: '#5a6e9a' },
      { t: 'ctable', x: 8, y: 4 }, { t: 'plant', x: 10, y: 2 }, { t: 'plant', x: 10, y: 7 },
    ],
    spots: { guest: [6, 6, 0], guest2: [2, 5, 3] },
  },
  house2: {
    w: 12, h: 9, floor: 'wood', floorColors: ['#d9b07a', '#c09a64'], wall: '#f2dd8a', wallStripe: true,
    furniture: [
      { t: 'bed', x: 9, y: 1, c: '#c94a4a' }, { t: 'tv', x: 1, y: 0 }, { t: 'window', x: 5, y: 0 },
      { t: 'rug', x: 4, y: 4, c: '#a3762e' }, { t: 'armchair', x: 3, y: 5, c: '#5a8a4a' },
      { t: 'ctable', x: 6, y: 4 }, { t: 'plant', x: 1, y: 7 }, { t: 'bookshelf', x: 6, y: 1 },
    ],
    spots: { guest: [5, 6, 0], guest2: [8, 5, 2] },
  },
};

WORLD.buildInterior = function (id) {
  const def = WORLD.INTERIORS[id];
  def.id = id;
  const W = def.w, H = def.h;
  const m = {
    id, kind: 'interior', name: DATA.PLACES[id].name, w: W, h: H,
    solid: new Uint8Array(W * H), reach: new Uint8Array(W * H), acts: {},
    door: { x: Math.floor(W / 2), y: H - 1 }, spots: def.spots, body: def.body, objects: [], lights: [],
  };
  const idx = (x, y) => y * W + x;
  for (let x = 0; x < W; x++) { m.solid[idx(x, 0)] = 1; m.solid[idx(x, 1)] = 1; m.solid[idx(x, H - 1)] = 1; }
  for (let y = 0; y < H; y++) { m.solid[idx(0, y)] = 1; m.solid[idx(W - 1, y)] = 1; }
  m.solid[idx(m.door.x, H - 1)] = 0;
  for (const f of def.furniture) {
    const cat = ART.FURN[f.t];
    for (let y = f.y; y < f.y + cat.h; y++) for (let x = f.x; x < f.x + cat.w; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (cat.solid === 'all' || (cat.solid === 'base' && y === f.y + cat.h - 1)) m.solid[idx(x, y)] = 1;
      if (cat.reach) m.reach[idx(x, y)] = 1;
      if (f.act) m.acts[x + ',' + y] = f.act;
    }
  }
  m.ground = ART.renderInterior(m, def);
  return m;
};

// İç mekânda kapıdan ulaşılabilen boş karolar (ipucu yerleştirmek için)
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
  if (m.spots) for (const k in m.spots) taken.add(m.spots[k][0] + ',' + m.spots[k][1]);
  if (m.body) { taken.add(m.body[0] + ',' + m.body[1]); taken.add((m.body[0] + 1) + ',' + m.body[1]); }
  for (let y = 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!seen[y * W + x]) continue;
    if (Math.abs(x - m.door.x) <= 1 && y >= H - 3) continue;
    if (taken.has(x + ',' + y)) continue;
    out.push([x, y]);
  }
  return out;
};

WORLD.init = function () {
  WORLD.maps.town = WORLD.buildTown();
  for (const id in WORLD.INTERIORS) WORLD.maps[id] = WORLD.buildInterior(id);
  WORLD.free = {};
  for (const id of DATA.SCENE_PLACES) WORLD.free[id] = WORLD.freeTiles(WORLD.maps[id]);
};

WORLD.isSolid = function (m, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
  return m.solid[ty * m.w + tx] === 1;
};
