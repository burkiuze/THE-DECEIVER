'use strict';
// Ana menü, zorluk seçimi, kayıtlı oyun, ayarlar, “Bizi Takip Et”, duraklatma ve oyun sonu.

const SETTINGS = { volume: 0.8, textSpeed: 'normal', shake: true };
const SETTINGS_KEY = 'the-deceiver-settings';
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* depolama kapalı */ }
SETTINGS.save = function () { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ volume: SETTINGS.volume, textSpeed: SETTINGS.textSpeed, shake: SETTINGS.shake })); } catch (e) { /* yok say */ } };

// Zorluk seviyeleri
const DIFFS = {
  easy: {
    name: 'Kolay', tag: 'Hikâye için', color: '#3f8a3e', clock: 0.8, focus: 0.7, deadline: 3, serialGap: 3, serialGapLate: 2, maxKills: 7,
    frameGap: 4, frameSusp: 25, decay: 6, hints: 2, money: 100, arrestLimit: 0, hiddenAll: false,
    desc: ['Saat daha yavaş akar', 'Odak harcamaları az', 'Davalar için 4 gün', 'Seri katil 3 gecede bir öldürür', 'Yellow Bea’nın tuzakları zayıf'],
  },
  normal: {
    name: 'Orta', tag: 'Önerilen', color: '#c9a24a', clock: 1, focus: 1, deadline: 2, serialGap: 2, serialGapLate: 1, maxKills: 6,
    frameGap: 3, frameSusp: 35, decay: 4, hints: 1, money: 60, arrestLimit: 0, hiddenAll: false,
    desc: ['Dengeli oyun', 'Davalar için 3 gün', 'Seri katil 2 gecede bir, sonra her gece', 'Görev ipuçları açık'],
  },
  hard: {
    name: 'Zor', tag: 'Dedektifler için', color: '#c0392b', clock: 1.15, focus: 1.3, deadline: 1, serialGap: 2, serialGapLate: 1, maxKills: 5,
    frameGap: 3, frameSusp: 40, decay: 2, hints: 1, money: 40, arrestLimit: 0, hiddenAll: false,
    desc: ['Saat hızlı akar, odak pahalı', 'Davalar için yalnızca 2 gün', 'Seri katil 5 kurbandan sonra kaçar', 'Bea’nın tuzakları güçlü'],
  },
  deceiver: {
    name: 'THE DECEIVER', tag: 'Gerçek mentalistler için', color: '#7a5ad2', clock: 1.3, focus: 1.5, deadline: 1, serialGap: 1, serialGapLate: 1, maxKills: 5,
    frameGap: 2, frameSusp: 45, decay: 0, hints: 0, money: 20, arrestLimit: 3, hiddenAll: true,
    desc: ['Hiçbir görev ipucu yok', 'Tüm izler gizli (Gözlem şart)', 'Seri katil HER GECE öldürür', 'Bea iki günde bir tuzak kurar', '3. tutuklanmada oyun biter'],
  },
};
const DIFF = () => DIFFS[(G.state && G.state.diff) || 'normal'];

const MENU = { panel: 'main' };

DATA.SOCIAL = [
  { name: 'GitHub', handle: 'burkiuze/THE-DECEIVER', url: 'https://github.com/burkiuze/THE-DECEIVER' },
  { name: 'Instagram', handle: '', url: '' },
  { name: 'TikTok', handle: '', url: '' },
  { name: 'YouTube', handle: '', url: '' },
];

MENU.saveInfo = function () {
  try {
    const s = JSON.parse(localStorage.getItem(G.saveKey) || 'null');
    if (!s || s.v !== 2) return null;
    return s;
  } catch (e) { return null; }
};

MENU.show = function () {
  const t = document.getElementById('title');
  t.classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
  MENU.panel = 'main';
  MENU.render();
  MENU.startFx();
};

