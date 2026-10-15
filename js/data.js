'use strict';
// Oyunun tüm metin ve içerik verisi. Dava üreticisi buradaki havuzlardan seçim yapar.

const DATA = {};

DATA.TOWN = 'Sunset Koyu';
DATA.DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

// --- Mekânlar -------------------------------------------------------------
DATA.PLACES = {
  station: { name: 'SSB Karakolu', short: 'Karakol' },
  lab: { name: 'Adli Tıp Merkezi', short: 'Adli Tıp' },
  cafe: { name: 'Altın Fincan Kafe', short: 'Kafe' },
  hotel: { name: 'Grand Palmiye Oteli', short: 'Otel' },
  bar: { name: 'Kırmızı Kayık Bar', short: 'Bar' },
  gallery: { name: 'Lumière Sanat Galerisi', short: 'Galeri' },
  mansion: { name: 'Tepe Malikânesi', short: 'Malikâne' },
  vineyard: { name: 'Rossi Bağ Evi', short: 'Bağ Evi' },
  warehouse: { name: 'Liman Deposu', short: 'Depo' },
  house1: { name: 'Mavi Ev', short: 'Mavi Ev' },
  house2: { name: 'Sarı Ev', short: 'Sarı Ev' },
};

DATA.SCENE_PLACES = ['mansion', 'warehouse', 'gallery', 'vineyard', 'hotel', 'bar'];
DATA.HANGOUTS = ['mansion', 'warehouse', 'gallery', 'vineyard', 'hotel', 'bar', 'house1', 'house2', 'cafe'];
DATA.ALIBI_PLACES = ['cafe', 'hotel', 'bar'];

DATA.ALIBI_CLAIM = {
  cafe: 'Altın Fincan Kafe’deydim',
  hotel: 'Grand Palmiye Oteli’nin lobisindeydim',
  bar: 'Kırmızı Kayık Bar’daydım',
};

DATA.SCENE_INFO = {
  mansion: {
    victimJobs: ['emekli emlak kralı', 'zengin bir antika koleksiyoncusu'],
    finder: 'evin temizlikçisi',
    titles: ['Malikânedeki Sessizlik', 'Tepedeki Son Akşam Yemeği', 'Şamdanın Gölgesi'],
    weapon: 'bronz şamdan',
    trace: {
      clue: ['Kedi tüyleri', 'Kurbanın beyaz Ankara kedisi her yere uzun, beyaz tüyler bırakmış.'],
      obs: 'Pantolonunun paçasında uzun, beyaz kedi tüyleri var.',
      right: 'Malikânedeki beyaz Ankara kedisinin yanında bulunmuş',
      wrong: ['Evde siyah bir köpek besliyor', 'Yün kazak örmeyi seviyor'],
    },
  },
  warehouse: {
    victimJobs: ['liman işletmecisi', 'ithalat şirketi sahibi'],
    finder: 'gece bekçisi',
    titles: ['Limandaki Gölge', 'Son Konteyner', 'Sisli Rıhtım'],
    weapon: 'demir levye',
    trace: {
      clue: ['Makine yağı', 'Forkliftin yanında taze, siyah bir makine yağı birikintisi var.'],
      obs: 'Gömleğinin kolunda taze, siyah bir makine yağı lekesi var.',
      right: 'Liman deposunda, forkliftin yanında bulunmuş',
      wrong: ['Bu sabah arabasının yağını değiştirmiş', 'Bisiklet zinciri onarmış'],
    },
  },
  gallery: {
    victimJobs: ['galeri sahibi', 'ünlü bir ressam'],
    finder: 'galeri asistanı',
    titles: ['Son Tablo', 'Kızıl Fırça Darbesi', 'Sergi Gecesi'],
    weapon: 'mermer büst',
    trace: {
      clue: ['Islak boya', 'Kurbanın son tablosu hâlâ ıslak: koyu bordo yağlı boya.'],
      obs: 'Tırnağının kenarında koyu bordo, taze yağlı boya izi var.',
      right: 'Galerideki ıslak tabloya dokunmuş',
      wrong: ['Evinin duvarlarını boyuyor', 'Oje sürerken eli kaymış'],
    },
  },
  vineyard: {
    victimJobs: ['şarap üreticisi', 'bağ sahibi'],
    finder: 'bağ işçisi',
    titles: ['Acı Şarap', 'Hasat Gecesi', 'Mahzendeki Sır'],
    weapon: 'ağır bir şarap şişesi',
    trace: {
      clue: ['Kırmızı kil', 'Bağ evinin kapısının önü, ayakkabılara yapışan kırmızı kille kaplı.'],
      obs: 'Ayakkabısının kenarında kurumuş, kırmızı kil var.',
      right: 'Bağ evinin önündeki kırmızı kile basmış',
      wrong: ['Çömlek kursuna gidiyor', 'Şantiyede çalışıyor'],
    },
  },
  hotel: {
    victimJobs: ['misafir iş insanı', 'ünlü bir polisiye yazarı'],
    finder: 'kat görevlisi',
    titles: ['Oda 214', 'Rahatsız Etmeyiniz', 'Son Check-out'],
    weapon: 'kristal kül tablası',
    trace: {
      clue: ['Kırmızı-altın kart', 'Otelin oda kartları kırmızı-altın renkli; kurbanın odası 214.'],
      obs: 'Ceket cebinden kırmızı-altın renkli bir kartın ucu görünüyor.',
      right: 'Grand Palmiye Oteli’nde bir odaya girmiş',
      wrong: ['Kumarhaneden fiş toplamış', 'Kartvizit koleksiyonu yapıyor'],
    },
  },
  bar: {
    victimJobs: ['bar sahibi', 'yerel caz şarkıcısı'],
    finder: 'barmen yardımcısı',
    titles: ['Son Kadeh', 'Kayıp Nota', 'Kapanış Saati'],
    weapon: 'beyzbol sopası',
    trace: {
      clue: ['Giriş damgası', 'Bar girişinde müşterilerin eline kırmızı kayık damgası basılıyor.'],
      obs: 'Elinin üstünde silinmeye çalışılmış, soluk bir kırmızı kayık damgası var.',
      right: 'Kırmızı Kayık Bar’a girmiş',
      wrong: ['Çocuğuyla resim yapmış', 'Dövme yaptırmayı düşünüyor'],
    },
  },
};

