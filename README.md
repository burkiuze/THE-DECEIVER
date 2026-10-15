# THE DECEIVER — Bir Jade Vakası

*The Mentalist* havasında, Stardew Valley tarzı 2D piksel grafikli bir dedektif oyunu.
Sen **Jade**’sin: sarı kıvırcık saçlı, üç parçalı takım elbiseli, çayına düşkün ve insanları
bir bakışta “okuyan” bir polis danışmanı. Sunset Koyu’ndaki SSB Karakolu’na her gün **yepyeni,
rastgele üretilmiş** bir cinayet dosyası gelir. Görevin: olay yerine git, ipuçlarını topla,
şüphelileri sorgula, mini görevleri çöz ve katili **kanıtla** bul. Bu arada kasabanın altında yozlaşmış bir ağ
çalışıyor ve biri seni katil gibi göstermeye uğraşıyor.

## Nasıl çalıştırılır?

**Windows:** `TheDeceiver.zip`’i çıkar ve `TheDeceiver` klasöründeki `TheDeceiver.exe`’yi çalıştır. Oyun kendi
motoruyla (gömülü Chromium / Electron) kendi penceresinde açılır; Edge ya da başka bir tarayıcı kullanmaz,
internet gerekmez. F11 tam ekran, menüde “Oyundan Çık”. Kayıtlar `%LOCALAPPDATA%\TheDeceiver` klasöründe durur.
Paketi kendin üretmek için: `desktop/build.sh` (curl, unzip, zip, Node/npx ve `go-winres` gerekir).

**Tarayıcı:** Kurulum yok, derleme yok. `index.html` dosyasını tarayıcıda açman yeterli.

İstersen yerel bir sunucuyla da açabilirsin:

```bash
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000
```

İlerleme otomatik kaydedilir; ana menüde **Kayıtlı Oyun → Devam Et** ile kaldığın yerden sürersin.

## Kontroller

| Tuş | Ne yapar |
| --- | --- |
| WASD / Ok tuşları | Yürü (Shift ile koş) • Arabadayken sür (Shift ile gaz) |
| E / Boşluk / Enter | Konuş, incele, kullan, arabaya bin/in, diyaloğu ilerlet |
| Q | **Gözlem modu**: odak harcar, olay yerindeki gizli ipuçlarını gösterir |
| F / Tab | Dava dosyası (Dava, Şüpheliler, Deliller, Görevler, Notlar, Harita, Kariyer) |
| 1–9 | Diyalog seçeneği seç |
| P | **Telefon**: harita ve yol tarifi, mesajlar, rehber |
| Esc | Duraklat menüsü (kaydet, ayarlar, ana menü) |
| M | Ses aç/kapat |

Dokunmatik ekranlarda sol altta joystick, sağ altta **E / Q / F / P** düğmeleri çıkar.

## Oynanış

### Ana menü ve zorluk
**Yeni Oyun / Kayıtlı Oyun / Ayarlar / Bizi Takip Et.** Yeni oyunda dört zorluk var:

| Zorluk | Özet |
| --- | --- |
| **Kolay** | Saat yavaş akar, odak ucuz, davalara 4 gün, seri katil 3 gecede bir öldürür, Bea’nın tuzakları zayıf |
| **Orta** | Dengeli oyun: 3 gün süre, seri katil 2 gecede bir sonra her gece, görev ipuçları açık |
| **Zor** | Saat hızlı, odak pahalı, davalara 2 gün, Bea’nın tuzakları güçlü |
| **The Deceiver** | Hiç görev ipucu yok, tüm izler gizli (Gözlem şart), seri katil her gece öldürür, 3. tutuklanmada oyun biter |

Ayarlarda ses seviyesi, yazı hızı ve tam ekran bulunur.

### Trafik, araba ve telefon
- Sokaklarda sağdan akan trafik var: siviller, taksiler, kamyonetler, **devriye arabaları** (gece tepe lambaları yanar).
  Karakolun önünde ve açık olay yerlerinde polis arabaları park hâlindedir.
- **Jade’in Citroën’i** karakolun önünde durur. Yanına gidip **E** ile bin, kendin sür ya da **Otomatik git** ile
  seçtiğin yere zaman atlayarak ulaş. Arabalara çarpmamaya dikkat.
- **Telefon (P)**: şehir haritası, işaretlediğin hedefe **yön oku ve mesafe** (ekranın üstünde), Lena’dan ve
  ağdan gelen mesajlar, rehber. Dava dosyasındaki görevlerin yanındaki 📍 ile hedefi tek tıkla işaretlersin.

### Şehir ve insanlar
- **128x96 karoluk Sunset Koyu**: şehir merkezi, SSB Karakolu, FBI Saha Ofisi, Belediye, banka, kütüphane, kilise,
  okul, gazete, restoran, bakkal, balık hali, otel, bar, galeri, malikâne, bağ evi, liman, deniz feneri, park ve eski mezarlık.
- **150’den fazla kasabalı** (aileler, komşular, iş arkadaşları, arkadaşlar, düşmanlar). Herkesin evi, işi ve saatlik
  programı var: sabah işte, öğlen kafede/parkta, akşam barda ya da evde. Gece-gündüz döngüsü, yağmur, kuşlar, ateş böcekleri.
