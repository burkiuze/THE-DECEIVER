'use strict';
// Trafik: şeritlerde giden arabalar, kavşakta dönüşler, polis arabaları ve Jade'in sürülebilir arabası.
// Sağdan trafik: doğuya gidenler alt şeritte, batıya gidenler üst şeritte; güneye gidenler batı şeridinde.

const TRAFFIC = { cars: [], parked: [] };
const T_HROADS = [14, 30, 46, 62, 78];
const T_VROADS = [16, 36, 56, 76, 96, 112];
const DIRV = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // 0 aşağı, 1 yukarı, 2 sol, 3 sağ

// ---------------------------------------------------------------- araba görselleri
// kind: 'civ' | 'police' | 'jade'; dir 0-3; frame 0/1 (polis tepe lambası)
ART.carSprite = function (kind, color, dir, frame) {
  return ART.cached(`car:${kind}:${color}:${dir}:${frame}`, () => {
    if (dir === 2 || dir === 3) {
      const [c, g] = ART.canvas(40, 26);
      const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
      if (kind === 'jade') {
        const body = '#a9bccb', dark = '#7d92a3';
        R(2, 13, 36, 6, body); R(4, 11, 32, 3, body); R(10, 5, 18, 7, body); R(8, 8, 4, 4, body); R(26, 8, 6, 4, body);
        R(12, 6, 6, 5, '#34495a'); R(19, 6, 7, 5, '#34495a'); R(13, 7, 2, 2, '#7fa3b8');
        R(2, 17, 36, 2, dark); R(4, 14, 32, 1, '#e8eef2'); R(36, 14, 2, 2, '#ffe9a8'); R(2, 14, 2, 2, '#c94a4a');
        R(6, 18, 8, 3, dark); R(26, 18, 8, 3, dark);
        ART.pcirc(g, 10, 20, 3, 3, '#1d1d1d'); ART.pcirc(g, 30, 20, 3, 3, '#1d1d1d');
      } else {
        const police = kind === 'police';
        const body = police ? '#f4f1ea' : color, dark = SH(police ? '#2b2b30' : color, -0.25);
        R(3, 11, 32, 8, body); R(2, 13, 34, 5, body); R(9, 4, 18, 8, body); R(9, 4, 18, 1, SH(body, 0.3));
        if (police) { R(2, 14, 34, 4, '#2b2b30'); R(13, 15, 10, 2, '#e8c35a'); }
        R(11, 5, 7, 6, '#3d5566'); R(19, 5, 7, 6, '#3d5566'); R(12, 6, 2, 2, '#7fa3b8');
        R(2, 17, 34, 2, dark); R(34, 13, 2, 2, '#ffe9a8'); R(2, 13, 2, 2, '#c94a4a'); R(18, 12, 1, 6, dark);
        if (police) { R(12, 1, 6, 3, frame ? '#ff3b3b' : '#7a1f1f'); R(18, 1, 6, 3, frame ? '#1f2f7a' : '#3b6bff'); }
        ART.pcirc(g, 9, 19.5, 3.5, 3.5, '#1d1d1d'); ART.pcirc(g, 28, 19.5, 3.5, 3.5, '#1d1d1d'); R(8, 18, 2, 2, '#999'); R(27, 18, 2, 2, '#999');
      }
      if (dir === 2) { const [m, mg] = ART.canvas(40, 26); mg.translate(40, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0); ART.outline(m, '#1f2a33'); return m; }
      ART.outline(c, '#1f2a33');
      return c;
    }
    // dikey (aşağı = ön yüz bize dönük, yukarı = arka)
    const [c, g] = ART.canvas(24, 34);
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const down = dir === 0;
    const police = kind === 'police', jade = kind === 'jade';
    const body = jade ? '#a9bccb' : police ? '#f4f1ea' : color;
    const dark = SH(body, -0.25);
    R(1, 7, 3, 6, '#1d1d1d'); R(20, 7, 3, 6, '#1d1d1d'); R(1, 22, 3, 6, '#1d1d1d'); R(20, 22, 3, 6, '#1d1d1d');
    R(4, 3, 16, 28, body); R(3, 6, 18, 22, body); R(4, 3, 16, 1, SH(body, 0.3)); R(3, 6, 1, 22, dark); R(20, 6, 1, 22, dark);
    if (police) { R(4, 3, 16, 5, '#2b2b30'); R(4, 26, 16, 5, '#2b2b30'); }
    if (jade) { R(5, 4, 14, 3, SH(body, 0.15)); R(6, 28, 12, 2, dark); }
    const glass = '#34495a';
    if (down) { R(6, 8, 12, 3, glass); R(5, 12, 14, 7, SH(body, 0.08)); R(5, 19, 14, 5, glass); R(6, 20, 4, 1, '#7fa3b8'); R(5, 29, 3, 2, '#ffe9a8'); R(16, 29, 3, 2, '#ffe9a8'); R(5, 3, 3, 1, '#c94a4a'); R(16, 3, 3, 1, '#c94a4a'); }
    else { R(5, 8, 14, 5, glass); R(6, 9, 4, 1, '#7fa3b8'); R(5, 13, 14, 7, SH(body, 0.08)); R(6, 20, 12, 3, glass); R(5, 30, 3, 1, '#c94a4a'); R(16, 30, 3, 1, '#c94a4a'); R(5, 3, 3, 2, '#ffe9a8'); R(16, 3, 3, 2, '#ffe9a8'); }
    if (police) { R(6, 14, 6, 3, frame ? '#ff3b3b' : '#7a1f1f'); R(12, 14, 6, 3, frame ? '#1f2f7a' : '#3b6bff'); }
    ART.outline(c, '#1f2a33');
    return c;
  });
};