// --- Ölüm yöntemleri ----------------------------------------------------------
DATA.METHODS = {
  kunt: {
    label: 'Künt cisimle darbe',
    findings: 'Kafatasının yan tarafında çökme kırığı var. Yara kenarları düzensiz; ağır ve sert bir nesne.',
    hand: true,
    handText: (left) => `Darbe kurbanın ${left ? 'sağ' : 'sol'} şakağına, karşıdan gelmiş: saldırgan büyük ihtimalle ${left ? 'SOLAK' : 'SAĞ ELİNİ kullanan biri'}.`,
  },
  bicak: {
    label: 'Bıçaklanma',
    findings: 'Göğüste tek, derin, kesici-delici bir yara. Yara kanalı yaklaşık 15 cm.',
    hand: true,
    weapon: 'mutfak bıçağı',
    handText: (left) => `Yara kanalı ${left ? 'soldan sağa' : 'sağdan sola'} ilerliyor: saldırgan büyük ihtimalle ${left ? 'SOLAK' : 'SAĞ ELİNİ kullanan biri'}.`,
  },
  bogma: {
    label: 'Boğularak öldürme',
    findings: 'Boyunda yatay, şerit şeklinde morluk; gözlerde nokta kanamalar (peteşi).',
    hand: true,
    weapon: 'ipek bir eşarp',
    handText: (left) => `Düğüm boynun ${left ? 'sol' : 'sağ'} tarafında atılmış: saldırgan büyük ihtimalle ${left ? 'SOLAK' : 'SAĞ ELİNİ kullanan biri'}.`,
  },
  zehir: {
    label: 'Siyanür zehirlenmesi',
    findings: 'Dudaklarda ve tırnak diplerinde morarma, ağızda acı badem kokusu. Mide içeriğinde şarap.',
    hand: false,
    weapon: 'kurbanın kadehine konan siyanür',
  },
  itme: {
    label: 'İtilerek düşürülme',
    findings: 'Yüksekten düşmeyle uyumlu çoklu kırıklar; ama her iki üst kolda parmak şeklinde taze morluklar.',
    hand: false,
    weapon: 'merdivenden itilme',
  },
};
DATA.METHOD_KEYS = Object.keys(DATA.METHODS);

