'use strict';
// Konuşmalar ve dava akışları.

const TALK = {};

const CONFESS = {
  miras: 'Bana hiçbir şey bırakmayacaktı! Hayatım boyunca onun kaprislerine katlandım, karşılığında hiçbir şey!',
  kiskanclik: 'Beni bir kenara atıp gülerek yoluna devam edecekti. Buna izin veremezdim... Veremezdim.',
  borc: 'Beni mahvedecekti. Her şeyimi, evimi, ailemi... Sadece biraz zaman istemiştim!',
  santaj: 'Yıllardır beni sağıyordu. Bir gece daha onun sesini telefonda duyamazdım.',
  intikam: 'Hayatımı o mahvetti. Ben sadece... hesabı kapattım.',
  rekabet: 'Her şeyi o aldı benden: müşterilerimi, itibarımı. Bu sefer kazanan ben olacaktım.',
};
const SEALS = { 'FBI Saha Ofisi Müdürü': 'kartal armalı FBI mührü', 'Belediye Başkanı': 'belediyenin terazili mührü', 'Senatör': 'Senato’nun yıldızlı, mavi mumlu mührü' };

// ============================================================ Yönlendirme
TALK.talk = async function (n) {
  const id = n.id;
  if (id === 'boss') return TALK.boss();
  if (id === 'grace') return TALK.grace();
  if (id === 'kevin') return TALK.kevin();
  if (id === 'ray') return TALK.ray();
  if (id === 'ortiz') return TALK.ortiz();
  if (id === 'sam') return TALK.sam();
  if (id === 'mia' || id === 'hector' || id === 'lou') return TALK.witness(id);
  if (id === 'cop') return UI.say({ name: n.name, spec: n.spec }, 'Olay yerini korudum, Bay Jade. Cesede kimse dokunmadı. Ceplerine bakmak isterseniz buyurun.');
  if (n.pid) {
    const p = POP.get(n.pid);
    if (n.jailedNpc) return TALK.jailed(p);
    return TALK.resident(p);
  }
};

TALK.remember = function (pid) {
  const t = G.state.talked;
  const i = t.indexOf(pid);
  if (i >= 0) t.splice(i, 1);
  t.push(pid);
  if (t.length > 10) t.shift();
};

// ============================================================ Kasabalılar
TALK.resident = async function (p) {
  const st = G.state;
  const who = G.pwho(p);
  const kn = G.know(p.id);
  TALK.remember(p.id);
  if (!kn.met) {
    kn.met = true;
    await UI.say(who, DATA.PERSONALITY[p.personality][U.hash(p.id) % 2]);
    await UI.say(who, `Ben ${p.name}. ${p.job[0].toUpperCase() + p.job.slice(1)}. ${p.home === 'hotel' ? 'Otelde kalıyorum.' : G.place(p.home).name + '’de oturuyorum.'}`);
  }
  for (;;) {
    const opts = [];
    const c = G.activeCase();
    const sus = c && c.suspects.find((s) => s.pid === p.id);
    if (sus) opts.push({ label: `[Dava] ${POP.get(c.victim).first} cinayeti hakkında konuşalım`, f: () => TALK.interrogate(c, sus, p) });
    if (c && c.witness.pid === p.id && !c.k.witness) opts.push({ label: `${POP.get(c.victim).first} öldüğü gece bir şey gördünüz mü?`, f: () => TALK.caseWitness(c, p) });
    for (const sc of Object.values(st.scenes)) {
      if (sc.closed) continue;
      for (const w of sc.witnesses) if (w.pid === p.id && !w.heard) opts.push({ label: `${POP.get(sc.victim).first} öldüğü gece bir şey gördünüz mü?`, f: () => TALK.sceneWitness(sc, w, p) });
      const v = POP.get(sc.victim);
      const rel = POP.relOf(p, v);
      if (rel && !(sc.asked || {})[p.id]) opts.push({ label: `${v.first} ${v.last} hakkında ne biliyorsunuz?`, f: () => TALK.aboutVictim(sc, p, rel) });
    }
    if (!kn.read) opts.push({ label: '[Gözlem • 10 odak] Onu oku', f: () => TALK.readPerson(p) });
    for (const fr of st.story.frames.filter((f) => !f.alibi)) opts.push({ label: `Gün ${fr.day} gecesi saat ${U.hm(fr.tod % 24)} civarı beni gördünüz mü?`, f: () => TALK.askAlibi(fr, p.id, who) });
    if (st.story.codeKnown) opts.push({ label: '[Blöf] Kulağına “Lion Lion” de', f: () => TALK.lionBluff(p) });
    opts.push({ label: 'Kendinizden bahsedin', f: () => TALK.smallTalk(p) });
    opts.push({ label: 'Hoşça kalın.' });
    const i = await UI.choose(who, 'Evet?', opts);
    if (!opts[i].f) return;
    await opts[i].f();
  }
};

TALK.smallTalk = async function (p) {
  const who = G.pwho(p);
  G.advance(5);
  const line = DATA.JOB_TALK[p.job] || DATA.PERSONALITY[p.personality][1];
  await UI.say(who, line);
  const rels = POP.relations(p).filter((x) => ['spouse', 'friend', 'enemy', 'sibling'].includes(x.type));
  if (rels.length) {
    const x = rels[U.hash(p.id, G.state.day) % rels.length];
    const t = { spouse: `Eşim ${x.p.first} ${x.p.alive ? 'işten geç gelir hep' : '... artık yok. Hâlâ alışamadım'}.`, friend: `${x.p.name} ile eskiden beri arkadaşız.`, enemy: `${x.p.name} mi? O adı benim yanımda anmayın.`, sibling: `Kardeşim ${x.p.first} ile aynı evde büyüdük.` }[x.type];
    await UI.say(who, t);
  }
};

TALK.readPerson = async function (p) {
  if (!G.useFocus(10)) return;
  SFX.focus(); G.observeFx = 1; G.advance(10);
  const a = p.attrs;
  const lines = TALK.obsLines(a);
  await UI.say(null, `Jade, ${p.first} adlı kişiyi dikkatle süzüyor...`);
  await UI.lines(null, lines);
  G.know(p.id).read = true;
  G.addEvidence('people', 'obs_' + p.id, 'Gözlem: ' + p.name, lines.join(' '), true);
};

TALK.obsLines = function (a) {
  return [
    a.hand === 'sol' ? 'Bardağı SOL eliyle tutuyor; saatini de sağ bileğine takmış. Solak.' : 'Sağ elini kullanıyor; kalemi sağ cebinde.',
    a.smoke === 'içmiyor' ? 'Parmaklarında sigara sarısı yok, üstü sigara kokmuyor: içmiyor.' : `Ceket cebinden bir paket ${a.smoke} görünüyor.`,
    a.scent === 'belirgin koku yok' ? 'Belirgin bir parfüm kokusu yok.' : `Üzerinden hafif bir ${a.scent} kokusu geliyor.`,
  ];
};

TALK.aboutVictim = async function (sc, p, rel) {
  const v = POP.get(sc.victim);
  const who = G.pwho(p);
  G.advance(10);
  sc.asked = sc.asked || {}; sc.asked[p.id] = true;
  const lbl = POP.REL_LABEL[rel] || 'tanıdığı';
  const where = POP.placeName(POP.where(v, sc.day, Math.max(8 * 60, sc.tod * 60 - 180)));
  await UI.say(who, `${v.first}... ${lbl === 'eşi' ? 'Eşimdi' : `Onun ${lbl} sayılırım`}. ${rel === 'enemy' ? 'Aramız kötüydü, saklamayacağım.' : 'Hâlâ inanamıyorum.'}`);
  await UI.say(who, `O gün akşamüstü ${where} civarında olduğunu biliyorum. Ondan sonrasını bilmiyorum.`);
  G.addEvidence(sc.caseId, 'vic_' + sc.id + '_' + p.id, `${p.name}, kurban hakkında`, `${p.name} (${lbl}): ${v.first} o akşamüstü ${where} civarındaymış.`, true);
};