const CAR_COLORS = ['#c0392b', '#2c3e66', '#e8e6df', '#3a6b4a', '#d9a03a', '#5a4a6b', '#2b2b30', '#7a8fa0', '#a35a2e', '#3a8a8a'];

// ---------------------------------------------------------------- şeritler
function laneOf(dir, roadIdx) {
  if (dir === 2) return { axis: 'h', y: T_HROADS[roadIdx] * TS + 8 };
  if (dir === 3) return { axis: 'h', y: (T_HROADS[roadIdx] + 1) * TS + 8 };
  if (dir === 0) return { axis: 'v', x: T_VROADS[roadIdx] * TS + 8 };
  return { axis: 'v', x: (T_VROADS[roadIdx] + 1) * TS + 8 };
}

TRAFFIC.spawn = function (car, edge) {
  const horiz = Math.random() < 0.55;
  if (horiz) {
    const ri = Math.floor(Math.random() * 4);
    car.dir = Math.random() < 0.5 ? 2 : 3;
    car.y = laneOf(car.dir, ri).y;
    car.x = edge ? (car.dir === 3 ? 4 * TS : 123 * TS) : (5 + Math.random() * 115) * TS;
  } else {
    const ri = Math.floor(Math.random() * T_VROADS.length);
    car.dir = Math.random() < 0.5 ? 0 : 1;
    car.x = laneOf(car.dir, ri).x;
    car.y = edge ? (car.dir === 0 ? 4 * TS : 78 * TS) : (5 + Math.random() * 70) * TS;
  }
  car.speed = 0; car.waitT = 0; car.turned = null;
  for (const o of TRAFFIC.cars) if (o !== car && Math.hypot(o.x - car.x, o.y - car.y) < 40) { car.x += DIRV[car.dir][0] * -60; car.y += DIRV[car.dir][1] * -60; }
};

TRAFFIC.init = function () {
  TRAFFIC.cars = [];
  for (let i = 0; i < 22; i++) {
    const police = i < 4;
    const car = { id: i, kind: police ? 'police' : 'civ', color: police ? '#f4f1ea' : CAR_COLORS[i % CAR_COLORS.length], vmax: police ? 78 + Math.random() * 15 : 52 + Math.random() * 26 };
    TRAFFIC.spawn(car, false);
    TRAFFIC.cars.push(car);
  }
};

// Bir noktanın önündeki engel (oyuncu, Jade'in arabası, aynı yöndeki arabalar)
function blockedAhead(car) {
  const [dx, dy] = DIRV[car.dir];
  const look = 30;
  const near = (ox, oy, lat) => {
    const rx = ox - car.x, ry = oy - car.y;
    const along = rx * dx + ry * dy;
    const side = Math.abs(rx * dy - ry * dx);
    return along > 4 && along < look && side < lat;
  };
  if (G.map && G.map.id === 'town') {
    const p = G.driving ? G.state.car : { x: G.player.x, y: G.player.y - 6 };
    if (near(p.x, p.y, 12)) return 'player';
    const jc = G.state.car;
    if (!G.driving && jc && near(jc.x, jc.y, 12)) return 'obj';
  }
  for (const o of TRAFFIC.cars) if (o !== car && o.dir === car.dir && near(o.x, o.y, 8)) return 'car';
  return null;
}

