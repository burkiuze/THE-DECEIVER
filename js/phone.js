'use strict';
// Jade'in telefonu: GPS haritası (hedef belirleme), mesajlar, rehber (arama), yön oku.

const PHONE = { app: 'home' };

// ---------------------------------------------------------------- mesajlar
G.msg = function (from, text, silent) {
  const st = G.state;
  st.msgs = st.msgs || [];
  st.msgs.push({ from, text, day: st.day, time: st.time, read: false });
  if (st.msgs.length > 80) st.msgs.shift();
  if (!silent) { UI.toast(`📱 ${from}: ${text.length > 60 ? text.slice(0, 57) + '...' : text}`); SFX.tone(1200, 0.06, 'sine', 0.04); SFX.tone(1500, 0.08, 'sine', 0.04, 0.09); }
};

// ---------------------------------------------------------------- hedef (waypoint)
// place: bina id'si, 'park' / 'cemetery' / 'lighthouse' / 'docks' ya da {x,y} karo
G.setWaypoint = function (label, place) {
  const tm = WORLD.maps.town;
  let x, y;
  if (typeof place === 'object') { x = place.x; y = place.y; }
  else {
    const b = WORLD.building(place);
    if (b) { x = b.door.x; y = b.door.y + 1; }
    else { const sp = { park: tm.spots.parkCenter, cemetery: tm.spots.crypt, lighthouse: tm.spots.bench, docks: [85, 81], booth: tm.spots.booth, crypt: tm.spots.crypt, bench: tm.spots.bench }[place]; if (!sp) return; [x, y] = sp; }
  }
  G.state.wp = { label, x, y, place: typeof place === 'string' ? place : null };
  UI.toast('📍 Hedef: ' + label, 'good');
};

G.navInfo = function () {
  const wp = G.state && G.state.wp;
  if (!wp) return null;
  if (G.map.id !== 'town') {
    if (wp.place && (wp.place === G.map.id)) { G.state.wp = null; UI.toast('Hedefe vardın: ' + wp.label, 'good'); return null; }
    return { label: wp.label, text: 'önce dışarı çık', angle: Math.PI / 2, dist: null };
  }
  const tx = wp.x * TS + 8, ty = wp.y * TS + 8;
  const dx = tx - G.player.x, dy = ty - G.player.y + 6;
  const d = Math.hypot(dx, dy);
  if (d < TS * 2.2) { G.state.wp = null; UI.toast('Hedefe vardın: ' + wp.label, 'good'); SFX.select(); return null; }
  return { label: wp.label, text: Math.round(d / TS * 2) + ' m', angle: Math.atan2(dy, dx), dist: d, tx, ty };
};

// Dünya üzerine: oyuncunun etrafında dönen ok ve hedef işareti
G.drawNav = function (ctx) {
  const n = G.navInfo();
  const el = document.getElementById('nav');
  if (!n) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  UI.setHud('nav-label', n.label);
  UI.setHud('nav-dist', n.text);
  document.getElementById('nav-arrow').style.transform = `rotate(${n.angle + Math.PI / 2}rad)`;
  if (G.map.id !== 'town') return;
  const px = G.player.x, py = G.player.y - 14;
  const r = G.driving ? 30 : 22;
  const ax = px + Math.cos(n.angle) * r, ay = py + Math.sin(n.angle) * r;
  ctx.save();
  ctx.translate(ax, ay); ctx.rotate(n.angle);
  ctx.fillStyle = '#2b1d1a'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, -4); ctx.lineTo(-1, 0); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  // hedef işareti
  const bob = Math.sin(G.t * 4) * 2;
  ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(n.tx, n.ty - 22 + bob, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(n.tx - 4, n.ty - 20 + bob); ctx.lineTo(n.tx + 4, n.ty - 20 + bob); ctx.lineTo(n.tx, n.ty - 12 + bob); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(n.tx, n.ty - 22 + bob, 2, 0, Math.PI * 2); ctx.fill();
};