TALK.sceneWitness = async function (sc, w, p) {
  const who = G.pwho(p);
  G.advance(10);
  w.heard = true;
  await UI.say(who, w.text);
  G.addEvidence(sc.caseId, 'wit_' + sc.id + '_' + p.id, 'Tanık: ' + p.name, w.text);
};

TALK.caseWitness = async function (c, p) {
  const who = G.pwho(p);
  G.advance(10);
  await UI.say(who, 'Siz polis misiniz? Ah, danışman. Neyse, birine anlatmam lazımdı.');
  await UI.say(who, c.witness.text);
  c.k.witness = true;
  G.addEvidence(c.id, 'witness_' + c.id, 'Komşunun ifadesi: ' + p.name, c.witness.text);
};

TALK.askAlibi = async function (fr, wid, who) {
  G.advance(5);
  const wits = G.jadeWitnesses(fr.day, fr.tod * 60);
  if (wits.includes(wid)) {
    const s = G.state.story;
    fr.alibi = true;
    s.suspicion = Math.max(0, s.suspicion - 25);
    SFX.good();
    const place = G.state.jlog[Math.floor(((fr.day - 1) * 1440 + fr.tod * 60) / 30)];
    await UI.say(who, `Evet! O saatte ${G.place(place).name} içindeydiniz, sizi gördüm. Gerekirse yeminli ifade veririm.`);
    G.addEvidence('frame', 'alibi_' + fr.id, 'Jade’in mazereti doğrulandı', `${who.name}, Gün ${fr.day} saat ${U.hm(fr.tod % 24)} civarı Jade’i ${G.place(place).name} içinde gördüğünü doğruladı. (Şüphe −25)`);
  } else {
    await UI.say(who, 'Hayır, o saatte sizi görmedim. Üzgünüm.');
  }
};

TALK.lionBluff = async function (p) {
  const st = G.state, s = st.story;
  if (!G.useFocus(5)) return;
  G.advance(5);
  const who = G.pwho(p);
  await UI.say(G.cast('jade'), '(Fısıldayarak) Lion Lion.');
  const mem = s.members[p.id];
  if (mem && !s.exposed[p.id]) {
    s.alert = Math.min(100, s.alert + 20);
    await UI.say(who, '...Ne dediniz? Ben... Bilmiyorum ne dediğinizi. Gitmem lazım.');
    await UI.say(null, `Jade fark ediyor: göz bebekleri büyüdü, sağ eli istemsizce cebine gitti. ${p.first} bu sözü TANIYOR.`);
    G.addEvidence('net', 'bluff_' + p.id, 'Lion Lion tepkisi: ' + p.name, `${p.name} (${p.job}) “Lion Lion” sözüne paniğe kapıldı. Büyük ihtimalle ağın bir üyesi. (Ağ alarmı arttı.)`);
  } else {
    s.alert = Math.min(100, s.alert + 3);
    const r = ['Aslan mı? Hayvanat bahçesi şehir dışında, danışman bey.', 'Lion... ne? İyi misiniz?', 'Bu bir şarkı mı? Hiç duymadım.', 'Ha ha! Yine zihin oyunları mı?'];
    await UI.say(who, r[U.hash(p.id) % r.length]);
    await UI.say(null, 'Gerçek bir şaşkınlık. Bu kişi şifreyi tanımıyor.');
  }
};

// ============================================================ Sorgu (sıradan dava)
TALK.interrogate = async function (c, s, p) {
  const who = G.pwho(p);
  const ks = c.k.sus[p.id];
  for (;;) {
    const opts = [
      { label: (ks.motive ? '✓ ' : '') + 'Kurbanla aranız nasıldı?' },
      { label: (ks.alibi ? '✓ ' : '') + 'Olay gecesi neredeydiniz?' },
      { label: (ks.gossip ? '✓ ' : '') + 'Sizce bunu kim yapmış olabilir?' },
      { label: ks.read ? '✓ Onu zaten okudun' : '[Gözlem • 15 odak] Onu oku', disabled: ks.read },
      { label: 'Şimdilik bu kadar.' },
    ];
    const i = await UI.choose(who, `(${s.relation}) Başka?`, opts);
    if (i === 0) {
      G.advance(10);
      await UI.say(who, DATA.MOTIVES[s.motive].say);
      if (!ks.motive) { ks.motive = true; G.addEvidence(c.id, 'mot_' + p.id, 'İfade: ' + p.name, `Kurbanla ilişkisi (${s.relation}): “${DATA.MOTIVES[s.motive].say}”`, true); }
    } else if (i === 1) {
      G.advance(10);
      await UI.say(who, s.alibi.claim);
      if (!ks.alibi) { ks.alibi = true; G.addEvidence(c.id, 'ali_' + p.id, 'Mazeret: ' + p.name, `“${s.alibi.claim}”`, true); }
    } else if (i === 2) {
      G.advance(10);
      const t = c.suspects.find((x) => x.pid === s.gossipAbout);
      const tp = POP.get(t.pid);
      const line = DATA.MOTIVES[t.motive].gossip(tp.name);
      await UI.say(who, line);
      if (!ks.gossip) { ks.gossip = true; c.k.sus[t.pid].heard.push(`${p.name}: “${line}”`); }
    } else if (i === 3) await TALK.coldRead(c, s, p);
    else return;
  }
};

TALK.coldRead = async function (c, s, p) {
  const ks = c.k.sus[p.id];
  if (!G.useFocus(15)) return;
  SFX.focus(); G.observeFx = 1; G.advance(15);
  const lines = TALK.obsLines(p.attrs);
  await UI.say(null, `Jade, ${p.first} adlı şüpheliyi dikkatle süzüyor...`);
  await UI.lines(null, lines);
  ks.read = true;
  G.know(p.id).read = true;
  G.addEvidence('people', 'obs_' + p.id, 'Gözlem: ' + p.name, lines.join(' '), true);
  const rd = s.read;
  await UI.say(null, 'Jade bir ayrıntı daha fark ediyor: ' + rd.obs);
  const r = U.rng(U.hash(c.id, p.id));
  const opts = r.shuffle([rd.right].concat(rd.wrong));
  const jade = G.cast('jade');
  const who = G.pwho(p);
  const i = await UI.choose(jade, '(İçinden) Bu ne anlama geliyor?', opts);
  if (opts[i] === rd.right) {
    ks.readOk = true;
    SFX.good();
    await UI.say(jade, `${rd.right}... Değil mi? Yüzünüzden okunuyor.`);
    await UI.say(who, rd.secret);
    let txt = `“${rd.secret}”`;
    if (rd.altAlibi && rd.alt) { await UI.say(who, rd.alt); txt += ` Gerçek mazereti: “${rd.alt}”`; }
    G.addEvidence(c.id, 'read_' + p.id, (rd.trace ? 'İtiraf: ' : 'Sır: ') + p.name, (rd.trace ? 'Olay yerine gittiğini kabul etti. ' : '') + txt);
    G.gainFocus(5);
  } else {
    SFX.bad();
    await UI.say(jade, `${opts[i]}... Değil mi?`);
    await UI.say(who, 'Ne? Saçmalık. Bence fazla televizyon izliyorsunuz.');
    await UI.say(null, 'Yanlış okuma. Şüpheli savunmaya geçti.');
  }
};