// --- Motifler -------------------------------------------------------------------
DATA.MOTIVES = {
  miras: {
    label: 'Miras',
    rel: ['yeğeni', 'kardeşi', 'üvey çocuğu'],
    say: 'Ailemdi, tabii ki üzgünüm. Vasiyette adım geçiyor mu? Bilmiyorum... Yani, pek bilmiyorum.',
    gossip: (s) => `${s} mi? Mirası bekleyip duruyordu, kasabada herkes bilir.`,
    doc: (s) => `${s} sürekli para istiyor. Vasiyeti değiştireceğim, hiçbir şey alamayacak.`,
  },
  kiskanclik: {
    label: 'Kıskançlık',
    rel: ['eski sevgilisi', 'eşi', 'nişanlısı'],
    say: 'Aramız... karışıktı. Onu başkasıyla görmek canımı yaktı, kabul ediyorum. Ama kim yanmaz ki?',
    gossip: (s) => `${s} geçen hafta ona bağırıyordu. Kıskançlıktan gözü dönmüştü.`,
    doc: (s) => `${s} beni takip ediyor. Artık gerçekten korkmaya başladım.`,
  },
  borc: {
    label: 'Borç / Para',
    rel: ['iş ortağı', 'eski dostu', 'kiracısı'],
    say: 'Ona borcum vardı, tamam. Ödeyecektim! Sadece biraz daha zamana ihtiyacım vardı.',
    gossip: (s) => `${s} ona yüklü bir borç takmıştı. Mahkemelik olacaklardı.`,
    doc: (s) => `${s} hâlâ ödemedi: 80.000$. Pazartesi avukatımı arayacağım.`,
  },
  santaj: {
    label: 'Şantaj',
    rel: ['asistanı', 'muhasebecisi', 'komşusu'],
    say: 'Benimle ilgili... bazı şeyler biliyordu. Ama bu beni katil yapmaz, değil mi?',
    gossip: (s) => `Kurban, ${s} hakkında bir sır bildiğini ima edip dururdu.`,
    doc: (s) => `Sır bende: ${s}. Her ay 5.000$ ödemeye devam edecek, başka yolu yok.`,
  },
  intikam: {
    label: 'İntikam',
    rel: ['eski çalışanı', 'eski ortağı', 'eski bahçıvanı'],
    say: 'Yıllar önce beni kapı dışarı etti. Affettim mi? Diyelim ki... çalışıyorum.',
    gossip: (s) => `${s} kovulduğu günden beri kin besliyordu.`,
    doc: (s) => `${s} yine tehdit mektubu yolladı. Geçmişi bir türlü geride bırakmıyor.`,
  },
  rekabet: {
    label: 'İş rekabeti',
    rel: ['iş rakibi', 'meslektaşı'],
    say: 'İş dünyasında rakiptik. Kazanan kazanır; kişisel bir şey değildi.',
    gossip: (s) => `${s} geçen ay büyük bir ihaleyi kurbana kaptırdı. Hâlâ hazmedemedi.`,
    doc: (s) => `${s} işimi baltalamaya çalışıyor. Bunu ona ödeteceğim.`,
  },
};
DATA.MOTIVE_KEYS = Object.keys(DATA.MOTIVES);

// --- Fiziksel özellikler (olay yeri ile şüpheliler eşleştirilir) -----------------
DATA.ATTRS = {
  shoe: { label: 'Ayakkabı', values: [37, 38, 39, 40, 41, 42, 43, 44, 45], fmt: (v) => v + ' numara' },
  hand: { label: 'El', values: ['sağ', 'sol'], fmt: (v) => (v === 'sol' ? 'Solak' : 'Sağ elini kullanıyor') },
  smoke: { label: 'Sigara', values: ['Marlin Mentol', 'Kırmızı Kral', 'Altın Yaprak purosu'], none: 'içmiyor', fmt: (v) => v },
  hair: { label: 'Saç', values: ['sarı', 'siyah', 'kızıl', 'kahverengi', 'kır'], fmt: (v) => v },
  scent: { label: 'Koku', values: ['lavanta', 'sandal ağacı', 'vanilya', 'okaliptüs'], none: 'belirgin koku yok', fmt: (v) => v },
  vehicle: { label: 'Araç', values: ['kırmızı pikap', 'siyah sedan', 'beyaz minibüs', 'yeşil motosiklet', 'mavi üstü açık araba'], fmt: (v) => v },
};
DATA.ATTR_KEYS = Object.keys(DATA.ATTRS);