TRAFFIC.update = function (dt) {
  for (const car of TRAFFIC.cars) {
    const blk = blockedAhead(car);
    const target = blk ? 0 : car.vmax;
    car.speed += U.clamp(target - car.speed, -160 * dt, 60 * dt);
    if (blk && car.speed < 1) {
      car.waitT += dt;
      if (blk === 'player' && car.waitT > 1.2 && !car.honked && G.map.id === 'town') { car.honked = true; SFX.tone(370, 0.15, 'square', 0.03); SFX.tone(370, 0.15, 'square', 0.03, 0.2); }
      if (car.waitT > 5) { TRAFFIC.uturn(car); }
    } else { car.waitT = 0; car.honked = false; }
    const [dx, dy] = DIRV[car.dir];
    const px = car.x, py = car.y;
    car.x += dx * car.speed * dt; car.y += dy * car.speed * dt;
    // kavşakta dönüş
    if (dx) {
      for (const vx of T_VROADS) {
        const pts = car.dir === 3 ? [[vx * TS + 8, 0], [(vx + 1) * TS + 8, 1]] : [[(vx + 1) * TS + 8, 1], [vx * TS + 8, 0]];
        for (const [p, nd] of pts) {
          if ((px - p) * (car.x - p) <= 0 && car.turned !== 'v' + vx) {
            car.turned = 'v' + vx;
            const rightTurn = (car.dir === 3 && nd === 0) || (car.dir === 2 && nd === 1);
            if (Math.random() < (rightTurn ? 0.28 : 0.14)) { car.x = p; car.dir = nd; }
          }
        }
      }
    } else {
      for (const hy of T_HROADS) {
        const pts = car.dir === 0 ? [[hy * TS + 8, 2], [(hy + 1) * TS + 8, 3]] : [[(hy + 1) * TS + 8, 3], [hy * TS + 8, 2]];
        for (const [p, nd] of pts) {
          if ((py - p) * (car.y - p) <= 0 && car.turned !== 'h' + hy) {
            car.turned = 'h' + hy;
            const rightTurn = (car.dir === 0 && nd === 2) || (car.dir === 1 && nd === 3);
            if (Math.random() < (rightTurn ? 0.28 : 0.14)) { car.y = p; car.dir = nd; }
          }
        }
      }
    }
    if (car.x < 3 * TS || car.x > 125 * TS || car.y < 3 * TS || car.y > 80 * TS) TRAFFIC.spawn(car, true);
  }
};

TRAFFIC.uturn = function (car) {
  const flip = { 0: 1, 1: 0, 2: 3, 3: 2 };
  car.dir = flip[car.dir];
  if (car.dir === 2) car.y -= TS; else if (car.dir === 3) car.y += TS; else if (car.dir === 0) car.x -= TS; else car.x += TS;
  car.waitT = 0; car.turned = null;
};

TRAFFIC.rect = function (car) {
  return car.dir >= 2 ? [car.x - 17, car.y - 7, car.x + 17, car.y + 6] : [car.x - 9, car.y - 14, car.x + 9, car.y + 14];
};

TRAFFIC.hit = function (x, y, ignore) {
  for (const car of TRAFFIC.cars) {
    if (car === ignore) continue;
    const [a, b, c, d] = TRAFFIC.rect(car);
    if (x + 5 > a && x - 5 < c && y > b && y - 5 < d) return car;
  }
  return null;
};

TRAFFIC.sprite = function (car) {
  return ART.carSprite(car.kind, car.color, car.dir, car.kind === 'police' ? (Math.floor(G.t * 4) % 2) : 0);
};

TRAFFIC.drawList = function (list, vx0, vy0, vx1, vy1) {
  for (const car of TRAFFIC.cars) {
    if (car.x < vx0 || car.x > vx1 || car.y < vy0 || car.y > vy1) continue;
    list.push({ base: car.y + 8, car });
  }
  for (const p of TRAFFIC.parked) if (p.x > vx0 && p.x < vx1 && p.y > vy0 && p.y < vy1) list.push({ base: p.y + 8, car: p });
  const jc = G.state.car;
  if (jc && G.map.id === 'town') list.push({ base: jc.y + 8, car: Object.assign({ kind: 'jade', color: '#a9bccb' }, jc) });
};