// ============================================================ Gözaltındakiler
TALK.jailed = async function (p) {
  const s = G.state.story;
  const who = G.pwho(p);
  const mem = s.members[p.id];
  if (mem) {
    const boss = mem.boss ? STORY.codeOf(mem.boss) : null;
    await UI.say(who, mem.rank === 1 ? 'Beni burada tutamazsın, danışman. Aslan’ın kolları uzundur.' : `Bildiğim her şeyi söyledim. Kod adım ${mem.code}. Emirler “${boss}” adlı birinden gelirdi. Yüzünü hiç görmedim.`);
    return;
  }
  if (G.state.serial && G.state.serial.killer === p.id) return UI.say(who, 'Turnaları sayıyor musun, Jade? Ben sayıyordum.');
  await UI.say(who, 'Avukatımı bekliyorum. Size söyleyecek başka bir şeyim yok.');
};

// ============================================================ Karakol kadrosu
TALK.boss = async function () {
  const st = G.state, s = st.story;
  const who = G.cast('boss');
  const c = G.curCase();
  if (c && c.status === 'pending') return TALK.briefing(c);
  for (;;) {
    const opts = [];
    if (G.activeCase()) opts.push({ label: 'Davanın katilini buldum (Suçla)', f: () => TALK.accuseStandard(c) });
    if (st.serial && st.serial.status === 'active' && st.serial.kills > 0) opts.push({ label: `${st.serial.name}’ni buldum`, f: TALK.accuseSerial });
    if (s.codeKnown && !s.done) opts.push({ label: 'Lion Lion ağından birini ifşa et', f: TALK.accuseNet });
    if (s.ch >= 3 && !s.exposed[s.bea]) opts.push({ label: 'Yellow Bea’nın kimliğini biliyorum', f: TALK.accuseBea });
    if (G.activeCase()) opts.push({ label: 'Davayı tekrar özetle', f: () => TALK.summary(c) });
    for (const fr of s.frames.filter((f) => !f.alibi)) opts.push({ label: `Gün ${fr.day} gecesi saat ${U.hm(fr.tod % 24)} civarı beni gördün mü?`, f: () => TALK.askAlibi(fr, 'boss', who) });
    opts.push({ label: 'Hiç. Sadece seni görmeye geldim.' });
    const i = await UI.choose(who, s.ch >= 3 && s.suspicion >= 60 ? `Jade, İç İşler kapıda. Şüphe: ${s.suspicion}/100. Ne buldun?` : 'Evet, Jade? Bir şey bulduysan söyle.', opts);
    if (!opts[i].f) { if (i === opts.length - 1) await UI.say(who, 'Çok tatlı. Şimdi git ve işini yap.'); return; }
    await opts[i].f();
    if (G.curCase() && G.curCase().status === 'closed') return;
  }
};

TALK.summary = async function (c) {
  const v = POP.get(c.victim);
  const sc = G.state.scenes[c.sceneId];
  await UI.say(G.cast('boss'), `Kurban: ${v.name}, ${v.age} yaşında, ${v.job}. Cesedi bu sabah buldular. Olay yeri: ${G.place(sc.place).name}.`);
};

TALK.briefing = async function (c) {
  const st = G.state;
  const who = G.cast('boss');
  await UI.say(who, 'Jade, nihayet. Çayını sonra içersin. Yeni bir davamız var.');
  await TALK.summary(c);
  await UI.say(who, 'Kurbanın çevresinden dört kişi öne çıkıyor:');
  for (const s of c.suspects) { const p = POP.get(s.pid); await UI.say(who, `${p.name} (${p.age}, ${p.job}): kurbanın ${s.relation}. Şu sıralar ${POP.placeName(POP.where(p, st.day, st.time))} civarında.`); }
  await UI.say(who, 'Olay yerine git, cesedi ve ceplerini incele, Dr. Ortiz’le konuş, şüphelileri sorgula. Ve lütfen... kimseyi hipnotize etme.');
  await UI.say(G.cast('jade'), 'Söz veremem ama elimden geleni yaparım. Ki bu genelde fazlasıdır.');
  c.status = 'active';
  c.deadline = st.day + 2;
  await UI.say(who, `${DATA.DAYS[(c.deadline - 1) % 7]} gece yarısına kadar vaktin var. Katili bulunca bana gel: katili, yöntemi ve motifi söyleyeceksin.`);
  const sc = st.scenes[c.sceneId];
  G.addEvidence(c.id, 'brief_' + c.id, 'Dava özeti', `Kurban ${POP.get(c.victim).name}. Olay yeri: ${G.place(sc.place).name}. Şüpheliler: ${c.suspects.map((s) => `${POP.get(s.pid).name} (${s.relation})`).join(', ')}.`, true);
  UI.toast(`Yeni dava: ${c.title}`, 'good');
  SFX.good();
};

TALK.grace = async function () {
  const st = G.state, s = st.story;
  const who = G.cast('grace');
  for (;;) {
    const metNoBg = Object.entries(st.know).filter(([pid, k]) => k.met && !k.bg && CASES.eligible(POP.get(pid))).map(([pid]) => POP.get(pid));
    const c = G.activeCase();
    const caseSus = c ? c.suspects.map((x) => POP.get(x.pid)).filter((p) => !G.know(p.id).bg) : [];
    const todo = Array.from(new Set(caseSus.concat(metNoBg)));
    const phones = st.evidence.filter((e) => /Son aramalar/.test(e.text));
    const opts = [];
    if (todo.length) opts.push({ label: `Geçmiş taraması (ayakkabı, araç) — ${todo.length} kişi`, f: () => TALK.bgCheck(todo) });
    opts.push({ label: 'Nüfus veritabanında ara (cinsiyet, saç, ayakkabı, araç...)', f: () => MINI.dbSearch() });
    if (phones.length) opts.push({ label: 'Telefon numaralarının sahiplerini bul', f: () => TALK.phoneLookup(phones) });
    if (s.ch >= 3) opts.push({ label: 'Yellow Bea’nın erişebileceği yüksek mevkideki kişiler kimler?', f: TALK.beaCandidates });
    for (const fr of s.frames.filter((f) => !f.alibi)) opts.push({ label: `Gün ${fr.day} gecesi saat ${U.hm(fr.tod % 24)} civarı beni gördün mü?`, f: () => TALK.askAlibi(fr, 'grace', who) });
    opts.push({ label: 'Sonra.' });
    const i = await UI.choose(who, 'Bilgisayar hazır. Ne lazım?', opts);
    if (!opts[i].f) return;
    await opts[i].f();
  }
};

TALK.bgCheck = async function (list) {
  const who = G.cast('grace');
  const opts = list.slice(0, 8).map((p) => `${p.name} (30 dk)`);
  if (list.length > 1) opts.push(`İlk ${Math.min(8, list.length)} kişinin hepsi (${Math.min(8, list.length) * 20} dk)`);
  opts.push('Vazgeç');
  const i = await UI.choose(who, 'Kimi tarayayım?', opts);
  let sel = [];
  if (i < Math.min(8, list.length)) sel = [list[i]];
  else if (list.length > 1 && i === Math.min(8, list.length)) sel = list.slice(0, 8);
  for (const p of sel) {
    G.advance(sel.length > 1 ? 20 : 30);
    G.know(p.id).bg = true;
    const extra = ['Sabıka kaydı temiz.', 'Birkaç ödenmemiş park cezası var.', 'Kredi kartı borçları yüksek.', 'On yıl önce bir kavga yüzünden gözaltı kaydı var.', 'Geçen yıl bir şirket kurmuş, batmış.', 'Son ayda hesabından büyük para çekilmiş.'][U.hash(p.id) % 6];
    const txt = `${p.age} yaşında, ${p.job}. Ayakkabı: ${p.attrs.shoe} numara. Kayıtlı araç: ${p.attrs.vehicle}. Telefon: ${p.phone}. ${extra}`;
    G.addEvidence('people', 'bg_' + p.id, 'Geçmiş taraması: ' + p.name, txt, true);
    if (sel.length === 1) await UI.say(who, `${p.name}: ${txt}`);
  }
  if (sel.length > 1) await UI.say(who, `${sel.length} kişiyi taradım; sonuçlar dosyanda (Kişiler sekmesi).`);
};