DATA.HAIR_COLORS = {
  'sarı': '#e8c35a',
  'siyah': '#2b2430',
  'kızıl': '#c4532c',
  'kahverengi': '#6e4627',
  'kır': '#bdb8b0',
};

// --- İsimler ---------------------------------------------------------------------
DATA.NAMES_M = ['Victor', 'Elliot', 'Marcus', 'Owen', 'Felix', 'Dorian', 'Hugo', 'Leon', 'Silas', 'Theo', 'Gabriel', 'Arthur', 'Nolan', 'Simon', 'Adrian', 'Caleb', 'Rafael', 'Ivan'];
DATA.NAMES_F = ['Clara', 'Vivian', 'Nora', 'Iris', 'Celeste', 'Margot', 'Elena', 'Lydia', 'Hazel', 'Rosa', 'Audrey', 'Stella', 'Ruby', 'Ivy', 'Fiona', 'Daphne', 'Greta', 'Olive'];
DATA.SURNAMES = ['Whitmore', 'Blackwood', 'Hale', 'Sterling', 'Crane', 'Ashford', 'Lowell', 'Mercer', 'Thorne', 'Vance', 'Holloway', 'Prescott', 'Kincaid', 'Redford', 'Fairfax', 'Rossi', 'Moreau', 'Delaney', 'Quinn', 'Harlow'];

// --- Soğuk okuma (Jade'in gözlemleri) — masum şüpheliler için ----------------------
DATA.COLD_READS = [
  {
    obs: 'Sol yüzük parmağında soluk bir iz var; yüzüğünü yakın zamanda çıkarmış.',
    right: 'Evliliği bitmek üzere',
    wrong: ['Yüzüğünü temizliğe vermiş', 'Hiç evlenmemiş'],
    secret: '...Tamam. Boşanıyoruz. Kimse bilmiyor. Bunun cinayetle hiçbir ilgisi yok.',
    alt: 'O gece erkenden çıkıp avukatımın ofisine gittim; boşanma evraklarını gece yarısına kadar imzaladık. Avukatım doğrular.',
  },
  {
    obs: 'Sağ orta parmağında mürekkep lekesi ve kalem nasırı var; çantasından bir defter görünüyor.',
    right: 'Gizlice bir kitap yazıyor',
    wrong: ['Ressam', 'Mektup arkadaşı arıyor'],
    secret: 'Bir roman yazıyorum. İçindeki herkes... gerçek kişiler. Lütfen kimseye söylemeyin.',
    alt: 'O gece erkenden çıkıp kütüphane arşivine gittim, yazmak için. Gece bekçisi anahtarı bana verdi, doğrular.',
  },
  {
    obs: 'Gözlerinin altı mor, üstünden kahve kokusu geliyor ve saatine üç kez baktı.',
    right: 'Günlerdir uyumuyor; bir yere yetişmeye çalışıyor',
    wrong: ['Saat koleksiyoncusu', 'Sadece sıkıldı'],
    secret: 'Annem hastanede. Geceleri yanında kalıyorum. Burada olmam bile zor.',
    alt: 'O gece erkenden çıkıp hastaneye, annemin yanına gittim. Nöbetçi hemşireler doğrular.',
  },
  {
    obs: 'Ceketi pahalı, ama ayakkabılarının tabanı aşınmış ve yamalı.',
    right: 'Görüntüyü koruyor ama parası bitmiş',
    wrong: ['Çok yürüyüş yapıyor', 'Eski ayakkabılarına bağlı'],
    secret: 'İflasın eşiğindeyim. Kimse bilmesin istedim... gurur meselesi.',
    alt: 'O gece erkenden çıkıp tefeciyle buluştum, iskelede. Kameralar beni çekmiştir, utanç verici ama gerçek.',
  },
  {
    obs: 'Telefonunu ekranı aşağı bakacak şekilde tutuyor ve her titreşimde irkiliyor.',
    right: 'Gizli bir ilişkisi var',
    wrong: ['Telefonu bozuk', 'Önemli bir iş teklifi bekliyor'],
    secret: 'Evet... biriyle görüşüyorum. Ailem bilmiyor. Ama bunun cinayetle ilgisi yok!',
    alt: 'O gece erkenden çıkıp onunla buluştum. Sabaha kadar birlikteydik; o da doğrular, yeter ki ailem duymasın.',
  },
  {
    obs: 'Bileğinde hastane bilekliğinin bıraktığı ince, pembe bir iz var.',
    right: 'Yakın zamanda hastaneden çıkmış',
    wrong: ['Bir festivale gitmiş', 'Saatini yeni çıkarmış'],
    secret: 'Geçen hafta küçük bir ameliyat oldum. Kimseye söylemedim; acınmaktan nefret ederim.',
    alt: 'O gece erkenden çıkıp acile gittim, dikişlerim kanadı. Hastane kayıtlarında var.',
  },
  {
    obs: 'Parmak uçlarında sertleşmiş nasırlar var ve ritim tutar gibi masaya vuruyor.',
    right: 'Gizlice müzik yapıyor',
    wrong: ['Kaya tırmanışı yapıyor', 'Sinirleri bozuk, o kadar'],
    secret: 'Geceleri kulüplerde gitar çalıyorum. Ailem “gerçek bir iş” bulmamı istiyor.',
    alt: 'O gece erkenden çıkıp rıhtımdaki kulüpte sahneye çıktım. Elli kişi gördü beni.',
  },
  {
    obs: 'Yakasında havaalanı güvenlik bandının yapışkan izi, cebinde katlanmış bir biniş kartı var.',
    right: 'Kasabadan kaçmayı planlıyor',
    wrong: ['Pilot', 'Seyahat acentesinde çalışıyor'],
    secret: 'Yarın gidiyordum. Yeni bir hayat... Cinayetten önce aldım biletimi, bakın tarihe!',
    alt: 'O gece erkenden çıkıp havaalanındaki bilet gişesine gittim. Kamera kayıtları var.',
  },
];