TRAFFIC.drawCar = function (ctx, car) {
  const img = ART.carSprite(car.kind, car.color, car.dir, car.kind === 'police' && car.lights !== false ? (Math.floor(G.t * 4) % 2) : 0);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  if (car.dir >= 2) { ctx.fillRect(Math.round(car.x) - 16, Math.round(car.y) + 5, 32, 3); ctx.drawImage(img, Math.round(car.x) - 20, Math.round(car.y) - 17); }
  else { ctx.fillRect(Math.round(car.x) - 9, Math.round(car.y) + 13, 18, 3); ctx.drawImage(img, Math.round(car.x) - 12, Math.round(car.y) - 19); }
};

// Gece farları
TRAFFIC.lights = function (out) {
  const all = TRAFFIC.cars.concat(G.state.car && G.map.id === 'town' && G.driving ? [Object.assign({}, G.state.car)] : []);
  for (const car of all) {
    const [dx, dy] = DIRV[car.dir];
    out.push({ x: car.x + dx * 30, y: car.y + dy * 30, r: 30 });
  }
  for (const p of TRAFFIC.parked) if (p.kind === 'police') out.push({ x: p.x, y: p.y - 8, r: 26, color: Math.floor(G.t * 4) % 2 ? 'red' : 'blue' });
};

// Kaldırımda 3 karoluk boş park yeri bul (kapı ve dolu yerlerden uzak). Dönüş: araba merkezi (px)
TRAFFIC.curb = function (tx, ty, used, maxScan) {
  const tm = WORLD.maps.town;
  const okTile = (x, y) => !WORLD.isSolid(tm, x, y) && !tm.doors.some((d) => Math.abs(d.x - x) <= 1 && d.y + 1 >= y - 1 && d.y <= y);
  for (let k = 0; k < (maxScan || 14); k++) {
    for (const dx of [k, -k]) {
      const x = tx + dx;
      if (![x - 1, x, x + 1].every((xx) => okTile(xx, ty) && !used.has(xx + ',' + ty))) continue;
      [x - 1, x, x + 1].forEach((xx) => used.add(xx + ',' + ty));
      return { x: x * TS + 8, y: ty * TS + 8 };
    }
  }
  return null;
};

// Karakol önündeki ve olay yerlerinin önündeki polis arabaları
TRAFFIC.updateParked = function () {
  const out = [];
  const used = new Set();
  const jc = G.state && G.state.car;
  if (jc) { const tx = Math.floor(jc.x / TS), ty = Math.floor(jc.y / TS); for (let d = -1; d <= 1; d++) used.add((tx + d) + ',' + ty); }
  const st = WORLD.building('station');
  for (const tx of [st.x + 1, st.x + st.w - 2]) {
    const c = TRAFFIC.curb(tx, st.y + st.h, used, 6);
    if (c) out.push(Object.assign({ kind: 'police', color: '#f4f1ea', dir: 3, lights: false }, c));
  }
  for (const sc of Object.values((G.state && G.state.scenes) || {})) {
    if (sc.closed) continue;
    const b = WORLD.building(sc.place);
    const c = b ? TRAFFIC.curb(b.door.x - 3, b.door.y + 1, used, 10) : TRAFFIC.curb(sc.body[0] - 3, sc.body[1] + 2, used, 10);
    if (c) out.push(Object.assign({ kind: 'police', color: '#f4f1ea', dir: 3, lights: true }, c));
  }
  TRAFFIC.parked = out;
};

TRAFFIC.parkedHit = function (x, y) {
  const list = TRAFFIC.parked.slice();
  if (G.state.car && !G.driving) list.push(G.state.car);
  for (const p of list) {
    const r = p.dir >= 2 ? [p.x - 17, p.y - 7, p.x + 17, p.y + 6] : [p.x - 9, p.y - 14, p.x + 9, p.y + 14];
    if (x + 5 > r[0] && x - 5 < r[2] && y > r[1] && y - 5 < r[3]) return p;
  }
  return null;
};

// ---------------------------------------------------------------- Jade'in arabası
TRAFFIC.defaultCar = function () {
  const st = WORLD.building('station');
  const c = TRAFFIC.curb(st.door.x + 3, st.y + st.h, new Set(), 8) || { x: (st.door.x + 3) * TS + 8, y: (st.y + st.h) * TS + 8 };
  return { x: c.x, y: c.y, dir: 3 };
};