TALK.phoneLookup = async function (phones) {
  const who = G.cast('grace');
  G.advance(20);
  const nums = new Set();
  for (const e of phones) for (const m of e.text.matchAll(/555-0\d{3}/g)) nums.add(m[0]);
  const lines = [];
  for (const n of nums) {
    const p = POP.people.find((q) => q.phone === n);
    lines.push(`${n} → ${p ? p.name + ' (' + p.job + ')' : 'kayıtsız, ön ödemeli hat'}`);
  }
  await UI.say(who, 'Operatör kayıtları geldi: ' + lines.join(' • '));
  G.addEvidence('people', 'phones_' + G.state.day + '_' + nums.size, 'Telefon sahipleri', lines.join(' • '));
};

TALK.beaCandidates = async function () {
  const who = G.cast('grace');
  const list = POP.beaCandidates.filter((p) => p.alive);
  await UI.say(who, 'Bea’nın bildiklerini bilebilecek, dosyalarımıza erişimi olan beş kişi var: ' + list.map((p) => `${p.name} (${p.job})`).join(', ') + '.');
  await UI.say(who, 'Hepsi yüksek mevkide. Elinde kanıt olmadan birini suçlarsan, bu sana pahalıya patlar.');
  G.addEvidence('net', 'beacands', 'Yellow Bea olabilecekler', list.map((p) => `${p.name} — ${p.job}`).join('; ') + '. Bea’nın izlerini (Lion Lion sekmesi) bu kişilerin özellikleriyle karşılaştır.');
};

TALK.kevin = async function () {
  const who = G.cast('kevin');
  const nt = TALK.nextTask();
  const st = G.state;
  const opts = [{ label: 'Ne yapmalıyım sence?' }];
  for (const fr of st.story.frames.filter((f) => !f.alibi)) opts.push({ label: `Gün ${fr.day} gecesi saat ${U.hm(fr.tod % 24)} civarı beni gördün mü?`, fr });
  opts.push({ label: 'Hiç.' });
  const i = await UI.choose(who, 'Jade.', opts);
  if (opts[i].fr) return TALK.askAlibi(opts[i].fr, 'kevin', who);
  if (i !== 0) return;
  if (!nt) return UI.say(who, 'Şu an bekleyen bir iş yok. Kanepen seni çağırıyor.');
  await UI.say(who, `Ben olsam şuna bakardım: ${nt.t}. Yer: ${nt.where}.`);
  if (nt.hint) await UI.say(who, nt.hint);
};

TALK.ray = async function () {
  const who = G.cast('ray');
  const st = G.state;
  const tips = [
    'İnsanları “okuyunca” elini, sigarasını, parfümünü öğreniyorsun. Grace de ayakkabı numarasını ve aracını bulur.',
    'Cesetlerin ceplerine bak. Bazen astarın içine bir şey dikilir; dikkatle aramak gerek.',
    'Bazı evlerde kitaplıkların arkasında gizli oda varmış. Gözlem açıkken bakmak lazım.',
    'Mazeretleri kafe, otel ve bardakilere sor. Ama önce şüpheliye nerede olduğunu sorman lazım.',
    'Herkesin bir programı var. Sabah işte, öğlen kafede, akşam barda... Birini arıyorsan saatine dikkat et.',
    'Seri katiller bir desen izler. Kurbanların ortak noktasını bul.',
  ];
  const opts = [{ label: 'İpucu ver' }];
  for (const fr of st.story.frames.filter((f) => !f.alibi)) opts.push({ label: `Gün ${fr.day} gecesi saat ${U.hm(fr.tod % 24)} civarı beni gördün mü?`, fr });
  opts.push({ label: 'Hiç.' });
  const i = await UI.choose(who, 'N’aber Jade? Burrito ister misin?', opts);
  if (opts[i].fr) return TALK.askAlibi(opts[i].fr, 'ray', who);
  if (i === 0) await UI.say(who, tips[Math.floor(Math.random() * tips.length)]);
};

TALK.ortiz = async function () {
  const st = G.state;
  const who = G.cast('ortiz');
  const pending = Object.values(st.scenes).filter((sc) => !sc.closed && sc.visited && !sc.autopsy);
  const unvisited = Object.values(st.scenes).filter((sc) => !sc.closed && !sc.visited);
  const opts = pending.map((sc) => ({ label: `Otopsi: ${POP.get(sc.victim).name}`, sc }));
  const done = Object.values(st.scenes).filter((sc) => !sc.closed && sc.autopsy);
  for (const sc of done) opts.push({ label: `${POP.get(sc.victim).first} adlı kurbanın eşyaları`, items: sc });
  for (const fr of st.story.frames.filter((f) => !f.alibi)) opts.push({ label: `Gün ${fr.day} gecesi saat ${U.hm(fr.tod % 24)} civarı beni gördün mü?`, fr });
  opts.push({ label: 'Sonra.' });
  if (opts.length === 1) return UI.say(who, unvisited.length ? 'Cesetler olay yerinde. Önce sen bir bak, sonra buraya getirsinler.' : 'Bugün morg sessiz. Bu iyiye işaret, değil mi?');
  const i = await UI.choose(who, 'Jade. Hangisi?', opts);
  if (opts[i].fr) return TALK.askAlibi(opts[i].fr, 'ortiz', who);
  if (opts[i].items) return TALK.searchBody(opts[i].items);
  if (!opts[i].sc) return;
  await TALK.autopsy(opts[i].sc);
};

TALK.autopsy = async function (sc) {
  const who = G.cast('ortiz');
  const M = DATA.METHODS[sc.method];
  await UI.say(who, 'Cesedi inceledim. Ama önce senin ne düşündüğünü duymak istiyorum; ne de olsa her şeyi bilen sensin.');
  const r = U.rng(U.hash(sc.id, 'aut'));
  const opts = r.shuffle([sc.method].concat(r.shuffle(DATA.METHOD_KEYS.filter((m) => m !== sc.method)).slice(0, 2)));
  for (;;) {
    const i = await UI.choose(who, `Bulgular: ${M.findings} Sence ölüm nedeni ne?`, opts.map((m) => DATA.METHODS[m].label));
    G.advance(10);
    if (opts[i] === sc.method) break;
    G.state.focus = Math.max(0, G.state.focus - 5); SFX.bad();
    await UI.say(who, 'Hayır. Bulgulara bir daha bak; hepsi bir şey söylüyor. (−5 odak)');
  }
  const h = Math.floor(sc.tod);
  const temp = 37 - (30 - (h + 0.5));
  const wins = r.shuffle([h - 2, h, h + 2]);
  for (;;) {
    const i = await UI.choose(who, `Ceset sabah 06.00’da bulundu. Vücut ısısı ${temp.toFixed(1).replace('.', ',')}°C idi. Normali 37°C; bu koşullarda ceset saatte yaklaşık 1°C soğur. Ölüm hangi aralıkta?`, wins.map((w) => `${U.hm(w)} – ${U.hm(w + 1)}`));
    G.advance(10);
    if (wins[i] === h) break;
    G.state.focus = Math.max(0, G.state.focus - 5); SFX.bad();
    await UI.say(who, 'Tutmuyor. 37’den çıkar, saat başına bir derece... Geriye doğru say. (−5 odak)');
  }
  const c = Object.values(G.state.cases).find((x) => x.sceneId === sc.id);
  const handNote = c && c.sceneAttrs.includes('hand') ? ' ' + M.handText(POP.get(c.culprit).attrs.hand === 'sol') : '';
  const text = `Ölüm nedeni: ${M.label}. Ölüm saati: ${U.hm(h)} – ${U.hm(h + 1)}.${handNote} Olası silah/yöntem: ${sc.weapon}.`;
  await UI.say(who, 'Mükemmel. ' + text);
  sc.autopsy = true;
  G.advance(25);
  G.addEvidence(sc.caseId, 'aut_' + sc.id, 'Otopsi: ' + POP.get(sc.victim).name, text);
  SFX.good();
};