- Herkesle konuşabilirsin. **“Onu oku”** (Gözlem) ile kişinin elini, sigarasını ve kokusunu öğrenirsin; Grace’in
  **geçmiş taraması** ayakkabı numarasını ve aracını, **nüfus veritabanı** cinsiyet/saç/ayakkabı/araçla arama yapar.

### Davalar
- **Sıradan cinayetler**: her seferinde başka bir kurban ve onun çevresinden 4 şüpheli. Olay yerinde izler
  (ayak izi, saç teli, izmarit, koku), **cesedin ceplerinde eşyalar** (telefon kaydı, makbuz, şifreli not; bazıları
  astarın içinde gizli), otopside ölüm nedeni ve saat hesabı, mazeret kontrolü, parmak izi, şifre ve kasa bulmacaları.
- **Seri katil**: yakalanana kadar iki gecede bir öldürür. Her ceset yeni bir iz bırakır, tanıklar bir siluet görür;
  ölü sayısı arttıkça katile yaklaşırsın. Altı kurbandan sonra kasabadan kaçar.
- **Gizli odalar**: bazı evlerde kitaplık ya da gardırop arkasında gizli oda var (Gözlem açıkken parıldar).
  Katillerin ve ağ üyelerinin odaları kesin delil içerir; bazıları ise sadece zararsız sırlardır.

### Lion Lion ve Yellow Bea
- **Aslan Ağı**: yozlaşmış bir CIA-FBI yapılanması. Kimse kimseyi tanımaz; her üye emri yalnızca bir üstünden alır
  (saha ajanları → aracılar → Yellow Bea → Aslan). Parolaları **“Lion Lion”**. Bir ceset bulduğunda ağın kendi
  şifreli yazışmalarını ara sahnelerde görürsün.
- Ajanın telefonundan çıkan mesajla **ölü noktayı** gözetle, gelen kişiyi Gözlem ile incele ve kim olduğunu bul.
  İnsanlara “Lion Lion” diye fısıldayıp tepkilerini ölçebilirsin ama bu ağın alarmını artırır.
- **Yellow Bea** ağın sağ koludur ve seni katil göstermeye çalışır: tuzak cinayetlerde senin fincanın, kartvizitin,
  arabanı gören “tanıklar”... **Şüphe göstergen** 100 olursa tutuklanırsın (Bea arada başarılı olur!).
  Kurtulmak için: o saatte seni gören birini bul (geceyi kalabalık yerlerde geçirmek işe yarar), sahte delili
  delil panosunda çürüt ya da tuzağı kuran ajanı yakala. Bea’nın izlerini topla, gizli odasını bul ve onu ifşa et.
- **Final**: Bea’nın telefonuyla Aslan’ı gece yarısı deniz fenerine çağır ve doğru hamlelerle maskesini düşür.

Doğru suçlamalar para, itibar, unvan ve daha fazla maksimum odak kazandırır. Yanlış suçlamaların bedeli ağırdır.

## Dosya yapısı

```
index.html        Sayfa iskeleti, HUD, diyalog ve dokunmatik kontroller
css/style.css     Parşömen / ahşap arayüz teması
js/util.js        Tohumlu rastgele sayı üreteci, zaman ve DOM yardımcıları
js/data.js        Tüm metinler: mekânlar, meslekler, motifler, isimler, Lion Lion yazışmaları, tuzaklar
js/art.js         Kodla çizilen piksel sanatı: 16x32 karakterler, binalar, sokak eşyaları, mobilyalar
js/world.js       128x96 şehir haritası, iş yerleri, evler, iç mekânlar ve gizli odalar
js/pop.js         150+ kasabalı: aileler, ilişkiler, görünüş, özellikler, saatlik programlar
js/cases.js       Olay yerleri, cesetteki eşyalar, sıradan dava / seri katil / tuzak cinayeti üreticileri
js/story.js       Hikâye yönetmeni: bölümler, Lion Lion ağı, ölü noktalar, Yellow Bea, final
js/ui.js          Diyalog kutusu, seçimler, bildirimler, pencereler, şifreli hat ara sahneleri, ses
js/minigames.js   Ceset arama, parmak izi, şifre, kasa, veritabanı, kişi seçici, sahte delil analizi
js/dossier.js     Dava dosyası sekmeleri (Seri Katil, Lion Lion, Kişiler dahil)
js/talk.js        Tüm konuşmalar, sorgular, suçlamalar ve görev listesi
js/traffic.js     Araç trafiği, park eden polis arabaları, Jade'in arabasını sürme
js/menu.js        Ana menü, zorluk seviyeleri, ayarlar, duraklat menüsü, oyun sonu
js/game.js        Oyun döngüsü, kamera, ışıklandırma, NPC simülasyonu, gün geçişi
js/phone.js       Telefon: harita/GPS, yön oku, mesajlar, rehber
assets/           Logo, simge ve Pixelify Sans yazı tipi (OFL)
desktop/          Windows uygulaması (Electron): pencere, tam ekran, çıkış ve paketleme betiği
```

Harici kütüphane yok; oyun tamamen çevrimdışı çalışır. “Pixelify Sans” yazı tipi `assets/fonts` içinde
SIL Open Font License ile birlikte gelir.