// ---------------------------------------------------------------- telefon arayüzü
PHONE.open = function (app) {
  if (UI.busy() || G.scripting) return;
  PHONE.app = app || 'home';
  let screen;
  const m = UI.modal({
    title: '', closable: true,
    onKey(k) {
      if (k === 'p' || k === 'P') { m.close(); return true; }
      if (k === 'Backspace' && PHONE.app !== 'home') { PHONE.app = 'home'; render(); return true; }
      return false;
    },
    build(b) { screen = b; },
  });
  m.el.classList.add('phone-modal');
  const render = () => {
    screen.innerHTML = '';
    const st = G.state;
    const unread = (st.msgs || []).filter((x) => !x.read).length;
    const bar = U.h('div', { class: 'ph-status' }, U.h('span', null, U.fmt(Math.floor(st.time / 10) * 10)), U.h('span', null, 'SSB'), U.h('span', null, '▮▮▮ 87%'));
    screen.appendChild(bar);
    const body = U.h('div', { class: 'ph-screen' });
    screen.appendChild(body);
    const back = () => U.h('button', { class: 'ph-back', onclick: () => { PHONE.app = 'home'; render(); } }, '‹ Ana ekran');
    if (PHONE.app === 'home') {
      body.classList.add('home');
      body.appendChild(U.h('img', { class: 'ph-logo', src: 'assets/logo.png', alt: '' }));
      const apps = [
        ['map', '🗺️', 'Harita'], ['msgs', '💬', 'Mesajlar' + (unread ? ` (${unread})` : '')], ['contacts', '📇', 'Rehber'],
        ['tasks', '✅', 'Görevler'], ['file', '📁', 'Dosya'], ['settings', '⚙️', 'Ayarlar'],
      ];
      const grid = U.h('div', { class: 'ph-apps' });
      for (const [id, ic, label] of apps) {
        grid.appendChild(U.h('button', { class: 'ph-app', onclick: () => {
          if (id === 'file') { m.close(); DOSSIER.open('case'); return; }
          if (id === 'settings') { m.close(); MENU.settingsModal(); return; }
          PHONE.app = id; render();
        } }, U.h('span', { class: 'ic' }, ic), U.h('span', null, label)));
      }
      body.appendChild(grid);
      if (st.wp) body.appendChild(U.h('div', { class: 'ph-wp' }, `📍 Hedef: ${st.wp.label} `, U.h('button', { class: 'mini-btn', onclick: () => { st.wp = null; render(); } }, 'Temizle')));
      return;
    }
    body.appendChild(back());
    if (PHONE.app === 'map') PHONE.mapApp(body, m);
    if (PHONE.app === 'msgs') {
      const list = (st.msgs || []).slice().reverse();
      if (!list.length) body.appendChild(U.h('p', { class: 'muted' }, 'Mesaj yok.'));
      for (const x of list) {
        body.appendChild(U.h('div', { class: 'ph-msg' + (x.read ? '' : ' unread') }, U.h('div', { class: 'who' }, x.from, U.h('span', { class: 'when' }, `Gün ${x.day} ${U.fmt(x.time)}`)), U.h('div', null, x.text)));
        x.read = true;
      }
    }
    if (PHONE.app === 'contacts') PHONE.contacts(body, m);
    if (PHONE.app === 'tasks') {
      for (const t of TALK.tasks()) {
        const row = U.h('div', { class: 'ph-task' + (t.done ? ' done' : '') }, U.h('span', null, (t.done ? '✓ ' : '• ') + t.t), U.h('span', { class: 'small muted' }, t.where));
        if (!t.done && t.place) row.appendChild(U.h('button', { class: 'mini-btn', onclick: () => { G.setWaypoint(t.whereName || t.where, t.place); m.close(); } }, '📍 Yol tarifi'));
        body.appendChild(row);
      }
    }
  };
  render();
};

PHONE.mapApp = function (body, m) {
  const st = G.state;
  const tm = WORLD.maps.town;
  const scale = 0.17;
  const cv = U.h('canvas', { width: Math.round(tm.w * TS * scale), height: Math.round(83 * TS * scale), class: 'ph-map' });
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(tm.ground, 0, 0, tm.w * TS, 83 * TS, 0, 0, cv.width, cv.height);
  for (const o of tm.objects) if (o.kind === 'building') g.drawImage(o.img, o.x * scale, o.y * scale, o.img.width * scale, o.img.height * scale);
  const dot = (x, y, col, r) => { g.fillStyle = col; g.beginPath(); g.arc(x * TS * scale, y * TS * scale, r || 3, 0, Math.PI * 2); g.fill(); };
  for (const sc of Object.values(st.scenes)) if (!sc.closed) { const b = WORLD.building(sc.place); if (b) dot(b.door.x, b.door.y, '#c0392b', 3.5); else dot(sc.body[0], sc.body[1], '#c0392b', 3.5); }
  if (st.wp) dot(st.wp.x, st.wp.y, '#ffd25a', 4);
  const me = G.map.id === 'town' ? [G.player.x / TS, G.player.y / TS] : (() => { const b = WORLD.building(G.map.secretOf || G.map.id); return b ? [b.door.x, b.door.y] : [0, 0]; })();
  dot(me[0], me[1], '#3a6ad2', 4); dot(me[0], me[1], '#fff', 1.5);
  cv.addEventListener('click', (e) => {
    const r = cv.getBoundingClientRect();
    const tx = Math.round(((e.clientX - r.left) / r.width) * cv.width / scale / TS);
    const ty = Math.round(((e.clientY - r.top) / r.height) * cv.height / scale / TS);
    let best = null, bd = 1e9;
    for (const b of WORLD.BUILDINGS) { const d = Math.hypot(b.door.x - tx, b.door.y - ty); if (d < bd) { bd = d; best = b; } }
    if (best && bd < 5) G.setWaypoint(G.place(best.id).name, best.id);
    else G.setWaypoint(`İşaretli nokta (${tx},${ty})`, { x: tx, y: ty });
    m.close();
  });
  body.appendChild(U.h('p', { class: 'small muted' }, 'Haritaya dokunarak hedef seç. Mavi: sen • Kırmızı: olay yerleri • Sarı: hedef'));
  body.appendChild(cv);
  // hızlı hedefler
  const quick = [];
  quick.push(['Karakol', 'station'], ['Adli Tıp', 'lab'], ['Altın Fincan Kafe', 'cafe'], ['Kırmızı Kayık Bar', 'bar'], ['Grand Palmiye Oteli', 'hotel']);
  for (const sc of Object.values(st.scenes)) if (!sc.closed) quick.push([`Olay yeri: ${POP.get(sc.victim).first}`, sc.map === 'town' ? { x: sc.body[0], y: sc.body[1] + 1 } : sc.place]);
  const c = G.activeCase();
  if (c) for (const s of c.suspects) { const p = POP.get(s.pid); const loc = POP.where(p, st.day, st.time); const target = PHONE.locTarget(loc); if (target) quick.push([`Şüpheli: ${p.first} (${POP.placeName(loc)})`, target]); }
  for (const d of (st.story.drops || []).filter((x) => !x.done)) quick.push([`Ölü nokta: ${d.label}`, d.spot]);
  if (st.story.ch === 4 && st.story.finalDay > 0) quick.push(['Deniz feneri (final)', 'lighthouse']);
  const list = U.h('div', { class: 'ph-quick' });
  for (const [label, target] of quick) list.appendChild(U.h('button', { class: 'opt', onclick: () => { G.setWaypoint(label, target); m.close(); } }, '📍 ' + label));
  body.appendChild(list);
};