TALK.sam = async function () {
  const who = G.cast('sam');
  const c = G.activeCase();
  const sc = c && G.state.scenes[c.sceneId];
  if (!c || !c.feats.print) return UI.say(who, 'Mikroskobum hazır. Ama bu davada bana getirebileceğin bir iz yok gibi.');
  if (!sc.found.print) return UI.say(who, 'Olay yerinden bir parmak izi getirirsen, şüphelilerin kayıtlı izleriyle karşılaştırırız.');
  if (c.k.print) return UI.say(who, 'Parmak izi sonucu dosyanda.');
  await UI.say(who, 'Kadehteki iz kısmi; tek başına kimseyi göstermez. Şüphelilerin kayıtlı izlerinde bu deseni arayalım. Desen birden fazla kişide çıkabilir.');
  const ok = await MINI.fingerprint(c);
  G.advance(30);
  if (ok) {
    c.k.print = true;
    const names = c.print.matches.map((id) => POP.get(id).name).join(' ve ');
    G.addEvidence(c.id, 'print_' + c.id, 'Parmak izi analizi', `Kadehteki kısmi iz şu kişilerin kayıtlı izleriyle uyumlu: ${names}.`);
    SFX.good();
    await UI.say(who, `Tamamdır: ${names}. İkisinden biri o kadehe dokunmuş.`);
  }
};

const SHOP = {
  mia: [{ label: 'Bergamot çayı', price: 6, focus: 30 }, { label: 'Limonlu kurabiye', price: 3, focus: 12 }],
  lou: [{ label: 'Zencefilli gazoz', price: 4, focus: 16 }],
  hector: [],
};
const GREET = {
  mia: 'Jade! Her zamanki bergamot mu? Yoksa yine birilerini mi soruyorsun?',
  hector: 'Grand Palmiye’ye hoş geldiniz, efendim. Misafir defterimiz polise açıktır... şey, danışmana da.',
  lou: 'Danışman! Sert bir şey mi, yoksa yine soru mu?',
};

TALK.witness = async function (id) {
  const place = { mia: 'cafe', hector: 'hotel', lou: 'bar' }[id];
  const who = G.cast(id);
  for (;;) {
    const st = G.state;
    const c = G.activeCase();
    const ask = c ? c.suspects.filter((s) => s.alibi.place === place && c.k.sus[s.pid].alibi && !c.k.sus[s.pid].checked) : [];
    const opts = [];
    for (const it of SHOP[id]) opts.push({ label: `${it.label} ($${it.price}, +${it.focus} odak)`, it });
    for (const s of ask) opts.push({ label: `${POP.get(s.pid).name} o gece burada mıydı?`, s });
    for (const fr of st.story.frames.filter((f) => !f.alibi)) opts.push({ label: `Gün ${fr.day} gecesi saat ${U.hm(fr.tod % 24)} civarı beni gördün mü?`, fr });
    opts.push({ label: 'Hoşça kal.' });
    const i = await UI.choose(who, GREET[id], opts);
    const o = opts[i];
    if (o.it) {
      if (st.money < o.it.price) { SFX.bad(); await UI.say(who, 'Hesabı karakola mı yazayım? Şaka şaka... ama paran yetmiyor.'); continue; }
      st.money -= o.it.price; G.gainFocus(o.it.focus); G.advance(10); SFX.good();
      await UI.say(null, `Jade ${o.it.label.toLowerCase()} keyfini çıkarıyor. (+${o.it.focus} odak)`);
      continue;
    }
    if (o.s) {
      G.advance(10);
      c.k.sus[o.s.pid].checked = true;
      await UI.say(who, o.s.alibi.truth);
      G.addEvidence(c.id, 'alibi_' + o.s.pid, 'Mazeret kontrolü: ' + POP.get(o.s.pid).name, `${G.place(place).name} çalışanı: “${o.s.alibi.truth}”`);
      continue;
    }
    if (o.fr) { await TALK.askAlibi(o.fr, id, who); continue; }
    return;
  }
};

// ============================================================ Olay yeri
TALK.sceneArrival = async function (sc) {
  const v = POP.get(sc.victim);
  await UI.say(null, `${G.place(sc.place).name}. ${v.name} burada yatıyor. Olay yeri bantlarla çevrili.`);
  await UI.say(G.cast('jade'), sc.kind === 'serial' ? 'Yine o... Her seferinde bir şey bırakıyor. Ceplerine bakmalıyım.' : 'Önce cesede bakalım. Cepler, eller, yaka... Sonra yerdeki parıltılar. Asıl ilginç olanlar saklananlardır. (Q: Gözlem)');
  const s = G.state.story;
  if (s.ch >= 2 && !s.seen.body && sc.kind !== 'serial') { const ags = STORY.agents(); await STORY.interlude('body', { A: STORY.codeOf(ags[0]), B: STORY.codeOf(s.members[ags[0]].boss) }); }
};

TALK.pickClue = async function (sc, cl) {
  sc.found[cl.id] = true;
  SFX.clue();
  G.advance(5);
  await UI.say(null, `${cl.title}: ${cl.text}`);
  G.addEvidence(sc.caseId, 'clue_' + sc.id + '_' + cl.id, cl.title, cl.text);
  if (sc.clues.every((x) => sc.found[x.id])) { UI.toast('Olay yerindeki tüm ipuçlarını buldun!', 'good'); SFX.good(); }
};

TALK.searchBody = async function (sc) {
  const res = await MINI.bodySearch(sc);
  for (const it of res || []) {
    if (it.kind === 'cipher') {
      const i = await UI.choose(G.cast('jade'), 'Kaydırma şifresi... Şimdi çözmeye çalışayım mı?', ['Evet, hemen bakalım.', 'Sonra (Dosya → Deliller).']);
      if (i === 0) await TALK.solveCipher(G.state.cases[sc.caseId]);
    }
    if (it.kind === 'lion' && !G.state.story.codeKnown) await UI.say(G.cast('jade'), '“Lion Lion”... Bir parola gibi. Bunu aklımda tutmalıyım.');
    if (it.kind === 'frame') await UI.say(G.cast('jade'), 'Benim kartım... Biri beni bu cinayete bağlamaya çalışıyor.');
  }
};

TALK.solveCipher = async function (c) {
  if (!c || c.k.cipher) return;
  const ok = await MINI.cipher(c);
  G.advance(20);
  if (ok) {
    c.k.cipher = true;
    const sign = c.cipher.initial ? ` Notu imzalayan kişinin adı ya da soyadı ${c.cipher.initial} harfiyle başlıyor.` : ' Not imzasız.';
    G.addEvidence(c.id, 'cipher_' + c.id, 'Çözülen not', `“${c.cipher.plain}”${sign}`);
    SFX.good();
    await UI.say(G.cast('jade'), c.cipher.initial ? `“-${c.cipher.initial}.” Katil kurbanı buluşmaya çağırmış.` : 'İmza yok ama saat var. Katil kurbanı buluşmaya çağırmış.');
  }
};