MENU.render = function () {
  const box = document.getElementById('menu-panel');
  box.innerHTML = '';
  box.parentElement.classList.toggle('sub', MENU.panel !== 'main');
  const H = U.h;
  const btn = (label, fn, cls, sub) => H('button', { class: 'menu-btn ' + (cls || ''), onclick: () => { SFX.ensure(); SFX.select(); fn(); } }, H('span', null, label), sub ? H('small', null, sub) : null);
  const save = MENU.saveInfo();
  if (MENU.panel === 'main') {
    box.append(
      btn('Yeni Oyun', () => { MENU.panel = 'diff'; MENU.render(); }),
      btn('Kayıtlı Oyun', () => { if (save) { MENU.panel = 'save'; MENU.render(); } }, save ? '' : 'dis', save ? `Gün ${save.day} • ${DIFFS[save.diff || 'normal'].name}` : 'Kayıt yok'),
      btn('Ayarlar', () => { MENU.panel = 'settings'; MENU.render(); }),
      btn('Bizi Takip Et', () => { MENU.panel = 'follow'; MENU.render(); }),
      btn('Nasıl Oynanır?', () => G.howTo(), 'alt'),
    );
  } else if (MENU.panel === 'diff') {
    box.appendChild(H('h2', null, 'Zorluk seç'));
    const grid = H('div', { class: 'diff-grid' });
    for (const [id, d] of Object.entries(DIFFS)) {
      const card = H('button', { class: 'diff-card' + (id === 'deceiver' ? ' deceiver' : ''), style: `--dc:${d.color}` },
        H('div', { class: 'dn' }, d.name), H('div', { class: 'dt' }, d.tag), H('ul', null, ...d.desc.map((x) => H('li', null, x))));
      card.addEventListener('click', () => {
        SFX.select();
        if (save && !card.dataset.confirm) { card.dataset.confirm = '1'; card.querySelector('.dt').textContent = 'Eski kayıt silinecek — onay için tekrar tıkla'; return; }
        MENU.stopFx();
        G.start(true, id);
      });
      grid.appendChild(card);
    }
    box.append(grid, btn('‹ Geri', () => { MENU.panel = 'main'; MENU.render(); }, 'alt'));
  } else if (MENU.panel === 'save') {
    const s = save;
    const chName = ['', 'Yeni Danışman', 'Aslan Ağı', 'Yellow Bea', 'Son Hamle', 'Epilog'][s.story ? s.story.ch : 1];
    box.append(H('h2', null, 'Kayıtlı Oyun'),
      H('div', { class: 'save-card' },
        H('div', null, H('b', null, `Gün ${s.day} • ${DATA.DAYS[(s.day - 1) % 7]} ${U.fmt(s.time)}`)),
        H('div', null, `Zorluk: ${DIFFS[s.diff || 'normal'].name}`),
        H('div', null, `Bölüm: ${chName}`),
        H('div', null, `Çözülen dava: ${s.solved} • Para: $${s.money} • İtibar: ${s.rep}`)),
      btn('Devam Et', () => { MENU.stopFx(); G.start(false); }),
      btn('Kaydı Sil', () => {
        const b = box.querySelector('.danger');
        if (!b.dataset.confirm) { b.dataset.confirm = '1'; b.querySelector('span').textContent = 'Emin misin? Tekrar tıkla'; return; }
        try { localStorage.removeItem(G.saveKey); } catch (e) { /* yok say */ }
        MENU.panel = 'main'; MENU.render();
      }, 'danger'),
      btn('‹ Geri', () => { MENU.panel = 'main'; MENU.render(); }, 'alt'));
  } else if (MENU.panel === 'settings') {
    box.append(H('h2', null, 'Ayarlar'), MENU.settingsForm(), btn('‹ Geri', () => { MENU.panel = 'main'; MENU.render(); }, 'alt'));
  } else if (MENU.panel === 'follow') {
    box.appendChild(H('h2', null, 'Bizi Takip Et'));
    box.appendChild(H('p', { class: 'muted' }, 'Yeni davalar, güncellemeler ve kamera arkası için:'));
    for (const s of DATA.SOCIAL) {
      if (s.url) box.appendChild(H('a', { class: 'menu-btn link', href: s.url, target: '_blank', rel: 'noopener' }, H('span', null, s.name), H('small', null, s.handle)));
      else box.appendChild(H('div', { class: 'menu-btn dis' }, H('span', null, s.name), H('small', null, 'Yakında')));
    }
    box.appendChild(btn('‹ Geri', () => { MENU.panel = 'main'; MENU.render(); }, 'alt'));
  }
  const first = box.querySelector('button:not(.dis), a');
  if (first) first.focus();
};

