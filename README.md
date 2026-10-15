# THE DECEIVER — Bir Jade Vakası

*The Mentalist* havasında, Stardew Valley tarzı 2D piksel grafikli bir dedektif oyunu.
Sen **Jade**’sin: sarı kıvırcık saçlı, üç parçalı takım elbiseli, çayına düşkün ve insanları
bir bakışta “okuyan” bir polis danışmanı. Sunset Koyu’ndaki SSB Karakolu’na her gün **yepyeni,
rastgele üretilmiş** bir cinayet dosyası gelir. Görevin: olay yerine git, ipuçlarını topla,
şüphelileri sorgula, mini görevleri çöz ve katili **kanıtla** bul. Bu arada kasabanın altında yozlaşmış bir ağ
çalışıyor ve biri seni katil gibi göstermeye uğraşıyor.

## Nasıl çalıştırılır?

Kurulum yok, derleme yok. `index.html` dosyasını tarayıcıda açman yeterli.

İstersen yerel bir sunucuyla da açabilirsin:

```bash
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000
```

İlerleme tarayıcının `localStorage` alanına otomatik kaydedilir (“Devam Et”).

## Kontroller

| Tuş | Ne yapar |
| --- | --- |
| WASD / Ok tuşları | Yürü (Shift ile koş) |
| E / Boşluk / Enter | Konuş, incele, kullan, diyaloğu ilerlet |
| Q | **Gözlem modu**: odak harcar, olay yerindeki gizli ipuçlarını gösterir |
| F / Tab | Dava dosyası (Dava, Şüpheliler, Deliller, Görevler, Notlar, Harita, Kariyer) |
| 1–9 | Diyalog seçeneği seç |
| M | Ses aç/kapat |

Dokunmatik ekranlarda sol altta joystick, sağ altta **E / Q / F** düğmeleri çıkar.

## Oynanış

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
js/game.js        Oyun döngüsü, kamera, ışıklandırma, NPC simülasyonu, gün geçişi
```

Harici kütüphane yok; tek dış kaynak Google Fonts’tan “Pixelify Sans” yazı tipi (çevrimdışıyken yerine
sistem yazı tipi kullanılır).