TALK.openSafe = async function (sc) {
  const c = G.state.cases[sc.caseId];
  if (c.k.safe) return UI.say(null, 'Kasa açık ve boş. İçindeki defter artık dosyanda.');
  await UI.say(null, 'Duvara gömülü küçük bir kasa. Masada, kasa şifresine dair karalamalar olan bir not var.');
  const ok = await MINI.safe(c);
  G.advance(20);
  if (ok) {
    c.k.safe = true;
    SFX.good();
    await UI.say(null, 'Klik! Kasa açıldı. İçinde kurbanın gizli defteri var. Son sayfada:');
    for (const d of c.safe.doc) await UI.say(null, '“' + d + '”');
    G.addEvidence(c.id, 'safe_' + c.id, 'Kurbanın gizli defteri', c.safe.doc.map((d) => '• ' + d).join(' '));
  }
};

// ============================================================ Mekân eylemleri
TALK.useAct = async function (act, t) {
  const st = G.state;
  if (act === 'car') return TALK.drive();
  if (act === 'couch') return TALK.couch();
  if (act === 'tea') {
    if (st.tea >= 2) return UI.say(G.cast('jade'), 'Bugün yeterince çay içtim. Hayır, aslında asla yeterli değil... ama demlik boş.');
    st.tea++; G.gainFocus(20); G.advance(15); SFX.good();
    return UI.say(null, 'Jade kendine özenle bir fincan bergamot çayı demliyor. (+20 odak)');
  }
  if (act === 'board') {
    const opts = ['Dava dosyasını aç'];
    const frames = st.story.frames.filter((f) => !f.analysis);
    for (const fr of frames) opts.push(`Tuzak delilini analiz et: ${DATA.FRAMES.find((f) => f.id === fr.fdef).title}`);
    const c = G.activeCase();
    if (c && c.feats.cipher && !c.k.cipher && st.evidence.some((e) => e.title === 'Şifreli not' && e.caseId === c.id)) opts.push('Şifreli notu çöz');
    opts.push('Vazgeç');
    const i = await UI.choose(null, 'Delil panosu: kırmızı ipler, fotoğraflar, notlar.', opts);
    if (i === 0) DOSSIER.open('suspects');
    else if (i <= frames.length) await STORY.analyzeFrame(frames[i - 1]);
    else if (opts[i] === 'Şifreli notu çöz') await TALK.solveCipher(c);
    return;
  }
  if (act === 'lionboard') {
    if (!st.story.codeKnown) return UI.say(G.cast('jade'), 'Boş bir pano. Kırmızı ipliği seviyorum; yakında dolar.');
    DOSSIER.open('net');
    return;
  }
  if (act === 'computer') return TALK.grace();
  if (act === 'autopsy') return TALK.ortiz();
  if (act === 'printlab') return TALK.sam();
  if (act === 'cell') return UI.say(null, 'Nezarethane. Demir parmaklıkların ardında soğuk bir bank.');
  if (act === 'shelf') return TALK.shelf(t);
  if (act.startsWith('drop:')) return TALK.dropSpot(act.slice(5));
  if (act === 'secret_ev') return TALK.secretEvidence();
};

TALK.shelf = async function (t) {
  const st = G.state;
  const kind = st.secrets[G.map.id];
  if (!kind || !G.revealed) return UI.say(null, 'Sıradan bir dolap. Kitaplar, kutular, toz.');
  await UI.say(null, 'Dolabın kenarında, yerde yarım daire şeklinde sürtünme izleri var. Jade dolabı itiyor... ve dolap ağır ağır dönüyor!');
  SFX.door();
  st.secretEntry = [t.tx, t.ty + 1];
  const im = WORLD.getMap('secret:' + G.map.id + ':' + kind);
  G.enterMap(im.id, im.door.x, im.h - 2, 1);
};

TALK.secretEvidence = async function () {
  const st = G.state, s = st.story;
  const host = G.map.secretOf;
  const kind = st.secrets[host];
  const owners = POP.people.filter((p) => p.home === host);
  const names = owners.map((p) => p.name).join(', ');
  if (kind === 'wine') return UI.say(null, 'Gizli bir şarap mahzeni. Etiketlerde 1962... Ev sahipleri pahalı koleksiyonlarını saklıyor, hepsi bu.');
  if (kind === 'panic') return UI.say(null, 'Konserve kutuları, battaniyeler, bir radyo. Kıyamete hazırlanan biri. Suç değil, sadece paranoya.');
  if (kind === 'killer') {
    const se = st.serial;
    se.roomFound = true;
    const K = POP.get(se.killer);
    SFX.clue();
    await UI.say(null, 'Duvarda kurbanların fotoğrafları, kırmızı iplerle birbirine bağlanmış. Masada beyaz kâğıtlar, bir daktilo ve yarısı katlanmış turnalar...');
    await UI.say(G.cast('jade'), `Bu ev ${names} adına kayıtlı. ${se.name} burada yaşıyor.`);
    G.addEvidence('serial', 'room_' + host, 'Katilin gizli odası', `${G.place(host).name} (${names}) evindeki gizli odada kurbanların fotoğrafları ve imza nesneleri bulundu. Katil bu evde yaşıyor. Hangisi olduğunu izlerle doğrula: ${K.g === 'f' ? 'kadın' : 'erkek'} biri.`);
    return;
  }
  if (kind === 'net') {
    const mem = owners.filter((p) => s.members[p.id]);
    SFX.clue();
    await UI.say(null, 'Bir masa dolusu kullan-at telefon, deste deste para ve duvarda kırmızı mürekkeple yazılmış iki kelime: LION LION.');
    for (const p of mem) {
      const m = s.members[p.id];
      if (m.rank === 1) {
        s.beaRoom = true; s.lionClue = true;
        const L = POP.get(s.lion);
        await UI.say(null, `Masanın çekmecesinde “Yellow Bea” imzalı yüzlerce emir ve Aslan’dan gelen mektuplar var. Mektuplar ${SEALS[L.job]} ile mühürlenmiş.`);
        G.addEvidence('net', 'bearoom', 'Yellow Bea’nın gizli odası', `${p.name} (${p.job}) evinde: “Yellow Bea” imzalı emirler. Aslan’ın mektupları ${SEALS[L.job]} ile mühürlü. Artık Bea’yı Şef’e kanıtla gösterebilirsin.`);
      } else if (m.rank === 0) {
        await UI.say(null, 'Bu odada her şey kusursuz, düzenli... ve tek bir altın aslan heykelciği.');
        G.addEvidence('net', 'lionroom', 'Aslan’ın odası?', `${p.name} (${p.job}) evinde altın bir aslan heykelciği ve Lion Lion telefonları.`);
      } else {
        await UI.say(null, `Telefonlardan birinde “${m.code}” yazılı bir not var. Bu oda ${p.name} adlı kişiye ait.`);
        G.addEvidence('net', 'room_' + p.id, 'Ağ üyesinin odası: ' + m.code, `${p.name} (${p.job}) evinde Lion Lion telefonları. Kod adı: ${m.code}. Üstü: ${STORY.codeOf(m.boss)}. Şef’e ifşa edebilirsin.`);
      }
    }
    if (!mem.length) await UI.say(null, 'Burası terk edilmiş görünüyor. Sahibi çoktan yakalanmış olmalı.');
  }
};