// Bir program konumunu harita hedefine çevir
PHONE.locTarget = function (loc) {
  if (!loc) return null;
  if (loc.startsWith('at:')) { const [x, y] = loc.slice(3).split(',').map(Number); return { x, y }; }
  if (loc === 'walk' || loc === 'park') return 'park';
  if (loc === 'lighthouse') return 'lighthouse';
  if (WORLD.building(loc)) return loc;
  return null;
};

PHONE.contacts = function (body, m) {
  const st = G.state;
  body.appendChild(U.h('p', { class: 'small muted' }, 'Birini ara: nerede olduğunu söyler ve yol tarifi alırsın (5 dk).'));
  const cast = ['boss', 'grace', 'kevin', 'ray', 'ortiz', 'sam', 'mia', 'lou', 'hector'];
  const where = { boss: 'station', grace: 'station', kevin: 'station', ray: 'station', ortiz: 'lab', sam: 'lab', mia: 'cafe', lou: 'bar', hector: 'hotel' };
  const row = (portraitSpec, name, sub, onCall) => U.h('div', { class: 'ph-contact' }, MINI.portraitEl(portraitSpec, 32), U.h('div', { class: 'pinfo' }, U.h('div', { class: 'nm' }, name), U.h('div', { class: 'small muted' }, sub)), U.h('button', { class: 'mini-btn', onclick: onCall }, '📞 Ara'));
  for (const id of cast) {
    const c = DATA.CAST[id];
    body.appendChild(row(c.spec, c.name, G.place(where[id]).short, () => { m.close(); G.runScript(async () => { G.advance(5); await UI.say({ name: c.name, spec: c.spec }, `Jade? ${G.place(where[id]).name} içindeyim. Gel istersen.`); G.setWaypoint(c.name, where[id]); }); }));
  }
  const met = Object.keys(st.know).filter((pid) => st.know[pid].met).map((pid) => POP.get(pid)).filter(Boolean);
  const recent = (st.talked || []).slice().reverse().map((pid) => POP.get(pid)).filter(Boolean);
  const ordered = Array.from(new Set(recent.concat(met)));
  if (!ordered.length) body.appendChild(U.h('p', { class: 'small muted' }, 'Tanıştığın kişilerin numaraları burada görünür.'));
  for (const p of ordered.slice(0, 40)) {
    body.appendChild(row(p.spec, p.name, p.phone + ' • ' + p.job, () => {
      m.close();
      G.runScript(async () => {
        G.advance(5);
        if (!p.alive) return UI.say(null, 'Aradığınız numara artık kullanılmamaktadır.');
        if (p.jailed) return UI.say(null, 'Telefon kapalı. (Gözaltında.)');
        const loc = POP.where(p, st.day, st.time);
        const who = G.pwho(p);
        if (STORY.isMember(p.id) && st.story.alert > 60) return UI.say(who, '...Kimsiniz? Bu numarayı nereden buldunuz? (Kapattı.)');
        const target = PHONE.locTarget(loc);
        await UI.say(who, `Alo? Ah, danışman. Şu an buradayım: ${POP.placeName(loc)}.`);
        if (target) G.setWaypoint(p.name, target);
      });
    }));
  }
};