MENU.settingsForm = function () {
  const H = U.h;
  const wrap = H('div', { class: 'settings' });
  const vol = H('input', { type: 'range', min: '0', max: '100', id: 'set-vol', value: String(Math.round(SETTINGS.volume * 100)) });
  vol.addEventListener('input', () => { SETTINGS.volume = vol.value / 100; SETTINGS.save(); SFX.blip(); });
  wrap.appendChild(H('label', { class: 'set-row' }, H('span', null, 'Ses seviyesi'), vol));
  const speeds = [['slow', 'Yavaş'], ['normal', 'Normal'], ['fast', 'Hızlı'], ['instant', 'Anında']];
  const seg = H('div', { class: 'seg' });
  for (const [id, label] of speeds) {
    const b = H('button', { class: 'opt' + (SETTINGS.textSpeed === id ? ' on' : '') }, label);
    b.addEventListener('click', () => { SETTINGS.textSpeed = id; SETTINGS.save(); seg.querySelectorAll('.opt').forEach((x) => x.classList.toggle('on', x === b)); });
    seg.appendChild(b);
  }
  wrap.appendChild(H('div', { class: 'set-row' }, H('span', null, 'Yazı hızı'), seg));
  const fs = H('button', { class: 'opt' }, document.fullscreenElement ? 'Tam ekrandan çık' : 'Tam ekran');
  fs.addEventListener('click', () => {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    if (p && p.catch) p.catch(() => UI.toast('Tam ekran bu pencerede desteklenmiyor.'));
    setTimeout(() => { fs.textContent = document.fullscreenElement ? 'Tam ekrandan çık' : 'Tam ekran'; }, 300);
  });
  wrap.appendChild(H('div', { class: 'set-row' }, H('span', null, 'Ekran'), fs));
  wrap.appendChild(H('div', { class: 'set-row keys' }, H('span', null, 'Kontroller'), H('div', { class: 'small' }, 'WASD/Oklar: yürü, sür • Shift: koş • E: konuş/incele/arabaya bin • Q: Gözlem • F: Dosya • P: Telefon • Esc: Menü • M: Ses')));
  return wrap;
};

MENU.settingsModal = function () {
  UI.modal({ title: 'Ayarlar', build(b) { b.appendChild(MENU.settingsForm()); } });
};

// Oyun içi duraklatma menüsü
MENU.pause = function () {
  if (UI.busy() || G.scripting) return;
  const m = UI.modal({
    title: 'Duraklatıldı',
    build(b) {
      const H = U.h;
      const d = DIFF();
      b.appendChild(H('p', { class: 'muted' }, `Zorluk: ${d.name} • Gün ${G.state.day}`));
      const col = H('div', { class: 'pause-col' });
      col.append(
        H('button', { class: 'big', onclick: () => m.close() }, 'Devam Et'),
        H('button', { class: 'big alt', onclick: () => { m.close(); PHONE.open(); } }, 'Telefon (P)'),
        H('button', { class: 'big alt', onclick: () => { m.close(); MENU.settingsModal(); } }, 'Ayarlar'),
        H('button', { class: 'big alt', onclick: () => { G.save(); UI.toast('Oyun kaydedildi.', 'good'); } }, 'Kaydet'),
        H('button', { class: 'big danger', onclick: () => { G.save(); m.close(); G.running = false; MENU.show(); } }, 'Kaydet ve Ana Menü'),
      );
      b.appendChild(col);
    },
  });
};

// Oyun sonu (THE DECEIVER zorluğunda üçüncü tutuklanma)
MENU.gameOver = async function (title, text) {
  try { localStorage.removeItem(G.saveKey); } catch (e) { /* yok say */ }
  await UI.interlude([['Yellow Bea', 'Aslan', 'Lion Lion. Danışman bitti. Hücresinden bir daha çıkamayacak.'], ['Aslan', 'Yellow Bea', 'Lion Lion. Aferin, Sarı Arı.']]);
  const m = UI.modal({
    title, closable: false,
    build(b) {
      b.appendChild(U.h('p', null, text));
      b.appendChild(U.h('div', { class: 'mg-actions' }, U.h('button', { class: 'big', onclick: () => { m.close(); G.running = false; MENU.show(); } }, 'Ana Menü')));
    },
  });
  await m.done;
};

// Menü arka planı: yağmur ve uzak fener ışığı
MENU.startFx = function () {
  const cv = document.getElementById('menu-fx');
  if (!cv) return;
  const g = cv.getContext('2d');
  const drops = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: 0.4 + Math.random() * 0.6 }));
  let t = 0;
  MENU.fxOn = true;
  const step = () => {
    if (!MENU.fxOn) return;
    cv.width = innerWidth; cv.height = innerHeight;
    t += 1 / 60;
    g.fillStyle = '#0b0a10'; g.fillRect(0, 0, cv.width, cv.height);
    const bx = cv.width * 0.5 + Math.cos(t * 0.6) * cv.width * 0.6, by = cv.height * 0.15;
    const gr = g.createRadialGradient(bx, by, 0, bx, by, cv.width * 0.45);
    gr.addColorStop(0, 'rgba(232,195,90,0.10)'); gr.addColorStop(1, 'rgba(232,195,90,0)');
    g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(160,170,200,0.35)';
    for (const d of drops) { d.y += d.v * 0.012; d.x -= 0.002; if (d.y > 1) { d.y = 0; d.x = Math.random() * 1.2; } g.fillRect(d.x * cv.width, d.y * cv.height, 1, 8); }
    requestAnimationFrame(step);
  };
  step();
};
MENU.stopFx = function () { MENU.fxOn = false; };