TALK.dropSpot = async function (spot) {
  const s = G.state.story;
  const d = s.drops.find((x) => x.spot === spot && !x.done);
  if (d) return UI.say(G.cast('jade'), `Ölü nokta burası. Gün ${d.day}, saat 22.00. O saatte burada, gözden uzakta beklemeliyim (21.30–22.30).`);
  return UI.say(null, { booth: 'Eski, kırmızı bir telefon kulübesi. Ahize hâlâ çalışıyor.', crypt: 'Eski bir aile türbesi. Kapının kilidi yeni... tuhaf.', bench: 'Fenerin dibinde, denize bakan yalnız bir bank.' }[spot]);
};

TALK.drive = async function () {
  const st = G.state;
  const groups = [
    ['Karakol & Kamu', ['station', 'lab', 'fbi', 'cityhall', 'bank', 'library', 'school', 'church', 'newspaper']],
    ['Kafe, Bar & Dükkân', ['cafe', 'restaurant', 'bar', 'hotel', 'shop', 'market', 'gallery']],
    ['Kenar & Liman', ['mansion', 'vineyard', 'warehouse', 'park', 'cemetery', 'lighthouse', 'docks']],
    ['Evler (aileler)', null],
  ];
  const active = new Set(Object.values(st.scenes).filter((s) => !s.closed).map((s) => s.place));
  const g = await UI.choose(G.cast('jade'), 'Eski dostum. Nereye? (15 dk)', groups.map((x) => x[0]).concat(['Vazgeç']));
  if (g >= groups.length) return;
  let dest;
  if (groups[g][1]) {
    const ids = groups[g][1];
    const i = await UI.choose(null, 'Hedef:', ids.map((id) => G.place(id).name + (active.has(id) ? ' 🚨' : '')).concat(['Vazgeç']));
    if (i >= ids.length) return;
    dest = ids[i];
  } else {
    const fams = WORLD.houses.map((h) => ({ h, fam: POP.people.filter((p) => p.home === h.id) })).filter((x) => x.fam.length);
    const pri = fams.filter((x) => active.has(x.h.id) || x.fam.some((p) => G.know(p.id).met));
    const list = (pri.length ? pri : fams).slice(0, 14);
    const i = await UI.choose(null, 'Hangi ev? (tanıdıkların ve olay yerleri)', list.map((x) => `${x.fam[0].last} ailesi — ${G.place(x.h.id).name}${active.has(x.h.id) ? ' 🚨' : ''}`).concat(['Vazgeç']));
    if (i >= list.length) return;
    dest = list[i].h.id;
  }
  G.advance(15);
  const tm = WORLD.maps.town;
  const b = WORLD.building(dest);
  if (b) return G.enterMap('town', b.door.x, b.door.y + 1, 1);
  const zone = { park: tm.spots.parkCenter, cemetery: tm.spots.crypt, lighthouse: tm.spots.bench, docks: [85, 81] }[dest];
  G.enterMap('town', zone[0], zone[1], 0);
};

TALK.couch = async function () {
  const st = G.state;
  const night = st.time >= 20 * 60;
  const opts = [];
  if (night) opts.push('Uyu (günü bitir)');
  opts.push('Kısa bir şekerleme (2 saat, +40 odak)');
  opts.push('Vazgeç');
  const i = await UI.choose(null, night ? 'Jade’in emektar deri kanepesi. Gece oldu.' : 'Jade’in emektar deri kanepesi.', opts);
  if (opts[i].startsWith('Uyu')) { G.lastSleepAt = st.time; return G.newDay(false); }
  if (opts[i].startsWith('Kısa')) {
    G.fade = 1; G.advance(120); G.gainFocus(40); SFX.good();
    return UI.say(null, 'Jade gözlerini kapatıyor... ve iki saat sonra, zihni berrak, uyanıyor. (+40 odak)');
  }
};

// ============================================================ Suçlamalar
TALK.accuseStandard = async function (c) {
  const st = G.state;
  const who = G.cast('boss');
  const res = await MINI.accuse(c);
  if (!res) return UI.say(who, 'Emin olduğunda gel. Yanlış kişiyi suçlarsak başımız yanar.');
  G.advance(30);
  const C = POP.get(c.culprit);
  const acc = POP.get(res.suspect);
  const jade = G.cast('jade');
  if (acc !== C) {
    c.wrong += 1;
    st.rep = Math.max(0, st.rep - 1);
    SFX.bad();
    await UI.say(jade, `Katil... ${acc.name}!`);
    await UI.say(G.pwho(acc), 'Ne?! Avukatımı istiyorum. Hemen!');
    if (c.wrong >= 2) {
      st.failed += 1; st.rep = Math.max(0, st.rep - 2);
      st.history.push({ num: c.num, title: c.title, stars: 0, result: 'Başarısız', culprit: C.name, day: st.day });
      c.status = 'closed'; G.closeScene(c.sceneId);
      await UI.say(who, `${acc.name} da masum çıktı. Bu davadan alındın, Jade. (İtibar −3) Gerçek katil ${C.name} idi.`);
      return;
    }
    await UI.say(who, `${acc.name} masum çıktı; deliller tutmuyor. Bir hakkın daha var. (İtibar −1)`);
    return;
  }
  const s = c.suspects.find((x) => x.pid === C.id);
  const methodOk = res.method === c.method, motiveOk = res.motive === s.motive;
  const stars = 1 + (methodOk ? 1 : 0) + (motiveOk ? 1 : 0);
  await UI.say(jade, 'Hepiniz bir yalan söylediniz. Ama yalnızca biriniz cinayet işledi.');
  for (const line of TALK.explain(c)) await UI.say(jade, line);
  await UI.say(jade, `Bunların hepsine uyan tek kişi: ${C.name}.`);
  await UI.say(G.pwho(C), CONFESS[s.motive]);
  SFX.good();
  const pay = 40 + stars * 40 - c.wrong * 20;
  const repGain = stars * 2;
  st.money += pay; st.rep += repGain; st.solved += 1;
  st.maxFocus = Math.min(180, st.maxFocus + 5);
  st.history.push({ num: c.num, title: c.title, stars, result: 'Çözüldü', culprit: C.name, day: st.day });
  c.status = 'closed';
  G.jail(C.id);
  G.closeScene(c.sceneId);
  const notes = [];
  if (!methodOk) notes.push(`yöntem aslında “${DATA.METHODS[c.method].label}”`);
  if (!motiveOk) notes.push(`motif aslında “${DATA.MOTIVES[s.motive].label}”`);
  await UI.say(who, `Harika iş, Jade. ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}${notes.length ? ' (Ama ' + notes.join(', ') + '.)' : ''} Prim: $${pay}, itibar +${repGain}, maksimum odak +5.`);
  await STORY.onCaseSolved(c);
  await MINI.rankCheck();
};

TALK.explain = function (c) {
  const out = [];
  const label = { shoe: 'ayak izi', smoke: 'izmarit', hair: 'saç teli', scent: 'koku', hand: 'darbe açısı', vehicle: 'tanığın gördüğü araç' };
  for (const key of c.sceneAttrs) {
    const v = c.culpritVals[key];
    const fit = c.suspects.filter((s) => POP.get(s.pid).attrs[key] === v).map((s) => POP.get(s.pid).first);
    const vtxt = key === 'hand' ? (v === 'sol' ? 'solak bir saldırgan' : 'sağ elini kullanan bir saldırgan') : DATA.ATTRS[key].fmt(v);
    out.push(`Olay yerindeki ${label[key]}: ${vtxt}. Bu yalnızca ${fit.join(', ')} için geçerli.`);
  }
  const C = c.suspects.find((s) => s.role === 'C');
  if (C.alibi.place) out.push(`Üstelik ${POP.get(C.pid).first}, mazeret verdiği yerden ölüm saatinden hemen önce ayrılmıştı.`);
  return out;
};