// --- Olay yerinde rastgele çıkan ek ipuçları -------------------------------------
DATA.FLAVOR_CLUES = [
  { id: 'phone', title: 'Kurbanın telefonu', text: (h) => `Son arama saat ${U.hm(h - 0.75)} sularında gizli bir numaradan gelmiş. Konuşma 2 dakika sürmüş.` },
  { id: 'vase', title: 'Devrilmiş vazo', text: () => 'Yerde kırık bir vazo ve dağılmış çiçekler. Burada bir boğuşma olmuş.' },
  { id: 'wallet', title: 'Kurbanın cüzdanı', text: () => 'Cüzdan yerinde, içinde 400$ duruyor. Bu bir soygun değil; kişisel.' },
  { id: 'glasses', title: 'İki kadeh', text: () => 'Masada iki kadeh var; kurban birini bekliyormuş. Tanıdığı biri.' },
  { id: 'watch', title: 'Kırık saat', text: (h) => `Kurbanın kol saati ${U.hm(h + 2.2)} gösterirken durmuş. Fazla mı “tesadüf”? Biri saati ileri alıp kırmış olabilir.` },
];

// --- Karakterler -----------------------------------------------------------------
DATA.CAST = {
  jade: { name: 'Jade', spec: { skin: '#f2c9a0', hair: '#e3b84f', hairStyle: 'curly', top: '#f4f1ea', vest: '#5d6270', jacket: '#6c7180', bottom: '#5d6270', shoes: '#5a3a22' } },
  boss: { name: 'Şef Lena Marsh', spec: { skin: '#eebf98', hair: '#5b3a24', hairStyle: 'long', top: '#3d4a6b', jacket: '#262b38', bottom: '#262b38', shoes: '#1d1d22', female: true } },
  grace: { name: 'Ajan Grace Holt', spec: { skin: '#f3d0b0', hair: '#c4532c', hairStyle: 'long', top: '#7a9a6b', bottom: '#3b3f4a', shoes: '#2d2a2a', female: true } },
  kevin: { name: 'Ajan Kevin Park', spec: { skin: '#e3b98f', hair: '#1f1b20', hairStyle: 'short', top: '#d9dde3', jacket: '#2b2f38', bottom: '#2b2f38', shoes: '#1a1a1a' } },
  ray: { name: 'Ajan Ray Briggs', spec: { skin: '#f0c49e', hair: '#7a5230', hairStyle: 'short', top: '#9fb3c8', bottom: '#4b4f5a', shoes: '#3a2a20' } },
  ortiz: { name: 'Dr. Ortiz', spec: { skin: '#c99872', hair: '#2b2430', hairStyle: 'bun', top: '#eef2f3', jacket: '#eef2f3', bottom: '#4a6a7a', shoes: '#ddd', glasses: true, female: true } },
  sam: { name: 'Teknisyen Sam', spec: { skin: '#8d5b3e', hair: '#1f1b20', hairStyle: 'short', top: '#6aa6a0', jacket: '#eef2f3', bottom: '#3b3f4a', shoes: '#2d2a2a', glasses: true } },
  mia: { name: 'Mia (Barista)', spec: { skin: '#f2c9a0', hair: '#6e4627', hairStyle: 'ponytail', top: '#c96f4a', apron: '#4b3626', bottom: '#3b3f4a', shoes: '#2d2a2a', female: true } },
  hector: { name: 'Hector (Resepsiyon)', spec: { skin: '#c99872', hair: '#2b2430', hairStyle: 'slick', top: '#f4f1ea', jacket: '#7a1f2b', bottom: '#2b2430', shoes: '#1a1a1a', beard: '#2b2430' } },
  lou: { name: 'Lou (Barmen)', spec: { skin: '#e8b48a', hair: '#bdb8b0', hairStyle: 'bald', top: '#2f4f4f', bottom: '#2b2430', shoes: '#1a1a1a', beard: '#bdb8b0' } },
  cop: { name: 'Memur Diaz', spec: { skin: '#d9a77c', hair: '#2b2430', hairStyle: 'short', top: '#2c3e66', bottom: '#2c3e66', shoes: '#111', cap: '#1f2d4d' } },
};