TRAFFIC.carSolidAt = function (x, y, dir) {
  const tm = WORLD.maps.town;
  const pts = dir >= 2 ? [[x - 15, y - 4], [x + 15, y - 4], [x - 15, y + 5], [x + 15, y + 5], [x, y]] : [[x - 8, y - 12], [x + 8, y - 12], [x - 8, y + 12], [x + 8, y + 12], [x, y]];
  for (const [px, py] of pts) {
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    if (WORLD.isSolid(tm, tx, ty)) return true;
    const t = tm.tiles[ty * tm.w + tx];
    if (t === 'water' || t === 'deep') return true;
    if (tm.doors.some((d) => d.x === tx && d.y === ty)) return true;
  }
  for (const n of G.npcs) if (Math.abs(n.x - x) < (dir >= 2 ? 20 : 12) && Math.abs(n.y - 4 - y) < (dir >= 2 ? 10 : 16)) return true;
  for (const car of TRAFFIC.cars) { const [a, b, c, d] = TRAFFIC.rect(car); const [e, f, g2, h] = dir >= 2 ? [x - 17, y - 7, x + 17, y + 6] : [x - 9, y - 14, x + 9, y + 14]; if (e < c && g2 > a && f < d && h > b) return true; }
  for (const p of TRAFFIC.parked) { const r = p.dir >= 2 ? [p.x - 17, p.y - 7, p.x + 17, p.y + 6] : [p.x - 9, p.y - 14, p.x + 9, p.y + 14]; const q = dir >= 2 ? [x - 17, y - 7, x + 17, y + 6] : [x - 9, y - 14, x + 9, y + 14]; if (q[0] < r[2] && q[2] > r[0] && q[1] < r[3] && q[3] > r[1]) return true; }
  return false;
};

TRAFFIC.drive = function (dt, mx, my, fast) {
  const car = G.state.car;
  const len = Math.hypot(mx, my);
  if (len < 0.2) { G.carSpeed = Math.max(0, (G.carSpeed || 0) - 300 * dt); }
  else {
    const nd = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 2 : 3) : (my < 0 ? 1 : 0);
    if (nd !== car.dir && !TRAFFIC.carSolidAt(car.x, car.y, nd)) car.dir = nd;
    G.carSpeed = Math.min(fast ? 230 : 150, (G.carSpeed || 0) + 260 * dt);
  }
  if (!G.carSpeed) return;
  const [dx, dy] = DIRV[car.dir];
  const nx = car.x + dx * G.carSpeed * dt, ny = car.y + dy * G.carSpeed * dt;
  if (!TRAFFIC.carSolidAt(nx, ny, car.dir)) { car.x = nx; car.y = ny; }
  else { if (G.carSpeed > 120) { G.observeFx = 0.2; SFX.tone(110, 0.12, 'sawtooth', 0.05); } G.carSpeed = 0; }
  G.player.x = car.x; G.player.y = car.y + 6; G.player.dir = car.dir;
  if (Math.random() < dt * 8) SFX.tone(60 + G.carSpeed * 0.3, 0.06, 'sawtooth', 0.008);
};

// Arabadan in: yanındaki boş karoya
TRAFFIC.exitCar = function () {
  const car = G.state.car;
  const tries = car.dir >= 2 ? [[0, -20], [0, 22], [-26, 0], [26, 0]] : [[-18, 0], [18, 0], [0, -24], [0, 26]];
  for (const [ox, oy] of tries) {
    const x = car.x + ox, y = car.y + oy + 6;
    if (!G.blocked(G.player, x, y)) { G.player.x = x; G.player.y = y; G.driving = false; G.carSpeed = 0; G.player.dir = 0; return true; }
  }
  UI.toast('Burada inemezsin; biraz daha açık bir yere park et.', 'bad');
  return false;
};

// Bir hedefe en yakın yol karosu (otomatik sürüşte araba orada durur)
TRAFFIC.nearestRoad = function (tx, ty) {
  const tm = WORLD.maps.town;
  let best = null, bd = 1e9;
  for (let y = Math.max(3, ty - 8); y <= Math.min(80, ty + 8); y++) for (let x = Math.max(3, tx - 8); x <= Math.min(124, tx + 8); x++) {
    const t = tm.tiles[y * tm.w + x];
    if (t !== 'sidewalk' && t !== 'parking') continue;
    if (WORLD.isSolid(tm, x, y) || WORLD.isSolid(tm, x - 1, y) || WORLD.isSolid(tm, x + 1, y)) continue;
    if (tm.doors.some((d) => Math.abs(d.x - x) <= 1 && Math.abs(d.y - y) <= 1)) continue;
    const d = Math.abs(x - tx) + Math.abs(y - ty);
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best;
};