TALK.accuseSerial = async function () {
  const st = G.state, se = st.serial;
  const who = G.cast('boss');
  const pid = await MINI.personPicker(`${se.name} kim?`, 'Kasabadaki herkes arasından seç. Kurbanların olay yerlerindeki izleri ve tanıkların gördüklerini karşılaştır.');
  if (!pid) return;
  G.advance(30);
  const p = POP.get(pid);
  if (pid !== se.killer) {
    se.wrong += 1;
    st.rep = Math.max(0, st.rep - 3);
    se.nextKill = Math.min(se.nextKill == null ? st.day : se.nextKill, st.day);
    SFX.bad();
    await UI.say(who, `${p.name} masum çıktı. Ve basın bunu duydu. Gerçek katil cesaretlendi; bu gece yine öldürebilir. (İtibar −3)`);
    return;
  }
  se.status = 'caught';
  G.jail(pid);
  for (const id of se.scenes) G.closeScene(id);
  const bonus = se.roomFound ? 150 : 50;
  st.money += 200 + bonus; st.rep += 12; st.solved += 1;
  st.maxFocus = Math.min(180, st.maxFocus + 10);
  st.history.push({ num: 'SK', title: se.name, stars: se.roomFound ? 3 : 2, result: `Yakalandı (${se.kills} kurban)`, culprit: p.name, day: st.day });
  SFX.good();
  await UI.say(G.cast('jade'), `${p.first}. Kâğıtları katlarken parmakların hiç titremiyordu, değil mi? Ama her ölüm sana biraz daha benziyordu.`);
  await UI.say(G.pwho(p), 'Beni buldun. Saymayı biliyormuşsun, Jade.');
  await UI.say(who, `${se.name} yakalandı! ${se.roomFound ? 'Gizli odadaki delillerle dava sağlam.' : 'Gizli odasını bulsaydın dava daha da sağlam olurdu.'} Prim: $${200 + bonus}, itibar +12.`);
  await MINI.rankCheck();
};

TALK.accuseNet = async function () {
  const pid = await MINI.personPicker('Lion Lion ağının üyesi kim?', 'Ağın bir üyesini seç. Ölü noktada gördüklerini, “Lion Lion” tepkilerini ve gizli odaları düşün. Yanlış kişiyi suçlamak ağı tetikte tutar.');
  if (!pid) return;
  G.advance(30);
  await STORY.exposeMember(pid);
  await MINI.rankCheck();
};

TALK.accuseBea = async function () {
  const pid = await MINI.personPicker('Yellow Bea kim?', 'Bea yüksek mevkide biri. İzleri (Lion Lion sekmesi) adaylarla karşılaştır. Delilin yoksa Şef bile seni koruyamaz.', POP.beaCandidates.map((p) => p.id));
  if (!pid) return;
  G.advance(30);
  await STORY.accuseBea(pid);
};

// ============================================================ Görevler
TALK.tasks = function () {
  const st = G.state, s = st.story;
  const L = [];
  for (const fr of s.frames) {
    if (fr.alibi || fr.analysis || fr.agentFound) continue;
    const v = POP.get(st.scenes[fr.sceneId].victim);
    L.push({ t: `Tuzaktan kurtul (${v.first}): o saatte seni gören birini bul ya da sahte delili analiz et`, done: false, where: 'Herkes / Delil panosu', urgent: true, hint: 'Seni gören biri yoksa karakoldaki delil panosunda sahte delili incele.' });
  }
  const c = G.curCase();
  if (c && c.status === 'pending') L.push({ t: 'Şef Lena ile konuş: yeni bir dava var', done: false, where: 'Karakol' });
  if (c && c.status === 'active') {
    const sc = st.scenes[c.sceneId];
    const total = sc.clues.length, found = sc.clues.filter((cl) => sc.found[cl.id]).length;
    const searched = Object.keys(sc.searched).length;
    L.push({ t: `Olay yerini incele (${found}/${total} ipucu)`, done: found === total, where: G.place(sc.place).short, hint: sc.clues.some((x) => x.hidden && !sc.found[x.id]) ? 'Bazı ipuçları yalnızca Gözlem (Q) ile görünür.' : null });
    L.push({ t: 'Cesedin ceplerini ara', done: searched >= 3, where: G.place(sc.place).short, hint: 'Astar ya da yaka gibi yerlerde saklı eşyalar olabilir.' });
    L.push({ t: `Tanıkla konuş: ${POP.get(c.witness.pid).name}`, done: !!c.k.witness, where: G.place(sc.place).short + ' önü' });
    L.push({ t: 'Otopsi bulgularını Dr. Ortiz ile yorumla', done: sc.autopsy, where: 'Adli Tıp' });
    for (const s0 of c.suspects) {
      const ks = c.k.sus[s0.pid];
      const p = POP.get(s0.pid);
      L.push({ t: `${p.name}: sorgula ve oku`, done: ks.motive && ks.alibi && ks.read, where: POP.placeName(POP.where(p, st.day, st.time)) });
    }
    L.push({ t: 'Şüphelilerin geçmişini Grace’e tarat', done: c.suspects.every((x) => G.know(x.pid).bg), where: 'Karakol' });
    const ver = c.suspects.filter((x) => x.alibi.place);
    L.push({ t: 'Mazeretleri tanıklara doğrulat', done: ver.every((x) => c.k.sus[x.pid].checked), where: 'Kafe / Otel / Bar' });
    if (c.feats.print && sc.found.print) L.push({ t: 'Kısmi parmak izini Sam ile karşılaştır', done: c.k.print, where: 'Adli Tıp' });
    if (c.feats.cipher && st.evidence.some((e) => e.title === 'Şifreli not' && e.caseId === c.id)) L.push({ t: 'Şifreli notu çöz', done: c.k.cipher, where: 'Delil panosu / Dosya' });
    if (c.feats.safe && sc.visited) L.push({ t: 'Kurbanın kasasını aç', done: c.k.safe, where: G.place(sc.place).short });
    L.push({ t: 'Katili Şef Lena’ya bildir', done: false, where: 'Karakol' });
  }
  for (const d of s.drops) if (!d.done) L.push({ t: `Ölü noktayı gözetle: ${d.label}`, done: false, where: `Gün ${d.day}, 21.30–22.30`, hint: 'Gizlenip bekle; gelen kişiyi Gözlem ile incele.' });
  if (st.serial && st.serial.status === 'active' && st.serial.kills) {
    for (const id of st.serial.scenes) {
      const sc = st.scenes[id];
      if (sc.closed) continue;
      const left = sc.clues.filter((x) => !sc.found[x.id]).length + sc.witnesses.filter((w) => !w.heard).length + (sc.autopsy ? 0 : 1);
      if (left) L.push({ t: `${st.serial.name}: ${POP.get(sc.victim).first} olay yeri (${left} iş kaldı)`, done: false, where: G.place(sc.place).short, hint: 'Tanıklar olay yerinin önünde bekliyor olabilir.' });
    }
  }
  if (s.ch === 4 && s.finalDay > 0) L.push({ t: 'Aslan ile buluş: deniz feneri', done: false, where: `Gün ${s.finalDay}, 23.30–00.30` });
  if (!L.length) L.push({ t: 'Kanepede uyu; yarın yeni dava gelecek', done: false, where: 'Karakol' });
  return L;
};

TALK.nextTask = function () {
  if (!G.state) return null;
  const L = TALK.tasks();
  return L.find((t) => !t.done && t.urgent) || L.find((t) => !t.done);
};