DATA.WALKERS = [
  { name: 'Bayan Pemberton', spec: { skin: '#f2d4b8', hair: '#d8d4cc', hairStyle: 'bun', top: '#b36b8a', bottom: '#5b3f6b', shoes: '#3a2a20', female: true, dress: true },
    lines: ['Gençler artık kapılarını kilitlemiyor. Ben hep kilitlerim, Bay Jade!', 'Geçen hafta kedim kayboldu; malikânedeki beyaz kedi bizimkini kıskanıyor bence.'] },
  { name: 'Tommy (Postacı)', spec: { skin: '#e3b98f', hair: '#6e4627', hairStyle: 'short', top: '#4a74a8', bottom: '#2c3e66', shoes: '#2d2a2a', cap: '#2c3e66' },
    lines: ['Kasabada herkesin sırrı var; mektuplardan anlarsın.', 'Kafe kapanışa kadar açık. Mia çayı tam senin sevdiğin gibi demliyor.'] },
  { name: 'Balıkçı Ned', spec: { skin: '#d9a77c', hair: '#bdb8b0', hairStyle: 'short', top: '#8a6b3d', bottom: '#4b4f5a', shoes: '#3a2a20', beard: '#bdb8b0' },
    lines: ['Rıhtımda gece sis olur; ama gözüm iyi görür.', 'İnsanların yüzü yalan söyler, ellerine bak derdi babam.'] },
];

DATA.JADE_QUIPS = [
  'İnsanlar yalan söyler. Ama vücutları genelde dürüsttür.',
  'Medyum değilim. Sadece dikkat ediyorum.',
  'Bir fincan çay her şeyi düzeltir. Neredeyse her şeyi.',
  'Katiller hep bir hata yapar. Mesele, hatayı görecek kadar sabırlı olmak.',
];

DATA.RANKS = [
  { rep: 0, name: 'Çaylak Danışman' },
  { rep: 6, name: 'Meraklı Gözlemci' },
  { rep: 15, name: 'Akıl Okuyucu' },
  { rep: 28, name: 'Usta Mentalist' },
  { rep: 45, name: 'Efsanevi Aldatıcı' },
];
